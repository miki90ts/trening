export const PERIOD_OPTIONS = [
  { key: "week", label: "Nedelja" },
  { key: "month", label: "Mesec" },
  { key: "year", label: "Godina" },
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

const startOfWeekMonday = (value) => {
  const date = toDateOnly(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const endOfWeekSunday = (value) => {
  const start = startOfWeekMonday(value);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
};

const startOfMonth = (value) => {
  const date = toDateOnly(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (value) => {
  const date = toDateOnly(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const formatShortDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};

export const formatMonthLabel = (monthStr) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Maj",
    "Jun",
    "Jul",
    "Avg",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
  ];

  if (!monthStr) return "-";
  if (monthStr.includes("-")) {
    const parts = monthStr.split("-");
    const m = parseInt(parts[1], 10);
    return months[m - 1] || monthStr;
  }

  const date = new Date(monthStr);
  if (!Number.isNaN(date.getTime())) return months[date.getMonth()];
  return monthStr;
};

export const formatPeriodTitle = (granularity, anchorDate) => {
  const date = toDateOnly(anchorDate);

  if (granularity === "week") {
    const start = startOfWeekMonday(date);
    const end = endOfWeekSunday(date);
    return `${start.toLocaleDateString("sr-RS")} - ${end.toLocaleDateString("sr-RS")}`;
  }

  if (granularity === "month") {
    return date.toLocaleDateString("sr-RS", {
      month: "long",
      year: "numeric",
    });
  }

  return `${date.getFullYear()}.`;
};

export const shiftAnchor = (currentAnchor, granularity, direction) => {
  const date = toDateOnly(currentAnchor);
  const step = direction >= 0 ? 1 : -1;

  if (granularity === "week") {
    date.setDate(date.getDate() + 7 * step);
  } else if (granularity === "month") {
    date.setMonth(date.getMonth() + step);
  } else {
    date.setFullYear(date.getFullYear() + step);
  }

  return toYmd(date);
};

export const getPeriodBounds = (granularity, anchorDate) => {
  const date = toDateOnly(anchorDate);

  if (granularity === "week") {
    const start = startOfWeekMonday(date);
    const end = endOfWeekSunday(date);
    return { start, end };
  }

  if (granularity === "month") {
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  }

  return {
    start: new Date(date.getFullYear(), 0, 1),
    end: new Date(date.getFullYear(), 11, 31),
  };
};

export const formatScore = (score, type, hasW) => {
  if (hasW) return `${parseFloat(score)} vol`;
  if (type === "seconds") return `${parseFloat(score)}s`;
  if (type === "minutes") return `${parseFloat(score)}min`;
  if (type === "meters") return `${parseFloat(score)}m`;
  if (type === "kg") return `${parseFloat(score)}kg`;
  return `${parseFloat(score)}x`;
};
