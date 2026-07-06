import { useCallback, useMemo, useState } from "react";
import { createReservation } from "../../../services/api";

const CONSENT_VERSION = "2026-07-04";

const getDefaultStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const extractErrorMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (typeof first?.message === "string") return first.message;
  }
  return "No se pudo crear la solicitud de reserva.";
};

const initialForm = () => ({
  startDate: getDefaultStartDate(),
  endDate: "",
  travelers: "1",
  contactPreference: "EMAIL",
  customerPhone: "",
  message: "Deseo confirmar disponibilidad",
  consentAccepted: false,
  consentVersion: CONSENT_VERSION,
});

const useReservation = ({
  user,
  onRequireAuth,
  onRequireVerification,
  onReservationCreated,
  onOpenReservations,
} = {}) => {
  const [reservationVisible, setReservationVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [reservationForm, setReservationForm] = useState(initialForm);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationStatusModal, setReservationStatusModal] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    onConfirm: null,
  });

  const closeReservationStatusModal = useCallback(() => {
    setReservationStatusModal((prev) => ({ ...prev, visible: false, onConfirm: null }));
  }, []);

  const showReservationStatusModal = useCallback((config) => {
    setReservationStatusModal({
      visible: true,
      type: "info",
      confirmText: "Entendido",
      onConfirm: null,
      ...config,
    });
  }, []);

  const requireReadyUser = useCallback(() => {
    if (!user?.email) {
      showReservationStatusModal({
        type: "warning",
        title: "Inicia sesion para reservar",
        message: "Para enviar una solicitud de reserva necesitamos identificarte con tu cuenta. Asi la agencia recibira tus datos desde tu sesion segura.",
        confirmText: "Iniciar sesion",
        onConfirm: () => {
          closeReservationStatusModal();
          onRequireAuth?.();
        },
      });
      return false;
    }

    if (user.emailVerified !== true) {
      showReservationStatusModal({
        type: "warning",
        title: "Verifica tu correo",
        message: "Antes de solicitar una reserva debes verificar tu correo. Esto permite que la agencia pueda contactarte con confianza.",
        confirmText: "Verificar correo",
        onConfirm: () => {
          closeReservationStatusModal();
          onRequireVerification?.();
        },
      });
      return false;
    }

    return true;
  }, [
    closeReservationStatusModal,
    onRequireAuth,
    onRequireVerification,
    showReservationStatusModal,
    user,
  ]);

  const handleReservationChange = useCallback((field, value) => {
    setReservationForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const openReservation = useCallback((pkg) => {
    if (!requireReadyUser()) return;
    setSelectedPackage(pkg);
    setReservationForm(initialForm());
    setReservationVisible(true);
  }, [requireReadyUser]);

  const closeReservation = useCallback(() => {
    if (reservationLoading) return;
    setReservationVisible(false);
    setReservationForm(initialForm());
  }, [reservationLoading]);

  const submitReservation = useCallback(async () => {
    if (!requireReadyUser()) return;

    if (!selectedPackage?.id) {
      showReservationStatusModal({
        type: "error",
        title: "Paquete no disponible",
        message: "No encontramos el identificador del paquete. Vuelve al catalogo e intenta de nuevo.",
      });
      return;
    }

    const travelers = Number(reservationForm.travelers);
    const startDate = reservationForm.startDate?.trim();
    const endDate = reservationForm.endDate?.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || "")) {
      showReservationStatusModal({
        type: "warning",
        title: "Fecha requerida",
        message: "Ingresa la fecha de inicio con formato AAAA-MM-DD.",
      });
      return;
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      showReservationStatusModal({
        type: "warning",
        title: "Fecha final invalida",
        message: "Ingresa la fecha final con formato AAAA-MM-DD.",
      });
      return;
    }
    if (!Number.isInteger(travelers) || travelers < 1) {
      showReservationStatusModal({
        type: "warning",
        title: "Viajeros requeridos",
        message: "Ingresa al menos 1 viajero para continuar con la solicitud.",
      });
      return;
    }
    if (!["EMAIL", "IN_APP"].includes(reservationForm.contactPreference)) {
      showReservationStatusModal({
        type: "warning",
        title: "Canal invalido",
        message: "Selecciona Email o Notificaciones en la app como preferencia de contacto.",
      });
      return;
    }
    if (!reservationForm.consentAccepted) {
      showReservationStatusModal({
        type: "warning",
        title: "Consentimiento requerido",
        message: "Debes aceptar el tratamiento de datos para que la agencia pueda gestionar tu solicitud.",
      });
      return;
    }

    const payload = {
      tourPackageId: selectedPackage.id,
      startDate,
      travelers,
      contactPreference: reservationForm.contactPreference,
      consentAccepted: true,
      consentVersion: reservationForm.consentVersion,
    };

    if (endDate) payload.endDate = endDate;
    if (reservationForm.message?.trim()) payload.message = reservationForm.message.trim();
    if (reservationForm.customerPhone?.trim()) payload.customerPhone = reservationForm.customerPhone.trim();

    setReservationLoading(true);
    try {
      const response = await createReservation(payload);
      const reservation = response.data?.data || response.data;
      setReservationVisible(false);
      setReservationForm(initialForm());
      showReservationStatusModal({
        type: "success",
        title: "Solicitud enviada",
        message:
        reservation?.id
          ? `La agencia recibio tu solicitud. Puedes verla en Mis reservas para seguir el estado. Codigo: ${reservation.id}`
          : "La agencia recibio tu solicitud. Puedes verla en Mis reservas para seguir el estado.",
        confirmText: "Ver mis reservas",
        onConfirm: () => {
          closeReservationStatusModal();
          onOpenReservations?.(reservation);
        },
      });
      onReservationCreated?.(reservation);
    } catch (error) {
      showReservationStatusModal({
        type: error?.response?.status === 401 ? "warning" : "error",
        title: error?.response?.status === 401 ? "Sesion requerida" : "No se pudo reservar",
        message:
          error?.response?.status === 401
            ? "Tu sesion no esta activa. Inicia sesion nuevamente para enviar la solicitud de reserva."
            : extractErrorMessage(error),
        confirmText: error?.response?.status === 401 ? "Iniciar sesion" : "Entendido",
        onConfirm:
          error?.response?.status === 401
            ? () => {
                closeReservationStatusModal();
                onRequireAuth?.();
              }
            : null,
      });
    } finally {
      setReservationLoading(false);
    }
  }, [
    closeReservationStatusModal,
    onRequireAuth,
    onOpenReservations,
    onReservationCreated,
    requireReadyUser,
    reservationForm,
    selectedPackage,
    showReservationStatusModal,
  ]);

  return useMemo(
    () => ({
      reservationVisible,
      setReservationVisible,
      selectedPackage,
      setSelectedPackage,
      reservationForm,
      setReservationForm,
      reservationLoading,
      reservationStatusModal,
      handleReservationChange,
      openReservation,
      closeReservation,
      closeReservationStatusModal,
      submitReservation,
    }),
    [
      closeReservation,
      closeReservationStatusModal,
      handleReservationChange,
      openReservation,
      reservationForm,
      reservationLoading,
      reservationStatusModal,
      reservationVisible,
      selectedPackage,
      submitReservation,
    ],
  );
};

export default useReservation;
