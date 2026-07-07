import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getAgencyReservationById,
  getAgencyReservationMessages,
  getAgencyReservations,
  sendAgencyReservationMessage,
  updateAgencyReservationStatus,
} from "../services/api";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";

const STATUS_LABELS = {
  requested: "Solicitada",
  contacted: "Contactada",
  awaiting_payment: "Esperando pago",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
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
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    reservation: null,
    nextStatus: "",
    notes: "",
  });

  const params = useMemo(() => ({ status, page: 0, size: 20 }), [status]);

  const loadReservations = useCallback(async () => {
    setError("");
    try {
      const response = await getAgencyReservations(params, { agencyId });
      setReservations(extractItems(response));
    } catch (err) {
      setError(err?.response?.data?.message || "No pudimos cargar las solicitudes.");
    }
  }, [agencyId, params]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  }, [loadReservations]);

  const loadMessages = useCallback(async (reservationId) => {
    if (!reservationId) return;

    setMessagesLoading(true);

    try {
      const response = await getAgencyReservationMessages(
        reservationId,
        {
          page: 0,
          size: 50,
        },
        { agencyId },
      );

      setMessages(orderChatMessages(extractItems(response)));
    } catch (_err) {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [agencyId]);

  const openDetail = useCallback(
    async (reservation) => {
      if (!reservation?.id) return;

      setDetailVisible(true);
      setSelectedReservation(reservation);
      setMessages([]);
      setMessageText("");
      setDetailLoading(true);

      try {
        const response = await getAgencyReservationById(reservation.id, { agencyId });
        const detail = extractReservation(response);

        setSelectedReservation(detail);
        await loadMessages(reservation.id);
      } catch (err) {
        Alert.alert(
          "No se pudo cargar",
          err?.response?.data?.message || "Intenta nuevamente.",
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [agencyId, loadMessages],
  );

  const closeDetail = () => {
    setDetailVisible(false);
    setSelectedReservation(null);
    setMessages([]);
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
    if (!reservation?.id || !nextStatus) return;

    setUpdatingId(reservation.id);

    try {
      const response = await updateAgencyReservationStatus(
        reservation.id,
        nextStatus,
        notes.trim(),
        { agencyId },
      );
      const updated = extractReservation(response);

      setSelectedReservation((prev) =>
        prev?.id === updated?.id ? updated : prev,
      );
      await loadReservations();
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
      setMessageText("");
      const [detailResult] = await Promise.allSettled([
        getAgencyReservationById(selectedReservation.id, { agencyId }),
        loadMessages(selectedReservation.id),
        loadReservations(),
      ]);

      if (detailResult.status === "fulfilled") {
        setSelectedReservation(extractReservation(detailResult.value));
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome name="inbox" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{error || "No hay solicitudes en este estado."}</Text>
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
            ) : (
              <ScrollView contentContainerStyle={styles.detailContent}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxTitle}>Cliente</Text>
                  <Text style={styles.detailBoxText}>{selectedReservation?.customerEmail || "-"}</Text>
                  <Text style={styles.detailBoxText}>{selectedReservation?.customerPhone || "Sin telefono"}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxTitle}>Estado y pago</Text>
                  <Text style={styles.detailBoxText}>
                    {STATUS_LABELS[selectedReservation?.status] || selectedReservation?.status || "-"}
                  </Text>
                  <Text style={styles.detailBoxText}>
                    {selectedReservation?.paymentStatus || "pending"} · {selectedReservation?.paymentProvider || "agency_managed"}
                  </Text>
                  {selectedReservation?.agencyNotes ? (
                    <Text style={styles.message}>{selectedReservation.agencyNotes}</Text>
                  ) : null}
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxTitle}>Mensajeria interna</Text>
                  {messagesLoading ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : messages.length === 0 ? (
                    <Text style={styles.chatEmptyText}>Aun no hay mensajes.</Text>
                  ) : (
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
