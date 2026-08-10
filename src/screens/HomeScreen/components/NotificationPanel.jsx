import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getAgencyReservationMessages,
  getAgencyReservations,
  getFavoritePlaces,
  getMyReservations,
  getReservationMessages,
  getReservationPaymentStatus,
  initiateReservationPayment,
  requestAgencyInPersonPayment,
  sendAgencyReservationMessage,
  sendReservationMessage,
  verifyAgencyInPersonPayment,
  updateAgencyReservationStatus,
} from "../../../services/api";
import EdgeDrawer from "../../../components/ui/EdgeDrawer";
import { COLORS, FONT_SIZES, SPACING } from "../../../utils/constants";
import { isPaymentPending } from "../../../utils/paymentState";

const FINAL_STATUSES = ["confirmed", "rejected", "cancelled"];
const ACTIVE_CHAT_STATUSES = ["requested", "contacted", "awaiting_payment"];
const PAYABLE_PAYMENT_STATUSES = [
  "pending",
  "checkout_created",
  "failed",
  "expired",
];
const PAYMENT_POLL_INTERVAL_MS = 3000;
const PAYMENT_MAX_POLLS = 8;

const CHAT_STATUS_ACTIONS = {
  contacted: {
    nextStatus: "in_person_payment",
    label: "Solicitar pago",
    icon: "card-outline",
    notes: "La agencia solicitó continuar con el pago.",
  },
  awaiting_payment: {
    nextStatus: "confirmed",
    label: "Confirmar",
    icon: "checkmark-circle-outline",
    notes: "",
  },
};

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

const TYPE_META = {
  RESERVATION_REQUEST_CREATED: {
    icon: "calendar-outline",
    color: "#F97316",
    label: "Solicitud",
  },
  RESERVATION_MESSAGE: {
    icon: "chatbubble-ellipses-outline",
    color: "#0E7490",
    label: "Mensaje",
  },
  RESERVATION_STATUS_CHANGED: {
    icon: "checkmark-done-outline",
    color: "#059669",
    label: "Estado",
  },
};

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

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatReservationDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);

  return `${day}/${month}/${year}`;
};

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

const getPaymentErrorMessage = (error) => {
  const backendMessage = error?.response?.data?.message;

  if (error?.response?.status === 401) {
    return "Tu sesión venció. Inicia sesión nuevamente.";
  }

  if (error?.response?.status === 404) {
    return "No encontramos esta reserva con tu usuario.";
  }

  if (error?.response?.status === 409) {
    return (
      backendMessage ||
      "La reserva aún no está habilitada para pago o Wompi no está activo."
    );
  }

  return backendMessage || "No pudimos iniciar el pago. Intenta nuevamente.";
};

const hasMessageNotification = (notifications) => {
  return notifications.some(
    (item) => item.type === "RESERVATION_MESSAGE" && !item.read,
  );
};

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/^role_/, "");

