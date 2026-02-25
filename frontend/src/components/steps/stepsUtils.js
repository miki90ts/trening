export const STEPS_PERIOD_OPTIONS = [
  { key: "7d", label: "7 dana" },
  { key: "month", label: "Mesec" },
  { key: "year", label: "Godina" },
];

export const toYmd = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const getPeriodBounds = (granularity, anchorDate) => {
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);

  if (granularity === "year") {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear(), 11, 31);
    return { start: toYmd(start), end: toYmd(end) };
  }
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

export const shiftStepsAnchor = (currentAnchor, granularity, direction) => {
  const date = new Date(currentAnchor);
  date.setHours(0, 0, 0, 0);
  const step = direction >= 0 ? 1 : -1;

  if (granularity === "year") {
    date.setFullYear(date.getFullYear() + step);
  } else if (granularity === "month") {
    date.setMonth(date.getMonth() + step);
  } else {
    date.setDate(date.getDate() + 7 * step);
  }
  return toYmd(date);
};

export const formatStepsPeriodTitle = (granularity, anchorDate) => {
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);

  if (granularity === "year") {
    return `${anchor.getFullYear()}`;
  }
  if (granularity === "month") {
    return anchor.toLocaleDateString("sr-RS", { month: "long", year: "numeric" });
  }
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);
  return `${start.toLocaleDateString("sr-RS")} - ${end.toLocaleDateString("sr-RS")}`;
};

export const formatNumber = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("sr-RS");
};

export const formatMeters = (meters) => {
  if (meters == null) return "-";
  const m = Number(meters);
  if (!Number.isFinite(m)) return "-";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
};
