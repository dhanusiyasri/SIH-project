const TIME_ZONE = "Asia/Kolkata";

export function parseBackendTimestamp(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === "") {
    return null;
  }

  let value = String(timestamp).trim();

  // Older API records are timezone-naive but are stored in UTC.
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    value += "Z";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(timestamp) {
  const date = parseBackendTimestamp(timestamp);

  if (!date) return "--";

  return date.toLocaleTimeString("en-IN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
