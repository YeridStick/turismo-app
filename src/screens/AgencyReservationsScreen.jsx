import { FontAwesome, Ionicons } from "@expo/vector-icons";
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
import { ENDPOINTS } from "../config/api.config";
import {
  getAgencyReservationById,
  getAgencyReservationMessages,
  getAgencyReservations,
  lookupAgencyInPersonPayment,
  requestAgencyInPersonPayment,
  sendAgencyReservationMessage,
  verifyAgencyInPersonPayment,
  updateAgencyReservationStatus,
} from "../services/api";
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

const PAYMENT_STATUS_LABELS = {
  pending: "Pendiente",
  checkout_created: "Pago iniciado",
  processing: "Validando pago",
  paid: "Pagado",
  failed: "Pago rechazado",
  expired: "Pago expirado",
  verified_by_agency: "Pago verificado por agencia",
};

const PAYMENT_PROVIDER_LABELS = {
  agency_managed: "Gestionado por la agencia",
  wompi: "Wompi",
};

const STATUS_FILTERS = ["requested", "contacted", "awaiting_payment", "confirmed", "rejected", "cancelled"];

const TRANSITIONS = {
  requested: ["rejected", "cancelled"],
  contacted: ["awaiting_payment", "rejected", "cancelled"],
  awaiting_payment: ["confirmed", "rejected", "cancelled"],
};

const FINAL_STATUSES = ["confirmed", "rejected", "cancelled"];

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

const extractPaymentLookup = (payload) =>
  payload?.data?.data ?? payload?.data ?? payload ?? null;

