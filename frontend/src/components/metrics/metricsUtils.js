export const METRICS_PERIOD_OPTIONS = [
  { key: "7d", label: "7 dana" },
  { key: "month", label: "Mesec" },
];

export const toDateOnly = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

export const toYmd = (value) => {
  const date = toDateOnly(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const getPeriodBounds = (granularity, anchorDate) => {
  const anchor = toDateOnly(anchorDate);

  if (granularity === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start: toYmd(start), end: toYmd(end) };
  }

  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);

  return { start: toYmd(start), end: toYmd(end) };
};

export const shiftMetricsAnchor = (currentAnchor, granularity, direction) => {
  const date = toDateOnly(currentAnchor);
  const step = direction >= 0 ? 1 : -1;

  if (granularity === "month") {
    date.setMonth(date.getMonth() + step);
  } else {
    date.setDate(date.getDate() + 7 * step);
  }

  return toYmd(date);
};

export const formatMetricsPeriodTitle = (granularity, anchorDate) => {
  const anchor = toDateOnly(anchorDate);

  if (granularity === "month") {
    return anchor.toLocaleDateString("sr-RS", {
      month: "long",
      year: "numeric",
    });
  }

  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);

  return `${start.toLocaleDateString("sr-RS")} - ${end.toLocaleDateString("sr-RS")}`;
};

export const formatKg = (value) => {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${numeric.toFixed(2)} kg`;
};

export const formatDateTimeInputValue = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

export const formatDelta = (value) => {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return "-";
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)} kg`;
};

export const formatDeltaPercent = (value) => {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return "-";
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
};
