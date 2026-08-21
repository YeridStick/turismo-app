export const PAYMENT_PENDING_STATUSES = [
  "pending",
  "checkout_created",
  "processing",
];

export const PAYMENT_TERMINAL_STATUSES = [
  "paid",
  "failed",
  "expired",
  "cancelled",
  "verified_by_agency",
  "refunded",
];

export const isPaymentPending = (status) =>
  PAYMENT_PENDING_STATUSES.includes(String(status || "").toLowerCase());

export const isPaymentTerminal = (status) =>
  PAYMENT_TERMINAL_STATUSES.includes(String(status || "").toLowerCase());

export const extractPaymentStatus = (payload) => {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  return data && typeof data === "object" ? data : {};
};

export const mergePaymentSnapshot = (reservation, snapshot) => {
  if (!reservation || !snapshot) return reservation;

  return {
    ...reservation,
    status: snapshot.reservationStatus || reservation.status,
    paymentProvider: snapshot.paymentProvider || reservation.paymentProvider,
    paymentStatus: snapshot.paymentStatus || reservation.paymentStatus,
    paymentId: snapshot.providerTransactionId || reservation.paymentId,
    paidAt: snapshot.paidAt || reservation.paidAt,
  };
};

export const shouldAcceptPaymentSnapshot = (currentStatus, nextStatus) => {
  if (!nextStatus) return false;
  if (!isPaymentTerminal(currentStatus)) return true;
  return String(currentStatus).toLowerCase() === String(nextStatus).toLowerCase();
};