const formatCurrency = (value, currency = "COP") => {
  if (value == null || Number.isNaN(Number(value))) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const AgencyReservationCard = ({ item, onOpen, onStatusPress, updating }) => {
  const actions = TRANSITIONS[item.status] || [];
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onOpen}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <FontAwesome name="calendar-check-o" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>
            {item.packageTitle || "Paquete turistico"}
          </Text>
          <Text style={styles.meta}>
            {item.customerEmail || "Cliente"} · {item.travelers || "-"} viajeros
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Fechas</Text>
        <Text style={styles.detailValue}>{item.startDate || "-"} {item.endDate ? `- ${item.endDate}` : ""}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Valor</Text>
        <Text style={styles.detailValue}>{formatCurrency(item.totalAmount, item.currency || "COP")}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Canal</Text>
        <Text style={styles.detailValue}>{item.contactPreference || "-"}</Text>
      </View>
      {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
      {item.status === "requested" ? (
        <View style={styles.contactHint}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#0E7490" />
          <Text style={styles.contactHintText}>
            Responde por chat para pasarla automáticamente a contactada.
          </Text>
        </View>
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.actionsRow}>
          {actions.map((status) => (
            <TouchableOpacity
              key={`${item.id}-${status}`}
              style={[styles.actionButton, status === "rejected" && styles.actionDanger]}
              onPress={() => onStatusPress(item, status)}
              disabled={updating}
            >
              <Text style={[styles.actionText, status === "rejected" && styles.actionDangerText]}>
                {STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.finalBadge}>
          <Text style={styles.finalBadgeText}>{STATUS_LABELS[item.status] || item.status}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const AgencyReservationsScreen = ({ navigation, route }) => {
  const agencyId = route?.params?.agencyId;
  const agencyName = route?.params?.agencyName;
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState("requested");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [paymentCode, setPaymentCode] = useState("");
  const [paymentDialog, setPaymentDialog] = useState({
    visible: false,
    mode: "request",
    locationUrl: "",
    notes: "",
    paymentReference: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    reservation: null,
    nextStatus: "",
    notes: "",
  });

  const params = useMemo(() => ({ status, page: 0, size: 20 }), [status]);
  const requestDeduper = useMemo(() => createInFlightDeduper(), []);
  const selectedReservationRef = useRef(null);
  const listRequestSeqRef = useRef(0);
  const detailRequestSeqRef = useRef(0);
  const messagesRequestSeqRef = useRef(0);

  useEffect(() => {
    selectedReservationRef.current = selectedReservation;
  }, [selectedReservation]);

  const updateReservationInList = useCallback((reservation) => {
    if (!reservation?.id) return;

    setReservations((prev) => {
      const matchesCurrentFilter = reservation.status === status;

      if (!matchesCurrentFilter) {
        return prev.filter((item) => String(item.id) !== String(reservation.id));
      }

      let found = false;
      const next = prev.map((item) => {
        if (String(item.id) !== String(reservation.id)) return item;
        found = true;
        return { ...item, ...reservation };
      });

      return found ? next : [reservation, ...prev];
    });
  }, [status]);

  const getReservationsListKey = useCallback(() => {
    const endpoint = agencyId
      ? ENDPOINTS.AGENCY_SCOPED_RESERVATIONS(agencyId)
      : ENDPOINTS.AGENCY_RESERVATIONS;

    return buildRequestKey({
      endpoint,
      params,
      scope: { agencyId },
    });
  }, [agencyId, params]);

  const getReservationDetailKey = useCallback((reservationId) => {
    const endpoint = agencyId
      ? ENDPOINTS.AGENCY_SCOPED_RESERVATION_DETAIL(agencyId, reservationId)
      : ENDPOINTS.AGENCY_RESERVATION_DETAIL(reservationId);

    return buildRequestKey({
      endpoint,
      scope: { agencyId },
    });
  }, [agencyId]);

  const getReservationMessagesKey = useCallback((reservationId) => {
    const endpoint = agencyId
      ? ENDPOINTS.AGENCY_SCOPED_RESERVATION_MESSAGES(agencyId, reservationId)
      : ENDPOINTS.AGENCY_RESERVATION_MESSAGES(reservationId);

    return buildRequestKey({
      endpoint,
      params: { page: 0, size: 50 },
      scope: { agencyId },
    });
  }, [agencyId]);

  const fetchReservationDetail = useCallback((reservationId) => {
    return requestDeduper.run(getReservationDetailKey(reservationId), () =>
      getAgencyReservationById(reservationId, { agencyId }),
    );
  }, [agencyId, getReservationDetailKey, requestDeduper]);

  const loadReservations = useCallback(async () => {
    const requestSeq = listRequestSeqRef.current + 1;
    listRequestSeqRef.current = requestSeq;
    setError("");
    try {
      const requestKey = getReservationsListKey();
      const response = await requestDeduper.run(requestKey, () =>
        getAgencyReservations(params, { agencyId }),
      );

      if (requestSeq === listRequestSeqRef.current) {
        setReservations(extractItems(response));
      }
    } catch (err) {
      if (requestSeq === listRequestSeqRef.current) {
        setError(err?.response?.data?.message || "No pudimos cargar las solicitudes.");
      }
    }
  }, [agencyId, getReservationsListKey, params, requestDeduper]);

  const refresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  }, [loadReservations, loading, refreshing]);

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
        getAgencyReservationMessages(reservationId, params, { agencyId }),
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
        setMessagesError("No pudimos cargar los mensajes de esta solicitud.");
      }
    } finally {
      if (requestSeq === messagesRequestSeqRef.current) {
        setMessagesLoading(false);
      }
    }
  }, [agencyId, getReservationMessagesKey, requestDeduper]);

  const openDetail = useCallback(
    async (reservation) => {
      if (!reservation?.id) return;
      if (
        detailLoading &&
        String(selectedReservationRef.current?.id) === String(reservation.id)
      ) {
        return;
      }

      const requestSeq = detailRequestSeqRef.current + 1;
      detailRequestSeqRef.current = requestSeq;
      const previousReservationId = selectedReservationRef.current?.id;
      const openingSameReservation =
        String(previousReservationId) === String(reservation.id);
      setDetailVisible(true);
      selectedReservationRef.current = reservation;
      setSelectedReservation(reservation);
      if (!openingSameReservation) {
        setMessages([]);
      }
      setMessageText("");
      setDetailLoading(true);
      setDetailError("");
      setMessagesError("");

      try {
        const response = await fetchReservationDetail(reservation.id);
        const detail = extractReservation(response) || reservation;

        if (requestSeq === detailRequestSeqRef.current) {
          selectedReservationRef.current = detail;
          setSelectedReservation(detail);
          updateReservationInList(detail);
          await loadMessages(reservation.id);
        }
      } catch (err) {
        if (requestSeq === detailRequestSeqRef.current) {
          setDetailError(
            err?.response?.data?.message ||
              "No pudimos cargar el detalle de esta solicitud.",
          );
          Alert.alert(
            "No se pudo cargar",
            err?.response?.data?.message || "Intenta nuevamente.",
          );
        }
      } finally {
        if (requestSeq === detailRequestSeqRef.current) {
          setDetailLoading(false);
        }
      }
    },
    [detailLoading, fetchReservationDetail, loadMessages, updateReservationInList],
  );

  const closeDetail = () => {
    detailRequestSeqRef.current += 1;
    messagesRequestSeqRef.current += 1;
    setDetailVisible(false);
    selectedReservationRef.current = null;
    setSelectedReservation(null);
    setDetailLoading(false);
    setDetailError("");
    setMessages([]);
    setMessagesLoading(false);
    setMessagesError("");
    setMessageText("");
  };

  const changeStatus = useCallback((reservation, nextStatus) => {
    setStatusModal({
      visible: true,
      reservation,
      nextStatus,
      notes:
        nextStatus === "awaiting_payment"
          ? "Se enviaron instrucciones de pago por el canal autorizado."
          : "",
    });
  }, []);

  const closeStatusModal = () => {
    setStatusModal({
      visible: false,
      reservation: null,
      nextStatus: "",
      notes: "",
    });
  };

  const confirmStatusChange = async () => {
    const { reservation, nextStatus, notes } = statusModal;
    if (!reservation?.id || !nextStatus || updatingId) return;

    setUpdatingId(reservation.id);

    try {
      const response = await updateAgencyReservationStatus(
        reservation.id,
        nextStatus,
        notes.trim(),
        { agencyId },
      );
      const updated =
        extractReservation(response) || { ...reservation, status: nextStatus };

      setSelectedReservation((prev) =>
        String(prev?.id) === String(updated?.id) ? updated : prev,
      );
      if (String(selectedReservationRef.current?.id) === String(updated?.id)) {
        selectedReservationRef.current = updated;
      }
      requestDeduper.clear(getReservationsListKey());
      requestDeduper.clear(getReservationDetailKey(reservation.id));
      requestDeduper.clear(getReservationMessagesKey(reservation.id));
      listRequestSeqRef.current += 1;
      updateReservationInList(updated);
      closeStatusModal();
    } catch (err) {
      Alert.alert(
        "No se pudo actualizar",
        err?.response?.status === 409
          ? "La transición de estado no es válida."
          : err?.response?.data?.message || "Intenta nuevamente.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const submitMessage = async () => {
    const text = messageText.trim();

    if (!selectedReservation?.id || !text || FINAL_STATUSES.includes(selectedReservation.status)) {
      return;
    }

    setSendingMessage(true);

    try {
      await sendAgencyReservationMessage(selectedReservation.id, text, { agencyId });
      requestDeduper.clear(getReservationsListKey());
      requestDeduper.clear(getReservationDetailKey(selectedReservation.id));
      requestDeduper.clear(getReservationMessagesKey(selectedReservation.id));
      setMessageText("");
      const [detailResult] = await Promise.allSettled([
        fetchReservationDetail(selectedReservation.id),
        loadMessages(selectedReservation.id),
      ]);

      if (detailResult.status === "fulfilled") {
        const reservation = extractReservation(detailResult.value);
        if (reservation) {
          selectedReservationRef.current = reservation;
          setSelectedReservation(reservation);
          listRequestSeqRef.current += 1;
          updateReservationInList(reservation);
        }
      }
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

  const lookupPaymentRequest = async () => {
    const code = paymentCode.trim();
    if (!code || !agencyId) return;
    setPaymentLoading(true);
    try {
      const response = await lookupAgencyInPersonPayment(code, { agencyId });
      const result = extractPaymentLookup(response);
      if (!result?.reservation || !result?.paymentRequest) throw new Error("Solicitud no encontrada");
      const reservation = result.reservation;
      selectedReservationRef.current = reservation;
      setSelectedReservation(reservation);
      setPaymentRequest(result.paymentRequest);
      setMessages(orderChatMessages(result.messages || []));
      setDetailVisible(true);
      setPaymentCode("");
    } catch (err) {
      Alert.alert("No se encontró la solicitud", err?.response?.data?.message || "Verifica el código e intenta nuevamente.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const openPaymentRequestDialog = () => {
    setPaymentDialog({ visible: true, mode: "request", locationUrl: "", notes: "", paymentReference: "" });
  };

  const openPaymentVerifyDialog = () => {
    setPaymentDialog((prev) => ({ ...prev, visible: true, mode: "verify" }));
  };

  const closePaymentDialog = () => {
    if (!paymentLoading) setPaymentDialog((prev) => ({ ...prev, visible: false }));
  };

  const submitPaymentDialog = async () => {
    if (!selectedReservation?.id || !agencyId || paymentLoading) return;
    setPaymentLoading(true);
    try {
      if (paymentDialog.mode === "request") {
        const response = await requestAgencyInPersonPayment(selectedReservation.id, {
          locationUrl: paymentDialog.locationUrl.trim() || undefined,
          notes: paymentDialog.notes.trim() || undefined,
        }, { agencyId });
        const request = extractPaymentLookup(response);
        setPaymentRequest(request);
        Alert.alert("Pago solicitado", `Código de atención: ${request?.code || "generado"}`);
      } else {
        const response = await verifyAgencyInPersonPayment(
          selectedReservation.id,
          paymentRequest?.id,
          {
            paymentReference: paymentDialog.paymentReference.trim() || undefined,
            notes: paymentDialog.notes.trim() || undefined,
          },
          { agencyId },
        );
        const request = extractPaymentLookup(response);
        setPaymentRequest(request);
        setSelectedReservation((prev) => ({ ...prev, status: "confirmed", paymentStatus: "verified_by_agency", paymentProvider: "agency_managed" }));
        await loadMessages(selectedReservation.id);
        Alert.alert("Pago confirmado", "La reserva fue confirmada correctamente.");
      }
      setPaymentDialog((prev) => ({ ...prev, visible: false }));
      requestDeduper.clear(getReservationsListKey());
      requestDeduper.clear(getReservationDetailKey(selectedReservation.id));
      updateReservationInList({ ...selectedReservation, ...(paymentDialog.mode === "verify" ? { status: "confirmed", paymentStatus: "verified_by_agency" } : {}) });
    } catch (err) {
      Alert.alert("No se pudo completar", err?.response?.data?.message || "Intenta nuevamente.");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadReservations().finally(() => setLoading(false));
  }, [loadReservations]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Solicitudes</Text>
          <Text style={styles.headerSubtitle}>
            {agencyName
              ? `Reservas de ${agencyName}`
              : "Reservas administradas por agencia"}
          </Text>
        </View>
      </View>

      <View style={styles.paymentLookupBar}>
        <TextInput
          style={styles.paymentLookupInput}
          value={paymentCode}
          onChangeText={setPaymentCode}
          autoCapitalize="characters"
          placeholder="Código de pago presencial (TRM-...)"
        />
        <TouchableOpacity style={styles.paymentLookupButton} onPress={lookupPaymentRequest} disabled={paymentLoading || !paymentCode.trim()}>
          {paymentLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="search" size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8 }}
          renderItem={({ item }) => {
            const active = item === status;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatus(item)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {STATUS_LABELS[item]}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={({ item }) => (
            <AgencyReservationCard
              item={item}
              onOpen={() => openDetail(item)}
              updating={updatingId === item.id}
              onStatusPress={changeStatus}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
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
              <FontAwesome name="inbox" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{error || "No hay solicitudes en este estado."}</Text>
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
        visible={statusModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeStatusModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.statusModalCard}>
            <Text style={styles.modalTitle}>Actualizar solicitud</Text>
            <Text style={styles.modalDescription}>
              Cambiar estado a {STATUS_LABELS[statusModal.nextStatus] || statusModal.nextStatus}.
            </Text>

            <Text style={styles.inputLabel}>Notas para la gestión</Text>
            <TextInput
              style={styles.notesInput}
              value={statusModal.notes}
              multiline
              maxLength={2000}
              placeholder="Ej. Se contactó al cliente por el canal autorizado."
              onChangeText={(notes) =>
                setStatusModal((prev) => ({ ...prev, notes }))
              }
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeStatusModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, updatingId && styles.disabledAction]}
                onPress={confirmStatusChange}
                disabled={Boolean(updatingId)}
              >
                <Text style={styles.confirmButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={detailVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalCard}>
            <View style={styles.detailModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Detalle de solicitud</Text>
                <Text style={styles.modalDescription} numberOfLines={1}>
                  {selectedReservation?.packageTitle || "Paquete turistico"}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando detalle...</Text>
              </View>
            ) : detailError ? (
              <View style={styles.detailLoading}>
                <Ionicons name="alert-circle-outline" size={38} color="#DC2626" />
                <Text style={styles.emptyTitle}>No se pudo cargar</Text>
                <Text style={styles.detailBoxText}>{detailError}</Text>
                {selectedReservation?.id ? (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => openDetail(selectedReservation)}
                    disabled={detailLoading}
                  >
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.detailContent}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxTitle}>Cliente</Text>
                  <Text style={styles.detailBoxText}>{selectedReservation?.customerEmail || "-"}</Text>
                  <Text style={styles.detailBoxText}>{selectedReservation?.customerPhone || "Sin telefono"}</Text>
                </View>

                {selectedReservation?.status !== "confirmed" && selectedReservation?.status !== "rejected" && selectedReservation?.status !== "cancelled" ? (
                  <View style={styles.paymentActionsBox}>
                    <Text style={styles.detailBoxTitle}>Pago presencial</Text>
                    {paymentRequest ? (
                      <>
                        <Text style={styles.paymentCodeText}>Código: {paymentRequest.code}</Text>
                        <Text style={styles.detailBoxText}>Estado: {paymentRequest.status === "REQUESTED" ? "Pendiente de verificación" : paymentRequest.status}</Text>
                        <TouchableOpacity style={styles.confirmButton} onPress={openPaymentVerifyDialog}>
                          <Text style={styles.confirmButtonText}>Confirmar pago recibido</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={styles.paymentRequestButton} onPress={openPaymentRequestDialog}>
                        <Text style={styles.confirmButtonText}>Solicitar pago presencial</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxTitle}>Estado y pago</Text>
                  <Text style={styles.detailBoxText}>
                    {STATUS_LABELS[selectedReservation?.status] || selectedReservation?.status || "-"}
                  </Text>
                  <Text style={styles.detailBoxText}>
                    {PAYMENT_STATUS_LABELS[selectedReservation?.paymentStatus] || selectedReservation?.paymentStatus || "Pendiente"} · {PAYMENT_PROVIDER_LABELS[selectedReservation?.paymentProvider] || selectedReservation?.paymentProvider || "Gestionado por la agencia"}
                  </Text>
                  {selectedReservation?.agencyNotes ? (
                    <Text style={styles.message}>{selectedReservation.agencyNotes}</Text>
                  ) : null}
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxTitle}>Mensajeria interna</Text>
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
                        {messagesError || "Aun no hay mensajes."}
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
                          const fromAgency = message.senderType === "AGENCY";
                          return (
                            <View
                              key={String(message.id)}
                              style={[
                                styles.chatBubble,
                                system
                                  ? styles.chatBubbleSystem
                                  : fromAgency
                                    ? styles.chatBubbleMine
                                    : styles.chatBubbleCustomer,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chatSender,
                                  system && styles.chatSenderSystem,
                                ]}
                              >
                                {system ? "Sistema" : fromAgency ? "Agencia" : "Cliente"}
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

                  {FINAL_STATUSES.includes(selectedReservation?.status) ? (
                    <Text style={styles.chatClosedText}>El chat esta cerrado para esta solicitud.</Text>
                  ) : (
                    <View style={styles.chatInputRow}>
                      <TextInput
                        style={styles.chatInput}
                        value={messageText}
                        multiline
                        maxLength={2000}
                        placeholder="Escribe al cliente"
                        onChangeText={setMessageText}
                      />
                      <TouchableOpacity
                        style={[
                          styles.chatSendButton,
                          (!messageText.trim() || sendingMessage) && styles.disabledAction,
                        ]}
                        onPress={submitMessage}
                        disabled={!messageText.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Ionicons name="send" size={17} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={paymentDialog.visible} transparent animationType="fade" onRequestClose={closePaymentDialog}>
        <View style={styles.modalBackdrop}>
          <View style={styles.statusModalCard}>
            <Text style={styles.modalTitle}>{paymentDialog.mode === "request" ? "Solicitar pago presencial" : "Confirmar pago recibido"}</Text>
            {paymentDialog.mode === "request" ? (
              <>
                <Text style={styles.inputLabel}>Enlace de ubicación (opcional)</Text>
                <TextInput style={styles.notesInput} value={paymentDialog.locationUrl} placeholder="https://maps.google.com/..." onChangeText={(locationUrl) => setPaymentDialog((prev) => ({ ...prev, locationUrl }))} />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Referencia del pago (opcional)</Text>
                <TextInput style={styles.notesInput} value={paymentDialog.paymentReference} placeholder="Recibo o referencia" onChangeText={(paymentReference) => setPaymentDialog((prev) => ({ ...prev, paymentReference }))} />
              </>
            )}
            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput style={styles.notesInput} value={paymentDialog.notes} multiline maxLength={1000} placeholder="Instrucciones u observaciones" onChangeText={(notes) => setPaymentDialog((prev) => ({ ...prev, notes }))} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closePaymentDialog} disabled={paymentLoading}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, paymentLoading && styles.disabledAction]} onPress={submitPaymentDialog} disabled={paymentLoading}>
                {paymentLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmButtonText}>{paymentDialog.mode === "request" ? "Solicitar" : "Confirmar"}</Text>}
              </TouchableOpacity>
            </View>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
  },
  paymentLookupBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  paymentLookupInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
  },
  paymentLookupButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  paymentActionsBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  paymentCodeText: {
    marginVertical: 6,
    color: COLORS.primary,
    fontWeight: "900",
    letterSpacing: 1,
  },
  paymentRequestButton: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  filters: {
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#ECFEFF",
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 12,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: FONT_SIZES.md,
  },
  meta: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  detailLabel: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  detailValue: {
    color: COLORS.text,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  message: {
    marginTop: 10,
    color: "#475569",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    lineHeight: 18,
  },
  contactHint: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#A5F3FC",
  },
  contactHintText: {
    flex: 1,
    color: "#0E7490",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#A5F3FC",
  },
  actionDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  actionText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  actionDangerText: {
    color: "#DC2626",
  },
  finalBadge: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#F1F5F9",
  },
  finalBadgeText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: FONT_SIZES.md,
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
  statusModalCard: {
    padding: SPACING.lg,
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  detailModalCard: {
    maxHeight: "86%",
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "900",
  },
  modalDescription: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  inputLabel: {
    marginTop: SPACING.md,
    marginBottom: 6,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "800",
  },
  notesInput: {
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  detailLoading: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  detailContent: {
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  detailBox: {
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
  },
  detailBoxTitle: {
    marginBottom: 8,
    color: COLORS.text,
    fontWeight: "900",
  },
  detailBoxText: {
    color: COLORS.textLight,
    lineHeight: 20,
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
  chatBubbleCustomer: {
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
  disabledAction: {
    opacity: 0.62,
  },
});

export default AgencyReservationsScreen;