const NotificationPanel = ({
  enabled = false,
  visible,
  onOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  error,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
  onOpenReservations,
  onOpenFavoritePlace,
  panelWidth,
  onMotionStart,
  onMotionEnd,
  roles = [],
}) => {
  const [activeView, setActiveView] = useState("notifications");
  const [chatReservations, setChatReservations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatActionError, setChatActionError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingChatStatus, setUpdatingChatStatus] = useState(false);
  const [inPersonRequests, setInPersonRequests] = useState({});
  const [startingPayment, setStartingPayment] = useState(false);
  const [historyPackages, setHistoryPackages] = useState([]);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [activeHistorySection, setActiveHistorySection] = useState("purchases");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [favoritesError, setFavoritesError] = useState("");
  const preferredChatRef = useRef(null);
  const pendingChatNotificationRef = useRef(null);
  const selectedChatIdRef = useRef(null);
  const messagesByChatRef = useRef({});
  const chatsLoadedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  const favoritesLoadedRef = useRef(false);
  const normalizedRoles = useMemo(() => roles.map(normalizeRole), [roles]);
  const isAdmin = normalizedRoles.includes("admin");
  const usesAgencyInbox =
    isAdmin ||
    normalizedRoles.includes("agency") ||
    normalizedRoles.includes("agencia");
  const messageAttention = useMemo(
    () => hasMessageNotification(notifications),
    [notifications],
  );

  const selectedReservation = useMemo(
    () =>
      chatReservations.find(
        (item) => String(item.id) === String(selectedChatId),
      ),
    [chatReservations, selectedChatId],
  );
  const selectedPaymentStatus = selectedReservation?.paymentStatus || "pending";
  const selectedInPersonRequest = selectedReservation?.id
    ? inPersonRequests[selectedReservation.id]
    : null;
  const canStartClientPayment =
    !usesAgencyInbox &&
    selectedReservation?.id &&
    selectedReservation?.status === "awaiting_payment" &&
    PAYABLE_PAYMENT_STATUSES.includes(selectedPaymentStatus);

  const updateSelectedChatId = useCallback((chatId) => {
    selectedChatIdRef.current = chatId || null;
    setSelectedChatId(chatId || null);
  }, []);

  const rememberChatMessages = useCallback((chatKey, nextMessages) => {
    messagesByChatRef.current = {
      ...messagesByChatRef.current,
      [chatKey]: nextMessages,
    };
  }, []);

  const getAgencyOptions = useCallback(
    (reservation) => {
      if (!isAdmin || !reservation?.agencyId) return {};
      return { agencyId: reservation.agencyId };
    },
    [isAdmin],
  );

  const loadMessages = useCallback(async (reservationOrId, options = {}) => {
    const reservation =
      typeof reservationOrId === "object" ? reservationOrId : null;
    const reservationId = reservation?.id || reservationOrId;
    if (!reservationId) {
      setChatMessages([]);
      return;
    }

    const chatKey = String(reservationId);
    const cachedMessages = messagesByChatRef.current[chatKey];
    const showLoader = options.forceLoader || !cachedMessages;

    if (cachedMessages) {
      setChatMessages(cachedMessages);
    }

    if (showLoader) {
      setLoadingMessages(true);
    }
    setMessagesError("");
    try {
      const params = { page: 0, size: 60 };
      const response = usesAgencyInbox
        ? await getAgencyReservationMessages(
            reservationId,
            params,
            getAgencyOptions(reservation),
          )
        : await getReservationMessages(reservationId, params);
      const nextMessages = orderChatMessages(extractItems(response));
      rememberChatMessages(chatKey, nextMessages);
      if (String(selectedChatIdRef.current) === chatKey) {
        setChatMessages(nextMessages);
      }
      const pendingNotification = pendingChatNotificationRef.current;
      if (
        pendingNotification?.reservationId &&
        String(pendingNotification.reservationId) === chatKey
      ) {
        pendingChatNotificationRef.current = null;
        onMarkRead?.(pendingNotification);
      }
    } catch (_err) {
      if (!cachedMessages && String(selectedChatIdRef.current) === chatKey) {
        setChatMessages([]);
      }
      if (String(selectedChatIdRef.current) === chatKey) {
        setMessagesError("No pudimos cargar los mensajes. Intenta nuevamente.");
      }
    } finally {
      if (showLoader) {
        setLoadingMessages(false);
      }
    }
  }, [getAgencyOptions, onMarkRead, rememberChatMessages, usesAgencyInbox]);

  const loadChats = useCallback(async (options = {}) => {
    const showLoader = options.forceLoader || !chatsLoadedRef.current;
    if (showLoader) {
      setLoadingChats(true);
    }
    setChatError("");

    try {
      const params = { page: 0, size: 50 };
      const preferredChat = preferredChatRef.current;
      const agencyOptions =
        isAdmin && preferredChat?.agencyId
          ? { agencyId: preferredChat.agencyId }
          : {};
      const items = usesAgencyInbox
        ? (
            await Promise.allSettled(
              ACTIVE_CHAT_STATUSES.map((status) =>
                getAgencyReservations({ ...params, status }, agencyOptions),
              ),
            )
          ).flatMap((result) =>
            result.status === "fulfilled" ? extractItems(result.value) : [],
          )
        : extractItems(await getMyReservations(params));
      const seen = new Set();
      const activeChats = items.filter((reservation) => {
        const id = reservation?.id;
        if (id == null || FINAL_STATUSES.includes(reservation.status)) {
          return false;
        }
        const key = String(id);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      setChatReservations(activeChats);
      chatsLoadedRef.current = true;
      const nextSelected =
        activeChats.find(
          (item) =>
            preferredChat?.reservationId &&
            String(item.id) === String(preferredChat.reservationId),
        ) ||
        activeChats.find(
          (item) => String(item.id) === String(selectedChatIdRef.current),
        ) ||
        activeChats[0];
      updateSelectedChatId(nextSelected?.id || null);
      preferredChatRef.current = null;
      await loadMessages(nextSelected, { forceLoader: showLoader });
    } catch (err) {
      setChatError(
        err?.response?.data?.message ||
          (usesAgencyInbox
            ? "No pudimos cargar los chats de solicitudes asignadas a tu agencia."
            : "No pudimos cargar tus chats de reserva."),
      );
    } finally {
      if (showLoader) {
        setLoadingChats(false);
      }
    }
  }, [
    isAdmin,
    loadMessages,
    updateSelectedChatId,
    usesAgencyInbox,
  ]);

  useEffect(() => {
    if (visible && activeView === "chats") {
      loadChats();
    }
  }, [activeView, loadChats, visible]);

  const loadHistory = useCallback(async (options = {}) => {
    const showLoader = options.forceLoader || !historyLoadedRef.current;
    if (showLoader) {
      setLoadingHistory(true);
    }
    setHistoryError("");

    try {
      const response = await getMyReservations({ page: 0, size: 80 });
      const confirmedPackages = extractItems(response)
        .filter((reservation) => reservation.status === "confirmed")
        .sort((a, b) => {
          const bTime = new Date(b.updatedAt || b.createdAt || b.startDate || 0).getTime();
          const aTime = new Date(a.updatedAt || a.createdAt || a.startDate || 0).getTime();
          return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
        });

      setHistoryPackages(confirmedPackages);
      historyLoadedRef.current = true;
    } catch (err) {
      setHistoryError(
        err?.response?.data?.message ||
          "No pudimos cargar tus paquetes confirmados.",
      );
    } finally {
      if (showLoader) {
        setLoadingHistory(false);
      }
    }
  }, []);

  const loadFavorites = useCallback(async (options = {}) => {
    const showLoader = options.forceLoader || !favoritesLoadedRef.current;
    if (showLoader) {
      setLoadingFavorites(true);
    }
    setFavoritesError("");

    try {
      const response = await getFavoritePlaces({ limit: 80, offset: 0 });
      setFavoritePlaces(extractItems(response));
      favoritesLoadedRef.current = true;
    } catch (err) {
      setFavoritesError(
        err?.response?.data?.message ||
          "No pudimos cargar tus sitios favoritos.",
      );
    } finally {
      if (showLoader) {
        setLoadingFavorites(false);
      }
    }
  }, []);

  useEffect(() => {
    if (visible && activeView === "history") {
      loadHistory();
      if (activeHistorySection === "favorites") {
        loadFavorites();
      }
    }
  }, [activeHistorySection, activeView, loadFavorites, loadHistory, visible]);

  const handleHistorySection = (section) => {
    setActiveHistorySection(section);
    if (section === "favorites") {
      loadFavorites();
    }
  };

  const handleOpenNotification = (notification) => {
    if (
      notification.type === "RESERVATION_MESSAGE" ||
      notification.type === "RESERVATION_REQUEST_CREATED"
    ) {
      pendingChatNotificationRef.current = notification;
      preferredChatRef.current = {
        reservationId: notification.reservationId || null,
        agencyId: notification.agencyId || null,
      };
      setActiveView("chats");
      return;
    }
    onMarkRead?.(notification);
    onOpenReservations?.(notification);
  };

  const handleSelectChat = async (reservation) => {
    const chatKey = String(reservation.id);
    const cachedMessages = messagesByChatRef.current[chatKey];
    updateSelectedChatId(reservation.id);
    setChatActionError("");
    setMessageDraft("");
    setChatMessages(cachedMessages || []);
    loadMessages(reservation, { forceLoader: !cachedMessages });
  };

  const handleSendMessage = async () => {
    const text = messageDraft.trim();
    if (!selectedReservation?.id || !text || sendingMessage) return;

    setSendingMessage(true);
    try {
      if (usesAgencyInbox) {
        await sendAgencyReservationMessage(
          selectedReservation.id,
          text,
          getAgencyOptions(selectedReservation),
        );
      } else {
        await sendReservationMessage(selectedReservation.id, text);
      }
      setMessageDraft("");
      await loadMessages(selectedReservation, { forceLoader: false });
    } catch (_err) {
      setChatError("No pudimos enviar el mensaje. Intenta nuevamente.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAdvanceChatStatus = async () => {
    const action = CHAT_STATUS_ACTIONS[selectedReservation?.status];
    if (!usesAgencyInbox || !selectedReservation?.id || !action || updatingChatStatus) {
      return;
    }

    setUpdatingChatStatus(true);
    setChatActionError("");

    try {
      if (action.nextStatus === "in_person_payment") {
        if (selectedInPersonRequest?.id) {
          const response = await verifyAgencyInPersonPayment(
            selectedReservation.id,
            selectedInPersonRequest.id,
            { notes: "Pago presencial confirmado desde el chat." },
            getAgencyOptions(selectedReservation),
          );
          const verified = response?.data?.data || response?.data || null;
          if (verified?.id) {
            setInPersonRequests((prev) => ({
              ...prev,
              [selectedReservation.id]: verified,
            }));
          }
          await Promise.all([
            loadMessages(selectedReservation, { forceLoader: false }),
            loadChats({ forceLoader: false }),
          ]);
          setChatActionError("Pago confirmado y reserva actualizada.");
          return;
        }

        const response = await requestAgencyInPersonPayment(
          selectedReservation.id,
          { notes: action.notes },
          getAgencyOptions(selectedReservation),
        );
        const request = response?.data?.data || response?.data || null;
        if (request?.id) {
          setInPersonRequests((prev) => ({
            ...prev,
            [selectedReservation.id]: request,
          }));
          setChatActionError(`Pago presencial solicitado. Código: ${request.code}`);
        }
        await Promise.all([
          loadMessages(selectedReservation, { forceLoader: false }),
          loadChats({ forceLoader: false }),
        ]);
        return;
      }

      const response = await updateAgencyReservationStatus(
        selectedReservation.id,
        action.nextStatus,
        action.notes,
        getAgencyOptions(selectedReservation),
      );
      const updated = response?.data?.data ?? response?.data ?? null;

      if (updated?.id) {
        setChatReservations((prev) =>
          prev.map((item) => (String(item.id) === String(updated.id) ? updated : item)),
        );
      }

      await loadMessages(updated || selectedReservation, { forceLoader: false });
      await loadChats({ forceLoader: false });
    } catch (err) {
      setChatActionError(
        err?.response?.data?.message ||
          "No pudimos actualizar el estado de esta solicitud.",
      );
    } finally {
      setUpdatingChatStatus(false);
    }
  };

  const handleStartClientPayment = async () => {
    if (!canStartClientPayment || startingPayment) return;

    setStartingPayment(true);
    setChatActionError("");

    try {
      const response = await initiateReservationPayment(selectedReservation.id);
      const data = response?.data?.data || response?.data || {};
      const checkoutUrl = data.checkoutUrl;

      if (!checkoutUrl) {
        setChatActionError("El backend no entregó una URL de checkout.");
        return;
      }

      await WebBrowser.openBrowserAsync(checkoutUrl);
      for (let attempt = 0; attempt < PAYMENT_MAX_POLLS; attempt += 1) {
        const statusResult = await getReservationPaymentStatus(selectedReservation.id)
          .then((result) => ({ ok: true, result }))
          .catch(() => ({ ok: false }));

        if (statusResult.ok) {
          const statusData = statusResult.result?.data?.data || statusResult.result?.data || {};
          if (!isPaymentPending(statusData.paymentStatus)) break;
        }

        if (attempt < PAYMENT_MAX_POLLS - 1) {
          await new Promise((resolve) => setTimeout(resolve, PAYMENT_POLL_INTERVAL_MS));
        }
      }
      await Promise.allSettled([
        loadChats({ forceLoader: false }),
        loadMessages(selectedReservation, { forceLoader: false }),
      ]);
    } catch (err) {
      setChatActionError(getPaymentErrorMessage(err));
    } finally {
      setStartingPayment(false);
    }
  };

  const renderSegment = (id, label, icon, highlight = false) => {
    const active = activeView === id;

    return (
      <TouchableOpacity
        style={[panelStyles.segmentButton, active && panelStyles.segmentButtonActive]}
        onPress={() => setActiveView(id)}
        activeOpacity={0.86}
      >
        <View>
          <Ionicons
            name={icon}
            size={16}
            color={active ? "#FFFFFF" : "#0E7490"}
          />
          {highlight ? <View style={panelStyles.segmentDot} /> : null}
        </View>
        <Text
          style={[
            panelStyles.segmentText,
            active && panelStyles.segmentTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNotifications = () => (
    <>
      <View style={panelStyles.summaryCompact}>
        <View style={panelStyles.summaryCompactIcon}>
          <Ionicons name="pulse-outline" size={15} color="#0E7490" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={panelStyles.summaryCompactLabel}>Seguimiento</Text>
          <Text style={panelStyles.summaryCompactTitle} numberOfLines={1}>
            {unreadCount > 0
              ? `${unreadCount} sin leer`
              : "Todo al día"}
          </Text>
        </View>
        <TouchableOpacity
          style={panelStyles.compactIconButton}
          onPress={() => setActiveView("chats")}
          activeOpacity={0.84}
        >
          <Ionicons name="chatbubbles-outline" size={15} color="#0E7490" />
        </TouchableOpacity>
        <TouchableOpacity
          style={panelStyles.compactIconButton}
          onPress={onRefresh}
          activeOpacity={0.84}
        >
          <Ionicons name="refresh" size={15} color="#0E7490" />
        </TouchableOpacity>
      </View>

      <View style={panelStyles.listHeader}>
        <Text style={panelStyles.listTitle}>Recientes</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={onMarkAllRead}>
            <Text style={panelStyles.markAllText}>Marcar leídas</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={panelStyles.centerState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={panelStyles.centerText}>Cargando notificaciones...</Text>
        </View>
      ) : error ? (
        <View style={panelStyles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color="#F97316" />
          <Text style={panelStyles.centerText}>{error}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={panelStyles.centerState}>
          <Ionicons name="sparkles-outline" size={30} color="#94A3B8" />
          <Text style={panelStyles.centerText}>
            Cuando haya novedades de tus solicitudes aparecerán aquí.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={panelStyles.listContent}
        >
          {notifications.map((notification, index) => {
            const meta = TYPE_META[notification.type] || {
              icon: "notifications-outline",
              color: "#64748B",
              label: "Aviso",
            };

            return (
              <TouchableOpacity
                key={String(notification.id || index)}
                style={[
                  panelStyles.notificationCard,
                  !notification.read && panelStyles.notificationCardUnread,
                ]}
                activeOpacity={0.88}
                onPress={() => handleOpenNotification(notification)}
              >
                <View
                  style={[
                    panelStyles.notificationIcon,
                    { backgroundColor: `${meta.color}14` },
                  ]}
                >
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={panelStyles.notificationTopRow}>
                    <Text style={panelStyles.notificationType}>{meta.label}</Text>
                    <Text style={panelStyles.notificationDate}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                  <Text style={panelStyles.notificationTitle} numberOfLines={2}>
                    {notification.title}
                  </Text>
                  <Text style={panelStyles.notificationMessage} numberOfLines={3}>
                    {notification.message}
                  </Text>
                </View>
                {!notification.read ? <View style={panelStyles.unreadDot} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </>
  );

  const renderChats = () => (
    <View style={panelStyles.viewFill}>
      <View style={panelStyles.chatIntroCompact}>
        <Ionicons name="chatbubbles-outline" size={16} color="#0E7490" />
        <Text style={panelStyles.chatIntroCompactTitle}>Chats activos</Text>
        {chatReservations.length > 0 ? (
          <View style={panelStyles.chatCountPill}>
            <Text style={panelStyles.chatCountText}>{chatReservations.length}</Text>
          </View>
        ) : null}
      </View>

      {loadingChats ? (
        <View style={panelStyles.centerState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={panelStyles.centerText}>Cargando chats...</Text>
        </View>
      ) : chatError ? (
        <View style={panelStyles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color="#F97316" />
          <Text style={panelStyles.centerText}>{chatError}</Text>
          <TouchableOpacity style={panelStyles.primaryButtonWide} onPress={loadChats}>
            <Text style={panelStyles.primaryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : chatReservations.length === 0 ? (
        <View style={panelStyles.centerState}>
          <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" />
          <Text style={panelStyles.centerText}>
            No tienes chats activos. Cuando una solicitud esté abierta, aparecerá aquí.
          </Text>
        </View>
      ) : (
        <>
          <View style={panelStyles.chatTabsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={panelStyles.chatTabs}
            >
              {chatReservations.map((reservation) => {
                const active = String(reservation.id) === String(selectedChatId);
                return (
                  <TouchableOpacity
                    key={String(reservation.id)}
                    style={[panelStyles.chatTab, active && panelStyles.chatTabActive]}
                    onPress={() => handleSelectChat(reservation)}
                    activeOpacity={0.86}
                  >
                    <View style={panelStyles.chatStatusDotRow}>
                      <View
                        style={[
                          panelStyles.chatStatusDot,
                          active && panelStyles.chatStatusDotActive,
                        ]}
                      />
                      <Text
                        style={[panelStyles.chatTabMeta, active && panelStyles.chatTabMetaActive]}
                        numberOfLines={1}
                      >
                        {STATUS_LABELS[reservation.status] || reservation.status}
                      </Text>
                    </View>
                    <Text
                      style={[panelStyles.chatTabTitle, active && panelStyles.chatTabTitleActive]}
                      numberOfLines={1}
                    >
                      {reservation.packageTitle || "Paquete"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={panelStyles.chatSurface}>
            <View style={panelStyles.chatHeader}>
              <View style={panelStyles.chatHeaderIcon}>
                <Ionicons name="briefcase-outline" size={17} color="#0E7490" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={panelStyles.chatTitle} numberOfLines={1}>
                  {selectedReservation?.packageTitle || "Solicitud"}
                </Text>
                <Text style={panelStyles.chatMeta} numberOfLines={1}>
                  {selectedReservation?.agencyName ||
                    selectedReservation?.customerEmail ||
                    "Agencia pendiente"}
                </Text>
              </View>
              <TouchableOpacity
                style={panelStyles.ghostButton}
                onPress={() => loadMessages(selectedReservation || selectedChatId)}
              >
                <Ionicons name="refresh" size={15} color="#0E7490" />
              </TouchableOpacity>
            </View>

            {usesAgencyInbox && selectedReservation ? (
              <View style={panelStyles.chatStatusPanel}>
                <View style={panelStyles.chatStatusInfo}>
                  <Text style={panelStyles.chatStatusLabel}>Estado</Text>
                  <Text style={panelStyles.chatStatusValue}>
                    {STATUS_LABELS[selectedReservation.status] ||
                      selectedReservation.status ||
                      "-"}
                  </Text>
                  {chatActionError ? (
                    <Text style={panelStyles.chatStatusError}>{chatActionError}</Text>
                  ) : null}
                </View>
                {CHAT_STATUS_ACTIONS[selectedReservation.status] ? (
                  <TouchableOpacity
                    style={[
                      panelStyles.chatStatusButton,
                      updatingChatStatus && panelStyles.disabled,
                    ]}
                    onPress={handleAdvanceChatStatus}
                    disabled={updatingChatStatus}
                    activeOpacity={0.86}
                  >
                    {updatingChatStatus ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={CHAT_STATUS_ACTIONS[selectedReservation.status].icon}
                        size={15}
                        color="#FFFFFF"
                      />
                    )}
                    <Text style={panelStyles.chatStatusButtonText}>
                      {selectedInPersonRequest?.status === "REQUESTED"
                        ? "Confirmar pago"
                        : CHAT_STATUS_ACTIONS[selectedReservation.status].label}
                    </Text>
                  </TouchableOpacity>
                ) : selectedReservation.status === "requested" ? (
                  <View style={panelStyles.chatStatusHint}>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color="#0E7490" />
                    <Text style={panelStyles.chatStatusHintText}>
                      Responde para contactar
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : canStartClientPayment ? (
              <View style={panelStyles.clientPaymentWrap}>
                <TouchableOpacity
                  style={[
                    panelStyles.clientPaymentButton,
                    startingPayment && panelStyles.disabled,
                  ]}
                  onPress={handleStartClientPayment}
                  disabled={startingPayment}
                  activeOpacity={0.88}
                >
                  <View style={panelStyles.clientPaymentIcon}>
                    {startingPayment ? (
                      <ActivityIndicator size="small" color="#FB923C" />
                    ) : (
                      <Ionicons name="card-outline" size={16} color="#FB923C" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={panelStyles.clientPaymentTitle}>
                      {startingPayment ? "Abriendo Wompi..." : "Pagar con Wompi"}
                    </Text>
                    <Text style={panelStyles.clientPaymentText}>
                      {PAYMENT_STATUS_LABELS[selectedPaymentStatus] || "Pago solicitado"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                {chatActionError ? (
                  <Text style={panelStyles.clientPaymentError}>
                    {chatActionError}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {loadingMessages ? (
              <View style={panelStyles.messagesLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={panelStyles.centerText}>Cargando mensajes...</Text>
              </View>
            ) : messagesError && chatMessages.length === 0 ? (
              <View style={panelStyles.chatEmptyState}>
                <View style={panelStyles.chatEmptyIcon}>
                  <Ionicons name="cloud-offline-outline" size={24} color="#F97316" />
                </View>
                <Text style={panelStyles.chatEmptyTitle}>No se pudo cargar el chat</Text>
                <Text style={panelStyles.chatEmptyText}>{messagesError}</Text>
                <TouchableOpacity
                  style={panelStyles.primaryButtonWide}
                  onPress={() => loadMessages(selectedReservation || selectedChatId, { forceLoader: true })}
                >
                  <Text style={panelStyles.primaryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={panelStyles.messagesList}
                keyboardShouldPersistTaps="handled"
              >
                {chatMessages.length === 0 ? (
                  <View style={panelStyles.chatEmptyState}>
                    <View style={panelStyles.chatEmptyIcon}>
                      <Ionicons name="chatbubble-outline" size={24} color="#94A3B8" />
                    </View>
                    <Text style={panelStyles.chatEmptyTitle}>Sin mensajes todavía</Text>
                    <Text style={panelStyles.chatEmptyText}>
                      Escribe abajo para iniciar la conversación sobre esta solicitud.
                    </Text>
                  </View>
                ) : (
                  chatMessages.map((message, index) => {
                    const system = message.senderType === "SYSTEM";
                    const mine = usesAgencyInbox
                      ? message.senderType === "AGENCY"
                      : message.senderType === "CUSTOMER";
                    return (
                      <View
                        key={String(message.id || index)}
                        style={[
                          panelStyles.messageBubble,
                          system
                            ? panelStyles.messageSystem
                            : mine
                              ? panelStyles.messageMine
                              : panelStyles.messageAgency,
                        ]}
                      >
                        <Text
                          style={[
                            panelStyles.messageSender,
                            system && panelStyles.messageSenderSystem,
                            !system && mine && panelStyles.messageSenderMine,
                          ]}
                        >
                          {system
                            ? "Sistema"
                            : mine
                              ? "Tú"
                              : usesAgencyInbox
                                ? "Cliente"
                                : "Agencia"}
                        </Text>
                        <Text
                          style={[
                            panelStyles.messageText,
                            system && panelStyles.messageTextSystem,
                            !system && mine && panelStyles.messageTextMine,
                          ]}
                        >
                          {message.message}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={panelStyles.chatInputRow}>
              <TextInput
                style={panelStyles.chatInput}
                value={messageDraft}
                multiline
                maxLength={2000}
                placeholder="Responder al chat"
                placeholderTextColor="#94A3B8"
                onChangeText={setMessageDraft}
              />
              <TouchableOpacity
                style={[
                  panelStyles.sendButton,
                  (!messageDraft.trim() || sendingMessage) && panelStyles.disabled,
                ]}
                onPress={handleSendMessage}
                disabled={!messageDraft.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={17} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );

  const renderHistory = () => (
    <View style={panelStyles.viewFill}>
      <View style={panelStyles.historyHeroCompact}>
        <Ionicons
          name={activeHistorySection === "favorites" ? "heart-outline" : "bag-check-outline"}
          size={16}
          color="#0E7490"
        />
        <Text style={panelStyles.historyHeroCompactTitle} numberOfLines={1}>
          {activeHistorySection === "favorites"
            ? "Sitios favoritos"
            : "Paquetes comprados"}
        </Text>
        <View style={panelStyles.chatCountPill}>
          <Text style={panelStyles.chatCountText}>
            {activeHistorySection === "favorites"
              ? favoritePlaces.length
              : historyPackages.length}
          </Text>
        </View>
      </View>

      <View style={panelStyles.historySwitch}>
        <TouchableOpacity
          style={[
            panelStyles.historySwitchButton,
            activeHistorySection === "purchases" && panelStyles.historySwitchButtonActive,
          ]}
          onPress={() => handleHistorySection("purchases")}
          activeOpacity={0.86}
        >
          <Ionicons
            name="bag-check-outline"
            size={14}
            color={activeHistorySection === "purchases" ? "#FFFFFF" : "#0E7490"}
          />
          <Text
            style={[
              panelStyles.historySwitchText,
              activeHistorySection === "purchases" && panelStyles.historySwitchTextActive,
            ]}
          >
            Comprados
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            panelStyles.historySwitchButton,
            activeHistorySection === "favorites" && panelStyles.historySwitchButtonActive,
          ]}
          onPress={() => handleHistorySection("favorites")}
          activeOpacity={0.86}
        >
          <Ionicons
            name="heart-outline"
            size={14}
            color={activeHistorySection === "favorites" ? "#FFFFFF" : "#0E7490"}
          />
          <Text
            style={[
              panelStyles.historySwitchText,
              activeHistorySection === "favorites" && panelStyles.historySwitchTextActive,
            ]}
          >
            Favoritos
          </Text>
        </TouchableOpacity>
      </View>

      {activeHistorySection === "favorites" ? (
        loadingFavorites ? (
          <View style={panelStyles.centerState}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={panelStyles.centerText}>Cargando favoritos...</Text>
          </View>
        ) : favoritesError ? (
          <View style={panelStyles.centerState}>
            <Ionicons name="alert-circle-outline" size={28} color="#F97316" />
            <Text style={panelStyles.centerText}>{favoritesError}</Text>
            <TouchableOpacity
              style={panelStyles.primaryButtonWide}
              onPress={() => loadFavorites({ forceLoader: true })}
            >
              <Text style={panelStyles.primaryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : favoritePlaces.length === 0 ? (
          <View style={panelStyles.centerState}>
            <Ionicons name="heart-outline" size={34} color="#94A3B8" />
            <Text style={panelStyles.centerText}>
              Guarda sitios con el corazón para encontrarlos aquí.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={panelStyles.historyList}
          >
            {favoritePlaces.map((favorite, index) => {
              const place = favorite?.place || {};
              return (
                <TouchableOpacity
                  key={String(place.id || index)}
                  style={panelStyles.favoritePlaceCard}
                  activeOpacity={0.88}
                  onPress={() => onOpenFavoritePlace?.(place)}
                >
                  <View style={panelStyles.favoritePlaceIcon}>
                    <Ionicons name="location-outline" size={17} color="#0E7490" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={panelStyles.historyTitle} numberOfLines={2}>
                      {place.name || "Sitio turístico"}
                    </Text>
                    <Text style={panelStyles.historyText} numberOfLines={2}>
                      {place.address || place.description || "Lugar guardado"}
                    </Text>
                    <Text style={panelStyles.favoritePlaceDate}>
                      Guardado {formatDate(favorite.favorited_at)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      ) : loadingHistory ? (
        <View style={panelStyles.centerState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={panelStyles.centerText}>Cargando historial...</Text>
        </View>
      ) : historyError ? (
        <View style={panelStyles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color="#F97316" />
          <Text style={panelStyles.centerText}>{historyError}</Text>
          <TouchableOpacity
            style={panelStyles.primaryButtonWide}
            onPress={() => loadHistory({ forceLoader: true })}
          >
            <Text style={panelStyles.primaryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : historyPackages.length === 0 ? (
        <View style={panelStyles.centerState}>
          <Ionicons name="bag-check-outline" size={34} color="#94A3B8" />
          <Text style={panelStyles.centerText}>
            Cuando una agencia confirme tus compras, aparecerán aquí.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={panelStyles.historyList}
        >
          {historyPackages.map((reservation) => (
            <View key={String(reservation.id)} style={panelStyles.historyPackageCard}>
              <View style={panelStyles.historyPackageTop}>
                <View style={panelStyles.historyPackageIcon}>
                  <FontAwesome name="suitcase" size={16} color="#0E7490" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={panelStyles.historyTitle} numberOfLines={2}>
                    {reservation.packageTitle || "Paquete turístico"}
                  </Text>
                  <Text style={panelStyles.historyText} numberOfLines={1}>
                    {reservation.agencyName || "Agencia turística"}
                  </Text>
                </View>
                <View style={panelStyles.confirmedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={panelStyles.confirmedBadgeText}>Confirmado</Text>
                </View>
              </View>

              <View style={panelStyles.historyMetaGrid}>
                <View style={panelStyles.historyMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={panelStyles.historyMetaText}>
                    {formatReservationDate(reservation.startDate)}
                    {reservation.endDate
                      ? ` - ${formatReservationDate(reservation.endDate)}`
                      : ""}
                  </Text>
                </View>
                <View style={panelStyles.historyMetaItem}>
                  <Ionicons name="people-outline" size={14} color="#64748B" />
                  <Text style={panelStyles.historyMetaText}>
                    {reservation.travelers || 1} persona
                    {Number(reservation.travelers || 1) === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>

              <View style={panelStyles.historyPackageFooter}>
                <View>
                  <Text style={panelStyles.historyAmountLabel}>Total</Text>
                  <Text style={panelStyles.historyAmount}>
                    {formatCurrency(reservation.totalAmount, reservation.currency || "COP")}
                  </Text>
                </View>
                <Text style={panelStyles.historyDate}>
                  {formatDate(reservation.updatedAt || reservation.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <EdgeDrawer
      side="right"
      width={panelWidth}
      open={visible}
      enabled={enabled}
      onOpen={onOpen}
      onClose={onClose}
      onMotionStart={onMotionStart}
      onMotionEnd={onMotionEnd}
      containerStyle={panelStyles.root}
      panelStyle={panelStyles.panel}
      handleTouchStyle={panelStyles.handleTouch}
      renderHandle={() => (
        <>
          <View
            pointerEvents="none"
            style={panelStyles.handle}
          />
          {unreadCount > 0 ? (
            <View style={panelStyles.handleBadge}>
              <Text style={panelStyles.handleBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </>
      )}
    >
      <KeyboardAvoidingView
        style={panelStyles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
      >
        <View style={panelStyles.header}>
          <View style={panelStyles.headerIcon}>
            <Ionicons
              name={
                activeView === "chats"
                  ? "chatbubbles-outline"
                  : activeView === "history"
                    ? "time-outline"
                    : "notifications-outline"
              }
              size={20}
              color="#0E7490"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={panelStyles.title}>
              {activeView === "chats"
                ? "Chats"
                : activeView === "history"
                  ? "Historial"
                  : "Notificaciones"}
            </Text>
            <Text style={panelStyles.subtitle}>Reservas, mensajes y actividad</Text>
          </View>
          <TouchableOpacity style={panelStyles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={21} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={panelStyles.segmented}>
          {renderSegment("notifications", "Avisos", "notifications-outline")}
          {renderSegment("chats", "Chats", "chatbubbles-outline", messageAttention)}
          {renderSegment("history", "Historial", "time-outline")}
        </View>

        {activeView === "notifications"
          ? renderNotifications()
          : activeView === "chats"
            ? renderChats()
            : renderHistory()}
      </KeyboardAvoidingView>
    </EdgeDrawer>
  );
};

const panelStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    zIndex: 1002,
    elevation: 1002,
  },
  panel: {
    width: "100%",
    height: "100%",
    paddingTop: 52,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: "rgba(248, 250, 252, 0.92)",
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: -8, height: 0 },
    elevation: 24,
  },
  content: {
    flex: 1,
  },
  handleTouch: {
    width: 48,
    height: 150,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  handle: {
    position: "absolute",
    right: 6,
    width: 11,
    height: 104,
    borderRadius: 999,
    backgroundColor: "rgba(251, 146, 60, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.64)",
    shadowColor: "#FB923C",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: -4,
      height: 0,
    },
    elevation: 10,
  },
  handleBadge: {
    position: "absolute",
    right: 0,
    top: 22,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FB923C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  handleBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  segmented: {
    flexDirection: "row",
    gap: 7,
    marginBottom: SPACING.md,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  segmentButtonActive: {
    backgroundColor: "#0E7490",
    borderColor: "#0E7490",
  },
  segmentText: {
    color: "#0E7490",
    fontSize: 11,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  segmentDot: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FB923C",
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    backgroundColor: "#FFFFFF",
    marginBottom: SPACING.md,
  },
  summaryCompact: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.12)",
    backgroundColor: "rgba(255,255,255,0.9)",
    marginBottom: SPACING.sm,
  },
  summaryCompactIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  summaryCompactLabel: {
    color: "#0E7490",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  summaryCompactTitle: {
    marginTop: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "900",
  },
  compactIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
  },
  summaryKicker: {
    color: "#0E7490",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  summaryTitle: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "900",
  },
  summaryText: {
    marginTop: 5,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  summaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.md,
  },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#0E7490",
  },
  primaryButtonWide: {
    minHeight: 40,
    minWidth: 130,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E7490",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  ghostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  listTitle: {
    color: COLORS.text,
    fontWeight: "900",
  },
  markAllText: {
    color: "#0E7490",
    fontSize: FONT_SIZES.xs,
    fontWeight: "900",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: SPACING.lg,
  },
  centerText: {
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  notificationCard: {
    flexDirection: "row",
    gap: 10,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  notificationCardUnread: {
    borderColor: "#67E8F9",
    backgroundColor: "#F0FDFA",
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  notificationType: {
    color: "#0E7490",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  notificationDate: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
  },
  notificationTitle: {
    marginTop: 3,
    color: COLORS.text,
    fontWeight: "900",
    lineHeight: 19,
  },
  notificationMessage: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#FB923C",
    marginTop: 4,
  },
  viewFill: {
    flex: 1,
  },
  chatIntro: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    marginBottom: SPACING.sm,
  },
  chatIntroCompact: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    marginBottom: SPACING.sm,
  },
  chatIntroCompactTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "900",
  },
  chatIntroIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.14)",
  },
  chatCountPill: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E7490",
  },
  chatCountText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: FONT_SIZES.xs,
  },
  viewTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "900",
  },
  viewText: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  chatTabsWrap: {
    marginBottom: SPACING.sm,
  },
  chatTabs: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: SPACING.md,
  },
  chatTab: {
    width: 132,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  chatTabActive: {
    borderColor: "#0E7490",
    backgroundColor: "#0E7490",
  },
  chatTabTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  chatStatusDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  chatStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CCFBF1",
  },
  chatStatusDotActive: {
    backgroundColor: "#FB923C",
  },
  chatTabTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 11,
  },
  chatTabTitleActive: {
    color: "#FFFFFF",
  },
  chatTabMeta: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: "700",
  },
  chatTabMetaActive: {
    color: "rgba(255,255,255,0.78)",
  },
  chatSurface: {
    flex: 1,
    minHeight: 0,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "rgba(248,250,252,0.72)",
  },
  chatHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  chatTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: FONT_SIZES.sm,
  },
  chatMeta: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 11,
  },
  chatStatusPanel: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  chatStatusInfo: {
    flex: 1,
  },
  chatStatusLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chatStatusValue: {
    marginTop: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  chatStatusError: {
    marginTop: 2,
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "700",
  },
  chatStatusButton: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0E7490",
  },
  chatStatusButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  chatStatusHint: {
    minHeight: 32,
    maxWidth: 132,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#A5F3FC",
  },
  chatStatusHintText: {
    flexShrink: 1,
    color: "#0E7490",
    fontSize: 10,
    fontWeight: "900",
  },
  clientPaymentWrap: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
  },
  clientPaymentButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#FB923C",
    shadowColor: "#FB923C",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  clientPaymentIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  clientPaymentTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  clientPaymentText: {
    marginTop: 2,
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  clientPaymentError: {
    marginTop: 6,
    color: "#B45309",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  messagesLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: "#0E7490",
  },
  messageAgency: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageSystem: {
    alignSelf: "center",
    maxWidth: "90%",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageSender: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3,
  },
  messageSenderMine: {
    color: "rgba(255,255,255,0.76)",
  },
  messageSenderSystem: {
    color: "#64748B",
    fontSize: 9,
    textAlign: "center",
  },
  messageText: {
    color: COLORS.text,
    lineHeight: 19,
  },
  messageTextMine: {
    color: "#FFFFFF",
  },
  messageTextSystem: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  chatEmptyState: {
    flex: 1,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  chatEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chatEmptyTitle: {
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontWeight: "900",
  },
  chatEmptyText: {
    marginTop: 4,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 19,
    fontSize: FONT_SIZES.xs,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "rgba(248,250,252,0.84)",
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D5E3EA",
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E7490",
  },
  disabled: {
    opacity: 0.58,
  },
  historyHero: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    marginBottom: SPACING.sm,
  },
  historyHeroCompact: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    marginBottom: SPACING.sm,
  },
  historyHeroCompactTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "900",
  },
  historyHeroIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.14)",
  },
  historySwitch: {
    flexDirection: "row",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  historySwitchButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
  },
  historySwitchButtonActive: {
    backgroundColor: "#0E7490",
    borderColor: "#0E7490",
  },
  historySwitchText: {
    color: "#0E7490",
    fontSize: 11,
    fontWeight: "900",
  },
  historySwitchTextActive: {
    color: "#FFFFFF",
  },
  historyList: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  favoritePlaceCard: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
  },
  favoritePlaceIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  favoritePlaceDate: {
    marginTop: 5,
    color: "#0E7490",
    fontSize: 10,
    fontWeight: "900",
  },
  historyPackageCard: {
    padding: SPACING.md,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.12)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  historyPackageTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  historyPackageIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  historyTitle: {
    color: COLORS.text,
    fontWeight: "900",
  },
  historyText: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  confirmedBadge: {
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  confirmedBadgeText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "900",
  },
  historyMetaGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.md,
  },
  historyMetaItem: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  historyMetaText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "800",
  },
  historyPackageFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  historyAmountLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  historyAmount: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "900",
  },
  historyDate: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
});

export default React.memo(NotificationPanel);
