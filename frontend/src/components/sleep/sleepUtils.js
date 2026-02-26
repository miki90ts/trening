export const SLEEP_PERIOD_OPTIONS = [
  { key: "7d", label: "7 dana" },
  { key: "month", label: "Mesec" },
  { key: "year", label: "Godina" },
];

export const SLEEP_PHASES = [
  { key: "deep", label: "Deep", color: "#3b82f6", emoji: "🌊" },
  { key: "light", label: "Light", color: "#60a5fa", emoji: "💤" },
  { key: "rem", label: "REM", color: "#a78bfa", emoji: "🧠" },
  { key: "awake", label: "Awake", color: "#f59e0b", emoji: "👁️" },
];

export const toYmd = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

export const shiftSleepAnchor = (currentAnchor, granularity, direction) => {
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

export const formatSleepPeriodTitle = (granularity, anchorDate) => {
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

/** Format minutes as "Xh Ym" */
export const formatDuration = (min) => {
  if (min == null || !Number.isFinite(Number(min))) return "-";
  const m = Number(min);
  const h = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (h === 0) return `${mins}min`;
  return `${h}h ${mins}m`;
};

/** Format time string HH:MM */
export const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  return timeStr.slice(0, 5);
};

/** Format number with locale */
export const formatNumber = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("sr-RS");
};

/** Format quality percentage */
export const formatQuality = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return `${Number(value).toFixed(0)}%`;
};

/** Calculate total phase minutes */
export const getPhasesTotal = (row) => {
  const a = parseInt(row.awake_min) || 0;
  const r = parseInt(row.rem_min) || 0;
  const l = parseInt(row.light_min) || 0;
  const d = parseInt(row.deep_min) || 0;
  return a + r + l + d;
};

/** Calculate phase percentages */
export const getPhasePercentages = (row) => {
  const total = getPhasesTotal(row);
  if (total === 0) return null;
  return {
    awake: Math.round(((parseInt(row.awake_min) || 0) / total) * 100),
    rem: Math.round(((parseInt(row.rem_min) || 0) / total) * 100),
    light: Math.round(((parseInt(row.light_min) || 0) / total) * 100),
    deep: Math.round(((parseInt(row.deep_min) || 0) / total) * 100),
  };
};

/** Compute bedtime from HH:MM string as a sortable minute number */
export const bedtimeToMinutes = (bt) => {
  if (!bt) return null;
  const [h, m] = bt.split(":").map(Number);
  // Treat anything after noon as PM (evening), before noon as AM (after midnight)
  return h >= 12 ? (h - 12) * 60 + m : (h + 12) * 60 + m;
};
