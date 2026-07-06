import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getMyReservations,
  getReservationMessages,
  sendReservationMessage,
} from "../../../services/api";
import { COLORS, FONT_SIZES, SPACING } from "../../../utils/constants";

const FINAL_STATUSES = ["confirmed", "rejected", "cancelled"];

const STATUS_LABELS = {
  requested: "Solicitada",
  contacted: "Contactada",
  awaiting_payment: "Esperando pago",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const TYPE_META = {
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

const hasMessageNotification = (notifications) => {
  return notifications.some(
    (item) => item.type === "RESERVATION_MESSAGE" && !item.read,
  );
};

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
  panelTranslateX,
  panelWidth,
  handlePanHandlers,
}) => {
  const [activeView, setActiveView] = useState("notifications");
  const [chatReservations, setChatReservations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const backdropOpacity = useMemo(() => {
    if (!panelTranslateX || !panelWidth) return 1;

    return panelTranslateX.interpolate({
      inputRange: [0, panelWidth],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
  }, [panelTranslateX, panelWidth]);

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

  const loadMessages = useCallback(async (reservationId) => {
    if (!reservationId) {
      setChatMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const response = await getReservationMessages(reservationId, {
        page: 0,
        size: 60,
      });
      setChatMessages(extractItems(response));
    } catch (_err) {
      setChatMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setChatError("");

    try {
      const response = await getMyReservations({ page: 0, size: 50 });
      const activeChats = extractItems(response).filter(
        (reservation) => !FINAL_STATUSES.includes(reservation.status),
      );

      setChatReservations(activeChats);
      const nextSelected =
        activeChats.find((item) => String(item.id) === String(selectedChatId)) ||
        activeChats[0];
      setSelectedChatId(nextSelected?.id || null);
      await loadMessages(nextSelected?.id);
    } catch (err) {
      setChatError(
        err?.response?.data?.message ||
          "No pudimos cargar tus chats de reserva.",
      );
    } finally {
      setLoadingChats(false);
    }
  }, [loadMessages, selectedChatId]);

  useEffect(() => {
    if (visible && activeView === "chats") {
      loadChats();
    }
  }, [activeView, loadChats, visible]);

  const handleOpenNotification = (notification) => {
    onMarkRead?.(notification);
    if (notification.type === "RESERVATION_MESSAGE") {
      setActiveView("chats");
      return;
    }
    onOpenReservations?.(notification);
  };

  const handleSelectChat = async (reservation) => {
    setSelectedChatId(reservation.id);
    setMessageDraft("");
    await loadMessages(reservation.id);
  };

  const handleSendMessage = async () => {
    const text = messageDraft.trim();
    if (!selectedReservation?.id || !text || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendReservationMessage(selectedReservation.id, text);
      setMessageDraft("");
      await loadMessages(selectedReservation.id);
    } catch (_err) {
      setChatError("No pudimos enviar el mensaje. Intenta nuevamente.");
    } finally {
      setSendingMessage(false);
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
      <View style={panelStyles.summaryCard}>
        <Text style={panelStyles.summaryKicker}>Seguimiento</Text>
        <Text style={panelStyles.summaryTitle}>
          {unreadCount > 0
            ? `${unreadCount} actualización${unreadCount === 1 ? "" : "es"} sin leer`
            : "Todo está al día"}
        </Text>
        <Text style={panelStyles.summaryText}>
          Aquí verás cuando una agencia responda, solicite pago o confirme tu reserva.
        </Text>
        <View style={panelStyles.summaryActions}>
          <TouchableOpacity
            style={panelStyles.primaryButton}
            onPress={() => setActiveView("chats")}
          >
            <Ionicons name="chatbubbles-outline" size={15} color="#FFFFFF" />
            <Text style={panelStyles.primaryButtonText}>Ir a chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={panelStyles.ghostButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={15} color="#0E7490" />
          </TouchableOpacity>
        </View>
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
      <View style={panelStyles.chatIntro}>
        <Text style={panelStyles.viewTitle}>Chats de solicitudes</Text>
        <Text style={panelStyles.viewText}>
          Muévete entre paquetes y agencias con solicitudes activas. Los chats cerrados desaparecen de esta vista.
        </Text>
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
                  <Text
                    style={[panelStyles.chatTabTitle, active && panelStyles.chatTabTitleActive]}
                    numberOfLines={1}
                  >
                    {reservation.packageTitle || "Paquete"}
                  </Text>
                  <Text
                    style={[panelStyles.chatTabMeta, active && panelStyles.chatTabMetaActive]}
                    numberOfLines={1}
                  >
                    {STATUS_LABELS[reservation.status] || reservation.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={panelStyles.chatSurface}>
            <View style={panelStyles.chatHeader}>
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
              <TouchableOpacity style={panelStyles.ghostButton} onPress={() => loadMessages(selectedChatId)}>
                <Ionicons name="refresh" size={15} color="#0E7490" />
              </TouchableOpacity>
            </View>

            {loadingMessages ? (
              <View style={panelStyles.messagesLoading}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={panelStyles.messagesList}
              >
                {chatMessages.length === 0 ? (
                  <Text style={panelStyles.centerText}>
                    Aún no hay mensajes en esta solicitud.
                  </Text>
                ) : (
                  chatMessages.map((message, index) => {
                    const mine = message.senderType === "CUSTOMER";
                    return (
                      <View
                        key={String(message.id || index)}
                        style={[
                          panelStyles.messageBubble,
                          mine ? panelStyles.messageMine : panelStyles.messageAgency,
                        ]}
                      >
                        <Text style={panelStyles.messageSender}>
                          {mine ? "Tú" : "Agencia"}
                        </Text>
                        <Text style={panelStyles.messageText}>{message.message}</Text>
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
      <View style={panelStyles.historyHero}>
        <Ionicons name="time-outline" size={28} color="#0E7490" />
        <Text style={panelStyles.viewTitle}>Historial turístico</Text>
        <Text style={panelStyles.viewText}>
          Esta vista queda lista para mostrar paquetes comprados, reservas completadas y sitios favoritos cuando el backend exponga el servicio.
        </Text>
      </View>

      <View style={panelStyles.historyCard}>
        <FontAwesome name="suitcase" size={18} color="#0E7490" />
        <View style={{ flex: 1 }}>
          <Text style={panelStyles.historyTitle}>Paquetes comprados</Text>
          <Text style={panelStyles.historyText}>Próximamente desde historial de pagos y reservas confirmadas.</Text>
        </View>
      </View>

      <View style={panelStyles.historyCard}>
        <FontAwesome name="heart-o" size={18} color="#FB923C" />
        <View style={{ flex: 1 }}>
          <Text style={panelStyles.historyTitle}>Sitios favoritos</Text>
          <Text style={panelStyles.historyText}>Espacio preparado para favoritos y visitas guardadas.</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View
      style={panelStyles.root}
      pointerEvents={enabled || visible ? "box-none" : "none"}
    >
      {enabled ? (
        <Animated.View
          {...(handlePanHandlers || {})}
          style={[
            panelStyles.handlePress,
            {
              transform: [
                {
                  translateX:
                    panelTranslateX && panelWidth
                      ? panelTranslateX.interpolate({
                          inputRange: [0, panelWidth],
                          outputRange: [-(panelWidth - 13), 0],
                          extrapolate: "clamp",
                        })
                      : 0,
                },
              ],
            },
          ]}
        >
          <Pressable
            style={panelStyles.handleTouch}
            onPress={visible ? onClose : onOpen}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                panelStyles.handle,
                {
                  backgroundColor: visible
                    ? "rgba(14, 116, 144, 0.56)"
                    : "rgba(251, 146, 60, 0.62)",
                },
              ]}
            />
            {unreadCount > 0 ? (
              <View style={panelStyles.handleBadge}>
                <Text style={panelStyles.handleBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      ) : null}

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Animated.View
          style={[
            panelStyles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
      </Pressable>

      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[
          panelStyles.panel,
          panelWidth ? { width: panelWidth } : null,
          {
            transform: [{ translateX: panelTranslateX || 0 }],
          },
        ]}
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
      </Animated.View>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    zIndex: 1002,
    elevation: 1002,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  panel: {
    width: "90%",
    maxWidth: 410,
    height: "100%",
    paddingTop: 52,
    paddingHorizontal: SPACING.lg,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: -8, height: 0 },
    elevation: 24,
  },
  handlePress: {
    position: "absolute",
    right: 0,
    top: "50%",
    width: 48,
    height: 150,
    marginTop: -75,
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1004,
    elevation: 1004,
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
    padding: SPACING.md,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: SPACING.sm,
  },
  viewTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "900",
  },
  viewText: {
    marginTop: 5,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  chatTabs: {
    gap: 8,
    paddingVertical: SPACING.sm,
  },
  chatTab: {
    width: 150,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  chatTabActive: {
    borderColor: "#0E7490",
    backgroundColor: "#ECFEFF",
  },
  chatTabTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 12,
  },
  chatTabTitleActive: {
    color: "#0E7490",
  },
  chatTabMeta: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "700",
  },
  chatTabMetaActive: {
    color: "#0E7490",
  },
  chatSurface: {
    flex: 1,
    minHeight: 360,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  chatTitle: {
    color: COLORS.text,
    fontWeight: "900",
  },
  chatMeta: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 11,
  },
  messagesLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    gap: 8,
    padding: SPACING.md,
  },
  messageBubble: {
    maxWidth: "88%",
    padding: 10,
    borderRadius: 13,
  },
  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: "#ECFEFF",
  },
  messageAgency: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
  },
  messageSender: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3,
  },
  messageText: {
    color: COLORS.text,
    lineHeight: 19,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  chatInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E7490",
  },
  disabled: {
    opacity: 0.58,
  },
  historyHero: {
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: SPACING.md,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: SPACING.md,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: SPACING.sm,
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
});

export default React.memo(NotificationPanel);
