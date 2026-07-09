import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteReservation,
  getMyReservations,
  getReservationById,
  getReservationMessages,
  getReservationPaymentStatus,
  initiateReservationPayment,
  sendReservationMessage,
  updateReservation,
} from "../services/api";
import { ENDPOINTS } from "../config/api.config";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";
import {
  buildRequestKey,
  createInFlightDeduper,
} from "../utils/requestHelpers";

const STATUS_LABELS = {
  requested: "Solicitada",
  contacted: "Contactada",
  awaiting_payment: "Esperando pago",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const STATUS_COLORS = {
  requested: "#0E7490",
  contacted: "#2563EB",
  awaiting_payment: "#D97706",
  confirmed: "#059669",
  rejected: "#DC2626",
  cancelled: "#64748B",
};

const CONTACT_LABELS = {
  EMAIL: "Correo electrónico",
  PHONE: "Llamada telefónica",
  WHATSAPP: "WhatsApp",
  IN_APP: "Aplicación",
};

const PAYMENT_STATUS_LABELS = {
  pending: "Pendiente",
  checkout_created: "Pago iniciado",
  processing: "Validando pago",
  paid: "Pagado",
  failed: "Fallido",
  expired: "Pago expirado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  verified_by_agency: "Pago verificado por agencia",
};

const PAYMENT_PROVIDER_LABELS = {
  agency_managed: "Gestionado por la agencia",
  wompi: "Wompi",
};

const FINAL_STATUSES = ["confirmed", "rejected", "cancelled"];
const EDIT_WINDOW_MS = 2 * 60 * 1000;
const PAYABLE_STATUSES = ["awaiting_payment"];
const PAYABLE_PAYMENT_STATUSES = [
  "pending",
  "checkout_created",
  "failed",
  "expired",
];

const extractItems = (payload) => {
  const data = payload?.data?.data ?? payload?.data ?? payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const orderChatMessages = (messages = []) => {
  const ordered = [];
  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    const next = messages[index + 1];
    if (current?.senderType === "SYSTEM" && next?.senderType === "AGENCY") {
      ordered.push(next, current);
      index += 1;
    } else {
      ordered.push(current);
    }
  }
  return ordered;
};

const extractReservation = (payload) =>
  payload?.data?.data ?? payload?.data ?? payload ?? null;

const canEditReservation = (reservation) => {
  if (!reservation?.createdAt || reservation?.status !== "requested") {
    return false;
  }

  const createdTime = new Date(reservation.createdAt).getTime();

  return Number.isFinite(createdTime) && Date.now() - createdTime <= EDIT_WINDOW_MS;
};

const buildEditForm = (reservation) => ({
  startDate: reservation?.startDate || "",
  endDate: reservation?.endDate || "",
  travelers: String(reservation?.travelers || "1"),
  customerPhone: reservation?.customerPhone || "",
  contactPreference: reservation?.contactPreference || "EMAIL",
  message: reservation?.message || "",
});

const formatCurrency = (value, currency = "COP") => {
  if (value == null || Number.isNaN(Number(value))) {
    return "$ 0";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
};

const getPaymentErrorMessage = (error) => {
  const backendMessage = error?.response?.data?.message;

  if (error?.response?.status === 401) {
    return "Tu sesión venció o no es válida. Inicia sesión nuevamente.";
  }

  if (error?.response?.status === 404) {
    return "No encontramos esta reserva con tu usuario.";
  }

  if (error?.response?.status === 409) {
    if (backendMessage) {
      return backendMessage;
    }

    return "La reserva aún no está habilitada para pago o Wompi no está activo en el backend.";
  }

  return (
    backendMessage ||
    "No pudimos iniciar el pago. Intenta nuevamente cuando la agencia habilite el proceso."
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>

    <Text style={styles.detailValue}>
      {value === 0 ? "0" : value || "-"}
    </Text>
  </View>
);

const ReservationCard = ({ item, onPress }) => {
  const statusColor =
    STATUS_COLORS[item.status] || COLORS.primary;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!item.id}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <FontAwesome
            name="suitcase"
            size={18}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {item.packageTitle || "Paquete turístico"}
          </Text>

          <Text style={styles.meta}>
            {formatDate(item.startDate)}
            {item.endDate
              ? ` - ${formatDate(item.endDate)}`
              : ""}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: `${statusColor}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: statusColor,
              },
            ]}
          >
            {STATUS_LABELS[item.status] ||
              item.status ||
              "Estado"}
          </Text>
        </View>
      </View>

      <DetailRow
        label="Viajeros"
        value={String(item.travelers ?? "-")}
      />

      <DetailRow
        label="Total referencia"
        value={formatCurrency(
          item.totalAmount,
          item.currency || "COP",
        )}
      />

      <DetailRow
        label="Contacto"
        value={
          CONTACT_LABELS[item.contactPreference] ||
          item.contactPreference
        }
      />

      <View style={styles.openDetail}>
        <Text style={styles.openDetailText}>
          Ver detalle
        </Text>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={COLORS.primary}
        />
      </View>
    </TouchableOpacity>
  );
};

const MyReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editForm, setEditForm] = useState(buildEditForm(null));
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingReservation, setDeletingReservation] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const requestDeduper = useMemo(() => createInFlightDeduper(), []);
  const selectedReservationRef = useRef(null);
  const listRequestSeqRef = useRef(0);
  const detailRequestSeqRef = useRef(0);
  const messagesRequestSeqRef = useRef(0);

  useEffect(() => {
    selectedReservationRef.current = selectedReservation;
  }, [selectedReservation]);

  const upsertReservation = useCallback((reservation) => {
    if (!reservation?.id) return;

    setReservations((prev) =>
      prev.map((item) =>
        String(item.id) === String(reservation.id)
          ? { ...item, ...reservation }
          : item,
      ),
    );
  }, []);

  const removeReservationFromList = useCallback((reservationId) => {
    setReservations((prev) =>
      prev.filter((item) => String(item.id) !== String(reservationId)),
    );
  }, []);

  const getReservationsListKey = useCallback(() =>
    buildRequestKey({
      endpoint: ENDPOINTS.RESERVATIONS_ME,
      params: { page: 0, size: 20 },
    }), []);

  const getReservationDetailKey = useCallback((reservationId) =>
    buildRequestKey({
      endpoint: ENDPOINTS.RESERVATION_DETAIL(reservationId),
      scope: { screen: "MyReservations" },
    }), []);

  const getReservationMessagesKey = useCallback((reservationId) =>
    buildRequestKey({
      endpoint: ENDPOINTS.RESERVATION_MESSAGES(reservationId),
      params: { page: 0, size: 50 },
      scope: { screen: "MyReservations" },
    }), []);

  const fetchReservationDetail = useCallback((reservationId) =>
    requestDeduper.run(
      getReservationDetailKey(reservationId),
      () => getReservationById(reservationId),
    ), [getReservationDetailKey, requestDeduper]);

  const loadReservations = useCallback(async () => {
    const requestSeq = listRequestSeqRef.current + 1;
    listRequestSeqRef.current = requestSeq;
    setError("");

    try {
      const params = {
        page: 0,
        size: 20,
      };
      const requestKey = getReservationsListKey();
      const response = await requestDeduper.run(requestKey, () =>
        getMyReservations(params),
      );

      if (requestSeq === listRequestSeqRef.current) {
        setReservations(extractItems(response));
      }
    } catch (err) {
      if (requestSeq === listRequestSeqRef.current) {
        setError(
          err?.response?.data?.message ||
            "No pudimos cargar tus reservas.",
        );
      }
    }
  }, [getReservationsListKey, requestDeduper]);

  const refresh = useCallback(async () => {
    if (refreshing || loading) return;

    setRefreshing(true);

    try {
      await loadReservations();
    } finally {
      setRefreshing(false);
    }
  }, [loadReservations, loading, refreshing]);

  useEffect(() => {
    setLoading(true);

    loadReservations().finally(() => {
      setLoading(false);
    });
  }, [loadReservations]);

  const openReservationDetail = useCallback(async (item) => {
    if (!item?.id) return;
    if (
      detailLoading &&
      String(selectedReservationRef.current?.id) === String(item.id)
    ) {
      return;
    }

    const requestSeq = detailRequestSeqRef.current + 1;
    detailRequestSeqRef.current = requestSeq;
    const previousReservationId = selectedReservationRef.current?.id;
    const openingSameReservation =
      String(previousReservationId) === String(item.id);
    setModalVisible(true);
    selectedReservationRef.current = item;
    setSelectedReservation(item);
    setEditForm(buildEditForm(item));
    if (!openingSameReservation) {
      setMessages([]);
    }
    setMessageText("");
    setDetailLoading(true);
    setDetailError("");
    setMessagesError("");

    try {
      const response = await fetchReservationDetail(item.id);
      const reservation = extractReservation(response) || item;

      if (requestSeq === detailRequestSeqRef.current) {
        selectedReservationRef.current = reservation;
        setSelectedReservation(reservation);
        setEditForm(buildEditForm(reservation));
        upsertReservation(reservation);
      }
    } catch (err) {
      if (requestSeq === detailRequestSeqRef.current) {
        setDetailError(
          err?.response?.data?.message ||
            "No pudimos cargar el detalle de la reserva.",
        );
      }
    } finally {
      if (requestSeq === detailRequestSeqRef.current) {
        setDetailLoading(false);
      }
    }
  }, [detailLoading, fetchReservationDetail, upsertReservation]);

  const loadMessages = useCallback(async (reservationId) => {
    if (!reservationId) return;

    const requestSeq = messagesRequestSeqRef.current + 1;
    messagesRequestSeqRef.current = requestSeq;
    setMessagesLoading(true);
    setMessagesError("");

    try {
      const params = {
        page: 0,
        size: 50,
      };
      const requestKey = getReservationMessagesKey(reservationId);
      const response = await requestDeduper.run(requestKey, () =>
        getReservationMessages(reservationId, params),
      );

      if (
        requestSeq === messagesRequestSeqRef.current &&
        String(selectedReservationRef.current?.id) === String(reservationId)
      ) {
        setMessages(orderChatMessages(extractItems(response)));
      }
    } catch (_err) {
      // Conserva los mensajes visibles; el siguiente refresh reconcilia.
      if (
        requestSeq === messagesRequestSeqRef.current &&
        String(selectedReservationRef.current?.id) === String(reservationId)
      ) {
        setMessagesError("No pudimos cargar los mensajes de esta reserva.");
      }
    } finally {
      if (requestSeq === messagesRequestSeqRef.current) {
        setMessagesLoading(false);
      }
    }
  }, [getReservationMessagesKey, requestDeduper]);

  useEffect(() => {
    if (!modalVisible || detailLoading || detailError || !selectedReservation?.id) {
      return;
    }

    loadMessages(selectedReservation.id);
  }, [
    detailError,
    detailLoading,
    loadMessages,
    modalVisible,
    selectedReservation?.id,
  ]);

  const closeModal = () => {
    detailRequestSeqRef.current += 1;
    messagesRequestSeqRef.current += 1;
    setModalVisible(false);
    selectedReservationRef.current = null;
    setSelectedReservation(null);
    setDetailError("");
    setDetailLoading(false);
    setMessages([]);
    setMessagesLoading(false);
    setMessagesError("");
    setMessageText("");
    setEditForm(buildEditForm(null));
    setPaymentLoading(false);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveReservationEdit = async () => {
    if (!selectedReservation?.id || !canEditReservation(selectedReservation)) return;

    const travelers = Number(editForm.travelers);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(editForm.startDate || "")) {
      Alert.alert("Fecha invalida", "Usa el formato AAAA-MM-DD para la fecha de inicio.");
      return;
    }

    if (editForm.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(editForm.endDate)) {
      Alert.alert("Fecha invalida", "Usa el formato AAAA-MM-DD para la fecha final.");
      return;
    }

    if (!Number.isInteger(travelers) || travelers < 1) {
      Alert.alert("Viajeros invalidos", "Ingresa al menos 1 viajero.");
      return;
    }

    const payload = {
      startDate: editForm.startDate,
      travelers,
      contactPreference: editForm.contactPreference,
      message: editForm.message?.trim() || "",
    };

    if (editForm.endDate) payload.endDate = editForm.endDate;
    if (editForm.customerPhone?.trim()) payload.customerPhone = editForm.customerPhone.trim();

    setSavingEdit(true);

    try {
      const response = await updateReservation(selectedReservation.id, payload);
      const reservation =
        extractReservation(response) || { ...selectedReservation, ...payload };

      setSelectedReservation(reservation);
      selectedReservationRef.current = reservation;
      setEditForm(buildEditForm(reservation));
      requestDeduper.clear(getReservationsListKey());
      requestDeduper.clear(getReservationDetailKey(selectedReservation.id));
      listRequestSeqRef.current += 1;
      upsertReservation(reservation);
      Alert.alert("Reserva actualizada", "Tu solicitud fue actualizada correctamente.");
    } catch (err) {
      Alert.alert(
        "No se pudo actualizar",
        err?.response?.status === 409
          ? "La ventana de edicion ya termino."
          : err?.response?.data?.message || "Intenta nuevamente.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteReservation = () => {
    if (!selectedReservation?.id || !canEditReservation(selectedReservation)) return;

    Alert.alert(
      "Eliminar solicitud",
      "Solo puedes eliminarla durante los primeros 2 minutos. Esta accion no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeletingReservation(true);

            try {
              await deleteReservation(selectedReservation.id);
              requestDeduper.clear(getReservationsListKey());
              requestDeduper.clear(getReservationDetailKey(selectedReservation.id));
              requestDeduper.clear(getReservationMessagesKey(selectedReservation.id));
              listRequestSeqRef.current += 1;
              removeReservationFromList(selectedReservation.id);
              closeModal();
            } catch (err) {
              Alert.alert(
                "No se pudo eliminar",
                err?.response?.status === 409
                  ? "La ventana para eliminar ya termino."
                  : err?.response?.data?.message || "Intenta nuevamente.",
              );
            } finally {
              setDeletingReservation(false);
            }
          },
        },
      ],
    );
  };

  const submitMessage = async () => {
    const text = messageText.trim();

    if (!selectedReservation?.id || !text || FINAL_STATUSES.includes(selectedReservation.status)) {
      return;
    }

    setSendingMessage(true);

    try {
      await sendReservationMessage(selectedReservation.id, text);
      requestDeduper.clear(getReservationMessagesKey(selectedReservation.id));
      setMessageText("");
      await loadMessages(selectedReservation.id);
    } catch (err) {
      Alert.alert(
        "No se pudo enviar",
        err?.response?.status === 409
          ? "El chat ya esta cerrado para esta solicitud."
          : err?.response?.data?.message || "Intenta nuevamente.",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const startReservationPayment = async () => {
    if (!canPayReservation || paymentLoading) return;

    setPaymentLoading(true);

    try {
      const response = await initiateReservationPayment(selectedReservation.id, {
        provider: "wompi",
      });
      const data = response.data?.data || response.data || {};
      const checkoutUrl =
        data.checkoutUrl ||
        data.paymentUrl ||
        data.url ||
        data.redirectUrl;

      if (checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
        const paymentStatusKey = buildRequestKey({
          endpoint: ENDPOINTS.RESERVATION_PAYMENT_STATUS(selectedReservation.id),
          scope: { screen: "MyReservations" },
        });
        requestDeduper.clear(getReservationsListKey());
        requestDeduper.clear(getReservationDetailKey(selectedReservation.id));
        requestDeduper.clear(paymentStatusKey);
        const [statusResult, detailResult] = await Promise.allSettled([
          requestDeduper.run(paymentStatusKey, () =>
            getReservationPaymentStatus(selectedReservation.id),
          ),
          fetchReservationDetail(selectedReservation.id),
        ]);
        if (detailResult.status === "fulfilled") {
          const reservation = extractReservation(detailResult.value);
          if (reservation) {
            selectedReservationRef.current = reservation;
            setSelectedReservation(reservation);
            listRequestSeqRef.current += 1;
            upsertReservation(reservation);
          }
        } else if (statusResult.status === "fulfilled") {
          const statusData = statusResult.value?.data?.data || statusResult.value?.data;
          const currentReservation = selectedReservationRef.current;
          const reservation = currentReservation
            ? {
                ...currentReservation,
                status: statusData?.reservationStatus || currentReservation.status,
                paymentProvider:
                  statusData?.paymentProvider || currentReservation.paymentProvider,
                paymentStatus:
                  statusData?.paymentStatus || currentReservation.paymentStatus,
                paymentId:
                  statusData?.providerTransactionId || currentReservation.paymentId,
                paidAt: statusData?.paidAt || currentReservation.paidAt,
              }
            : currentReservation;

          if (reservation) {
            selectedReservationRef.current = reservation;
            setSelectedReservation(reservation);
            listRequestSeqRef.current += 1;
            upsertReservation(reservation);
          }
        }
        return;
      }

      Alert.alert(
        "Pasarela en preparación",
        "La solicitud quedó lista para pago, pero el backend aún no entregó una URL de checkout.",
      );
    } catch (err) {
      Alert.alert(
        "Pago no disponible",
        getPaymentErrorMessage(err),
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const statusColor =
    STATUS_COLORS[selectedReservation?.status] ||
    COLORS.primary;

  const paymentStatus =
    PAYMENT_STATUS_LABELS[
      selectedReservation?.paymentStatus
    ] ||
    selectedReservation?.paymentStatus ||
    "Pendiente";

  const paymentStatusColor =
    selectedReservation?.paymentStatus === "paid"
      ? "#059669"
      : selectedReservation?.paymentStatus === "failed"
        ? "#DC2626"
        : "#D97706";

  const editable = canEditReservation(selectedReservation);
  const chatClosed = FINAL_STATUSES.includes(selectedReservation?.status);
  const normalizedPaymentStatus =
    selectedReservation?.paymentStatus || "pending";
  const canPayReservation =
    selectedReservation?.id &&
    PAYABLE_STATUSES.includes(selectedReservation?.status) &&
    PAYABLE_PAYMENT_STATUSES.includes(normalizedPaymentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            Mis reservas
          </Text>

          <Text style={styles.headerSubtitle}>
            Solicitudes gestionadas por agencia
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Cargando reservas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item, index) =>
            String(item.id || index)
          }
          renderItem={({ item }) => (
            <ReservationCard
              item={item}
              onPress={() =>
                openReservationDetail(item)
              }
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            reservations.length === 0 &&
              styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            error && reservations.length > 0 ? (
              <TouchableOpacity
                style={styles.inlineErrorBanner}
                onPress={refresh}
                disabled={refreshing}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#F97316" />
                <Text style={styles.inlineErrorText}>{error}</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome
                name="calendar-o"
                size={40}
                color="#CBD5E1"
              />

              <Text style={styles.emptyTitle}>
                {error || "Aún no tienes reservas."}
              </Text>

              <Text style={styles.emptyText}>
                {error
                  ? "Conservamos cualquier información previa disponible. Intenta cargar de nuevo."
                  : "Cuando solicites un paquete, aparecerá aquí."}
              </Text>
              {error ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={refresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.retryButtonText}>Volver a cargar</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  Detalle de reserva
                </Text>

                <Text
                  style={styles.modalSubtitle}
                  numberOfLines={1}
                >
                  {selectedReservation?.packageTitle ||
                    "Paquete turístico"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                />

                <Text style={styles.loadingText}>
                  Cargando detalle...
                </Text>
              </View>
            ) : detailError ? (
              <View style={styles.modalLoading}>
                <View style={styles.errorIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={30}
                    color="#DC2626"
                  />
                </View>

                <Text style={styles.errorTitle}>
                  No se pudo cargar
                </Text>

                <Text style={styles.errorText}>
                  {detailError}
                </Text>
                {selectedReservation?.id ? (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => openReservationDetail(selectedReservation)}
                    disabled={detailLoading}
                  >
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <View style={styles.modalHero}>
                  <View style={styles.modalHeroTop}>
                    <View style={styles.modalPackageIcon}>
                      <FontAwesome
                        name="suitcase"
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.modalHeroInfo}>
                      <Text
                        style={styles.modalPackageTitle}
                        numberOfLines={2}
                      >
                        {selectedReservation?.packageTitle ||
                          "Paquete turístico"}
                      </Text>

                      <Text style={styles.modalCreatedText}>
                        Solicitud de reserva
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            `${statusColor}18`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: statusColor,
                          },
                        ]}
                      >
                        {STATUS_LABELS[
                          selectedReservation?.status
                        ] ||
                          selectedReservation?.status ||
                          "Estado"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalTotalBox}>
                    <Text style={styles.modalTotalLabel}>
                      Total de referencia
                    </Text>

                    <Text style={styles.modalTotalValue}>
                      {formatCurrency(
                        selectedReservation?.totalAmount,
                        selectedReservation?.currency ||
                          "COP",
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={COLORS.primary}
                    />

                    <Text style={styles.modalStatLabel}>
                      Inicio
                    </Text>

                    <Text style={styles.modalStatValue}>
                      {formatDate(
                        selectedReservation?.startDate,
                      )}
                    </Text>
                  </View>

                  <View style={styles.modalStatDivider} />

                  <View style={styles.modalStatItem}>
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color={COLORS.primary}
                    />

                    <Text style={styles.modalStatLabel}>
                      Finalización
                    </Text>

                    <Text style={styles.modalStatValue}>
                      {formatDate(
                        selectedReservation?.endDate,
                      )}
                    </Text>
                  </View>

                  <View style={styles.modalStatDivider} />

                  <View style={styles.modalStatItem}>
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={COLORS.primary}
                    />

                    <Text style={styles.modalStatLabel}>
                      Viajeros
                    </Text>

                    <Text style={styles.modalStatValue}>
                      {selectedReservation?.travelers ??
                        "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Información de contacto
                  </Text>

                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoIcon}>
                      <Ionicons
                        name="mail-outline"
                        size={17}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.modalInfoContent}>
                      <Text style={styles.modalInfoLabel}>
                        Correo electrónico
                      </Text>

                      <Text
                        style={styles.modalInfoValue}
                        selectable
                      >
                        {selectedReservation?.customerEmail ||
                          "-"}
                      </Text>
                    </View>
                  </View>

                  {selectedReservation?.customerPhone ? (
                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoIcon}>
                        <Ionicons
                          name="call-outline"
                          size={17}
                          color={COLORS.primary}
                        />
                      </View>

                      <View
                        style={styles.modalInfoContent}
                      >
                        <Text
                          style={styles.modalInfoLabel}
                        >
                          Teléfono
                        </Text>

                        <Text
                          style={styles.modalInfoValue}
                          selectable
                        >
                          {
                            selectedReservation.customerPhone
                          }
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoIcon}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={16}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.modalInfoContent}>
                      <Text style={styles.modalInfoLabel}>
                        Medio de contacto preferido
                      </Text>

                      <Text style={styles.modalInfoValue}>
                        {CONTACT_LABELS[
                          selectedReservation?.contactPreference
                        ] ||
                          selectedReservation?.contactPreference ||
                          "-"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Información del pago
                  </Text>

                  <View style={styles.modalPaymentRow}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.modalInfoLabel}>
                        Estado del pago
                      </Text>

                      <Text
                        style={styles.modalPaymentValue}
                      >
                        {paymentStatus}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.paymentStatusBadge,
                        {
                          backgroundColor:
                            `${paymentStatusColor}14`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedReservation?.paymentStatus ===
                          "paid"
                            ? "checkmark-circle-outline"
                            : "time-outline"
                        }
                        size={15}
                        color={paymentStatusColor}
                      />

                      <Text
                        style={[
                          styles.paymentStatusText,
                          {
                            color: paymentStatusColor,
                          },
                        ]}
                      >
                        {paymentStatus}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSeparator} />

                  <Text style={styles.modalInfoLabel}>
                    Gestión del pago
                  </Text>

                  <Text style={styles.modalInfoValue}>
                    {PAYMENT_PROVIDER_LABELS[
                      selectedReservation?.paymentProvider
                    ] ||
                      selectedReservation?.paymentProvider ||
                      "-"}
                  </Text>

                  {canPayReservation ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.directPaymentButton,
                          paymentLoading && styles.disabledAction,
                        ]}
                        onPress={startReservationPayment}
                        disabled={paymentLoading}
                        activeOpacity={0.88}
                      >
                        {paymentLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons
                              name="card-outline"
                              size={17}
                              color="#FFFFFF"
                            />
                            <Text style={styles.directPaymentButtonText}>
                              Pagar con Wompi
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <Text style={styles.paymentHintText}>
                        Se abrirá el checkout seguro enviado por la pasarela.
                      </Text>
                    </>
                  ) : null}
                </View>

                {selectedReservation?.message ? (
                  <View style={styles.modalSection}>
                    <Text
                      style={styles.modalSectionTitle}
                    >
                      Mensaje enviado
                    </Text>

                    <View style={styles.messageBox}>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={COLORS.primary}
                      />

                      <Text style={styles.messageText}>
                        {selectedReservation.message}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {editable ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      Editar solicitud
                    </Text>

                    <View style={styles.editGrid}>
                      <View style={styles.editField}>
                        <Text style={styles.modalInfoLabel}>
                          Inicio
                        </Text>

                        <TextInput
                          style={styles.editInput}
                          value={editForm.startDate}
                          placeholder="2026-07-20"
                          onChangeText={(text) =>
                            handleEditChange("startDate", text)
                          }
                        />
                      </View>

                      <View style={styles.editField}>
                        <Text style={styles.modalInfoLabel}>
                          Final opcional
                        </Text>

                        <TextInput
                          style={styles.editInput}
                          value={editForm.endDate}
                          placeholder="2026-07-22"
                          onChangeText={(text) =>
                            handleEditChange("endDate", text)
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.editGrid}>
                      <View style={styles.editFieldSmall}>
                        <Text style={styles.modalInfoLabel}>
                          Viajeros
                        </Text>

                        <TextInput
                          style={styles.editInput}
                          value={editForm.travelers}
                          keyboardType="number-pad"
                          onChangeText={(text) =>
                            handleEditChange(
                              "travelers",
                              text.replace(/[^0-9]/g, ""),
                            )
                          }
                        />
                      </View>

                      <View style={styles.editField}>
                        <Text style={styles.modalInfoLabel}>
                          Teléfono
                        </Text>

                        <TextInput
                          style={styles.editInput}
                          value={editForm.customerPhone}
                          keyboardType="phone-pad"
                          placeholder="3000000000"
                          onChangeText={(text) =>
                            handleEditChange("customerPhone", text)
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.contactToggleRow}>
                      {["EMAIL", "IN_APP"].map((option) => {
                        const active =
                          editForm.contactPreference === option;

                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.contactToggle,
                              active && styles.contactToggleActive,
                            ]}
                            onPress={() =>
                              handleEditChange(
                                "contactPreference",
                                option,
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.contactToggleText,
                                active &&
                                  styles.contactToggleTextActive,
                              ]}
                            >
                              {CONTACT_LABELS[option]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      style={[styles.editInput, styles.editMessageInput]}
                      value={editForm.message}
                      multiline
                      maxLength={2000}
                      placeholder="Mensaje para la agencia"
                      onChangeText={(text) =>
                        handleEditChange("message", text)
                      }
                    />

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[
                          styles.secondaryAction,
                          deletingReservation && styles.disabledAction,
                        ]}
                        onPress={confirmDeleteReservation}
                        disabled={deletingReservation || savingEdit}
                      >
                        <Text style={styles.secondaryActionText}>
                          Eliminar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.primaryAction,
                          savingEdit && styles.disabledAction,
                        ]}
                        onPress={saveReservationEdit}
                        disabled={savingEdit || deletingReservation}
                      >
                        {savingEdit ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryActionText}>
                            Guardar cambios
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Mensajería interna
                  </Text>

                  {messagesLoading && messages.length === 0 ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : messages.length === 0 ? (
                    <>
                      <Text
                        style={[
                          styles.chatEmptyText,
                          messagesError && styles.chatErrorText,
                        ]}
                      >
                        {messagesError || "Aún no hay mensajes para esta solicitud."}
                      </Text>
                      {messagesError ? (
                        <TouchableOpacity
                          style={styles.chatRetryButton}
                          onPress={() => loadMessages(selectedReservation?.id)}
                          disabled={messagesLoading}
                        >
                          <Text style={styles.chatRetryButtonText}>
                            Reintentar mensajes
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <View style={styles.chatList}>
                        {messages.map((message) => {
                          const system = message.senderType === "SYSTEM";
                          const fromCustomer =
                            message.senderType === "CUSTOMER";

                          return (
                            <View
                              key={String(message.id)}
                              style={[
                                styles.chatBubble,
                                system
                                  ? styles.chatBubbleSystem
                                  : fromCustomer
                                  ? styles.chatBubbleMine
                                  : styles.chatBubbleAgency,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chatSender,
                                  system && styles.chatSenderSystem,
                                ]}
                              >
                                {system
                                  ? "Sistema"
                                  : fromCustomer
                                  ? "Tú"
                                  : "Agencia"}
                              </Text>

                              <Text
                                style={[
                                  styles.chatMessage,
                                  system && styles.chatMessageSystem,
                                ]}
                              >
                                {message.message}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      {messagesLoading ? (
                        <ActivityIndicator color={COLORS.primary} />
                      ) : null}
                      {messagesError ? (
                        <Text style={styles.chatErrorText}>{messagesError}</Text>
                      ) : null}
                    </>
                  )}

                  {chatClosed ? (
                    <Text style={styles.chatClosedText}>
                      El chat está cerrado para esta solicitud.
                    </Text>
                  ) : (
                    <View style={styles.chatInputRow}>
                      <TextInput
                        style={styles.chatInput}
                        value={messageText}
                        multiline
                        maxLength={2000}
                        placeholder="Escribe un mensaje"
                        onChangeText={setMessageText}
                      />

                      <TouchableOpacity
                        style={[
                          styles.chatSendButton,
                          (!messageText.trim() || sendingMessage) &&
                            styles.disabledAction,
                        ]}
                        onPress={submitMessage}
                        disabled={!messageText.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Ionicons
                            name="send"
                            size={17}
                            color="#FFFFFF"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.modalIdBox}>
                  <Text style={styles.modalIdLabel}>
                    Identificador de la reserva
                  </Text>

                  <Text
                    style={styles.reservationId}
                    selectable
                  >
                    {selectedReservation?.id || "-"}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 58,
    paddingBottom: 18,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerInfo: {
    flex: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
  },

  centered: {
    flex: 1,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.textLight,
    fontWeight: "600",
  },

  listContent: {
    padding: SPACING.lg,
    paddingBottom: 36,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  cardInfo: {
    flex: 1,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },

  title: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
  },

  meta: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
  },

  badge: {
    maxWidth: 105,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 7,
  },

  detailLabel: {
    flex: 1,
    color: COLORS.textLight,
    fontWeight: "600",
  },

  detailValue: {
    flex: 1,
    color: COLORS.text,
    fontWeight: "800",
    textAlign: "right",
  },

  openDetail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  openDetailText: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  empty: {
    flex: 1,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: COLORS.textLight,
    textAlign: "center",
  },

  inlineErrorBanner: {
    marginBottom: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  inlineErrorText: {
    flex: 1,
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },

  retryButton: {
    minHeight: 42,
    marginTop: SPACING.md,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: "rgba(15,23,42,0.48)",
  },

  modalCard: {
    maxHeight: "86%",
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: COLORS.white,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  modalTitleContainer: {
    flex: 1,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
  },

  modalSubtitle: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  modalLoading: {
    minHeight: 300,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  modalContent: {
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  modalHero: {
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  modalHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  modalPackageIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },

  modalHeroInfo: {
    flex: 1,
  },

  modalPackageTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
    lineHeight: 21,
  },

  modalCreatedText: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: 11,
  },

  modalTotalBox: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  modalTotalLabel: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "600",
  },

  modalTotalValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "900",
  },

  modalStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
  },

  modalStatItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },

  modalStatDivider: {
    width: 1,
    height: 48,
    backgroundColor: "#E2E8F0",
  },

  modalStatLabel: {
    marginTop: 5,
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "600",
  },

  modalStatValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  modalSection: {
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
  },

  modalSectionTitle: {
    marginBottom: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
  },

  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  modalInfoIcon: {
    width: 34,
    height: 34,
    marginRight: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },

  modalInfoContent: {
    flex: 1,
  },

  modalInfoLabel: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "600",
  },

  modalInfoValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  modalPaymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  paymentInfo: {
    flex: 1,
  },

  modalPaymentValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  paymentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  paymentStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  directPaymentButton: {
    minHeight: 44,
    marginTop: SPACING.md,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
  },

  directPaymentButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  paymentHintText: {
    marginTop: 8,
    color: COLORS.textLight,
    fontSize: 11,
    lineHeight: 17,
  },

  modalSeparator: {
    height: 1,
    marginVertical: SPACING.md,
    backgroundColor: "#E2E8F0",
  },

  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },

  messageText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },

  modalIdBox: {
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  modalIdLabel: {
    marginBottom: 4,
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  reservationId: {
    color: COLORS.textLight,
    fontSize: 10,
    textAlign: "center",
  },

  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
  },

  errorTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
  },

  errorText: {
    color: "#DC2626",
    lineHeight: 20,
    textAlign: "center",
  },

  editGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  editField: {
    flex: 1,
  },

  editFieldSmall: {
    width: 96,
  },

  editInput: {
    minHeight: 42,
    marginTop: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
  },

  editMessageInput: {
    minHeight: 82,
    textAlignVertical: "top",
  },

  contactToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  contactToggle: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },

  contactToggleActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#ECFEFF",
  },

  contactToggleText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "800",
  },

  contactToggleTextActive: {
    color: COLORS.primary,
  },

  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  primaryAction: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },

  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  secondaryAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },

  secondaryActionText: {
    color: "#DC2626",
    fontWeight: "900",
  },

  disabledAction: {
    opacity: 0.62,
  },

  chatEmptyText: {
    color: COLORS.textLight,
    lineHeight: 20,
  },

  chatErrorText: {
    color: "#DC2626",
    fontWeight: "700",
  },

  chatRetryButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A5F3FC",
    backgroundColor: "#ECFEFF",
  },

  chatRetryButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  chatList: {
    gap: 8,
  },

  chatBubble: {
    maxWidth: "88%",
    padding: 10,
    borderRadius: 13,
  },

  chatBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#ECFEFF",
  },

  chatBubbleAgency: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
  },

  chatBubbleSystem: {
    alignSelf: "center",
    maxWidth: "90%",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  chatSender: {
    marginBottom: 3,
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "800",
  },

  chatSenderSystem: {
    color: "#64748B",
    fontSize: 9,
    textAlign: "center",
  },

  chatMessage: {
    color: COLORS.text,
    lineHeight: 19,
  },

  chatMessageSystem: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },

  chatClosedText: {
    marginTop: 10,
    color: "#64748B",
    fontWeight: "700",
  },

  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12,
  },

  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
  },

  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
});

export default MyReservationsScreen;
