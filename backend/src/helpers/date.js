const toDateOnly = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfWeekMonday = (value) => {
  const date = toDateOnly(value);
  if (!date) return null;
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const getSimplePeriodRange = (granularity, anchorValue) => {
  const anchor = toDateOnly(anchorValue);
  if (!anchor) return null;

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
  const start = addDays(end, -6);
  return { start: toYmd(start), end: toYmd(end) };
};

const prevYmd = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toYmd(dt);
};

const nextYmd = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return toYmd(dt);
};

const toBelgradeYmd = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

module.exports = {
  toDateOnly,
  toYmd,
  addDays,
  startOfWeekMonday,
  getSimplePeriodRange,
  prevYmd,
  nextYmd,
  toBelgradeYmd,
};
