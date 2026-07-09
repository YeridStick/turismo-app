import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, ENDPOINTS } from "../../../config/api.config";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../services/api";
import {
  buildRequestKey,
  createInFlightDeduper,
  extractArrayPayload,
} from "../../../utils/requestHelpers";

const NOTIFICATION_STREAM_EVENTS = [
  "RESERVATION_REQUEST_CREATED",
  "RESERVATION_MESSAGE",
  "RESERVATION_STATUS_CHANGED",
];

const normalizeNotification = (item) => {
  const payload = item?.payload || item?.metadata || {};

  return {
    ...item,
    id: item?.id ?? item?.notificationId,
    type: item?.type || item?.eventType || payload?.type,
    title:
      item?.title ||
      payload?.title ||
      (item?.type === "RESERVATION_STATUS_CHANGED"
        ? "Estado de reserva actualizado"
        : item?.type === "RESERVATION_MESSAGE"
          ? "Nuevo mensaje de reserva"
          : "Notificación"),
    message:
      item?.message ||
      item?.body ||
      payload?.message ||
      payload?.body ||
      "Hay una actualización en tus solicitudes.",
    read: Boolean(item?.read ?? item?.readAt),
    recipientEmail:
      item?.recipientEmail ||
      item?.recipient_email ||
      payload?.recipientEmail ||
      payload?.recipient_email,
    reservationId:
      item?.reservationId ||
      item?.reservation_id ||
      payload?.reservationId ||
      payload?.reservation_id,
    agencyId:
      item?.agencyId ||
      item?.agency_id ||
      payload?.agencyId ||
      payload?.agency_id,
    createdAt: item?.createdAt || item?.created_at || payload?.createdAt,
  };
};

const mergeNotification = (items, incoming) => {
  const normalized = normalizeNotification(incoming);
  if (!normalized.id) return [normalized, ...items];

  const filtered = items.filter((item) => String(item.id) !== String(normalized.id));
  return [normalized, ...filtered];
};

const useNotifications = ({ enabled = false, accountKey = "" } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const eventSourceRef = useRef(null);
  const pollingRef = useRef(null);
  const notificationsRequestSeqRef = useRef(0);
  const requestDeduper = useMemo(() => createInFlightDeduper(), []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const loadNotifications = useCallback(async ({ unreadOnly = false } = {}) => {
    if (!enabled) return;

    setLoadingNotifications(true);
    setNotificationError("");
    const requestSeq = notificationsRequestSeqRef.current + 1;
    notificationsRequestSeqRef.current = requestSeq;

    try {
      const params = {
        unreadOnly,
        page: 0,
        size: 30,
      };
      const requestKey = buildRequestKey({
        endpoint: ENDPOINTS.NOTIFICATIONS,
        params,
        scope: { accountKey },
      });
      const response = await requestDeduper.run(requestKey, () =>
        getNotifications(params),
      );

      if (requestSeq === notificationsRequestSeqRef.current) {
        setNotifications(extractArrayPayload(response).map(normalizeNotification));
      }
    } catch (err) {
      if (requestSeq === notificationsRequestSeqRef.current) {
        setNotificationError(
          err?.response?.data?.message ||
            "No pudimos cargar tus notificaciones.",
        );
      }
    } finally {
      if (requestSeq === notificationsRequestSeqRef.current) {
        setLoadingNotifications(false);
      }
    }
  }, [accountKey, enabled, requestDeduper]);

  const markAsRead = useCallback(async (notification) => {
    if (!notification?.id) return;

    notificationsRequestSeqRef.current += 1;
    requestDeduper.clear();
    setLoadingNotifications(false);
    setNotifications((prev) =>
      prev.map((item) =>
        String(item.id) === String(notification.id)
          ? { ...item, read: true }
          : item,
      ),
    );

    try {
      await markNotificationRead(notification.id);
    } catch (_err) {
      // La UI queda optimista; el siguiente refresh reconcilia con backend.
    }
  }, [requestDeduper]);

  const markAllAsRead = useCallback(async () => {
    notificationsRequestSeqRef.current += 1;
    requestDeduper.clear();
    setLoadingNotifications(false);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await markAllNotificationsRead();
    } catch (_err) {
      loadNotifications();
    }
  }, [loadNotifications, requestDeduper]);

  useEffect(() => {
    if (!enabled) {
      notificationsRequestSeqRef.current += 1;
      setNotifications([]);
      setLoadingNotifications(false);
      return undefined;
    }

    setNotifications([]);
    loadNotifications();

    return undefined;
  }, [accountKey, enabled, loadNotifications]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const startPollingFallback = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => loadNotifications(), 30000);
    };

    const startStream = async () => {
      const EventSourceImpl = globalThis.EventSource;

      if (!EventSourceImpl) {
        startPollingFallback();
        return;
      }

      try {
        const token = await AsyncStorage.getItem("token");
        if (cancelled) return;

        const streamUrl = `${API_BASE_URL}${ENDPOINTS.NOTIFICATIONS_STREAM}`;
        const source = new EventSourceImpl(streamUrl, token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : undefined);

        eventSourceRef.current = source;

        const handleStreamEvent = (event) => {
          try {
            const data = JSON.parse(event.data);
            setNotifications((prev) => mergeNotification(prev, data));
          } catch (_err) {
            loadNotifications();
          }
        };

        source.onmessage = handleStreamEvent;

        NOTIFICATION_STREAM_EVENTS.forEach((eventName) => {
          source.addEventListener?.(eventName, handleStreamEvent);
        });

        source.onerror = () => {
          source.close?.();
          eventSourceRef.current = null;
          startPollingFallback();
        };
      } catch (_err) {
        startPollingFallback();
      }
    };

    startStream();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close?.();
      eventSourceRef.current = null;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [accountKey, enabled, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loadingNotifications,
    notificationError,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
