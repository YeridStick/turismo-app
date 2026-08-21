const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidReservationDate = (value) => {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value.trim())) return false;
  const [year, month, day] = value.trim().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const validateReservationInput = ({
  packageId,
  startDate,
  endDate,
  travelers,
  contactPreference,
  consentAccepted,
}) => {
  if (packageId == null || String(packageId).trim() === "") return "package";
  if (!isValidReservationDate(startDate)) return "startDate";
  if (endDate && !isValidReservationDate(endDate)) return "endDate";
  if (!Number.isInteger(travelers) || travelers < 1) return "travelers";
  if (!["EMAIL", "IN_APP"].includes(contactPreference)) return "contactPreference";
  if (consentAccepted !== true) return "consent";
  return null;
};
