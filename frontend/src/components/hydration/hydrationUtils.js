export const HYDRATION_PERIOD_OPTIONS = [
  { key: "7d", label: "7 dana" },
  { key: "month", label: "Mesec" },
  { key: "year", label: "Godina" },
];

export const DRINK_TYPES = [
  { key: "water", label: "Voda", emoji: "💧" },
  { key: "tea", label: "Čaj", emoji: "🍵" },
  { key: "coffee", label: "Kafa", emoji: "☕" },
  { key: "other", label: "Ostalo", emoji: "🥤" },
];

export const QUICK_ADD_OPTIONS = [
  {
    id: "glass",
    label: "Čaša vode",
    amount: 200,
    type: "water",
    icon: "glass",
  },
  {
    id: "small-bottle",
    label: "Mala flašica",
    amount: 330,
    type: "water",
    icon: "small-bottle",
  },
  {
    id: "medium-bottle",
    label: "Flašica 0.5L",
    amount: 500,
    type: "water",
    icon: "medium-bottle",
  },
  {
    id: "large-bottle",
    label: "Flašica 0.7L",
    amount: 700,
    type: "water",
    icon: "large-bottle",
  },
  {
    id: "liter-bottle",
    label: "Flaša 1L",
    amount: 1000,
    type: "water",
    icon: "liter-bottle",
  },
  {
    id: "espresso",
    label: "Espreso",
    amount: 30,
    type: "coffee",
    icon: "espresso",
  },
  {
    id: "coffee-cup",
    label: "Šolja kafe",
    amount: 150,
    type: "coffee",
    icon: "coffee-cup",
  },
  {
    id: "tea-cup",
    label: "Šolja čaja",
    amount: 250,
    type: "tea",
    icon: "tea-cup",
  },
];

export const getDrinkType = (key) =>
  DRINK_TYPES.find((d) => d.key === key) || DRINK_TYPES[0];

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

export const shiftHydrationAnchor = (currentAnchor, granularity, direction) => {
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

export const formatHydrationPeriodTitle = (granularity, anchorDate) => {
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);

  if (granularity === "year") {
    return `${anchor.getFullYear()}`;
  }
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

export const formatMl = (ml) => {
  if (ml == null || !Number.isFinite(Number(ml))) return "-";
  const val = Number(ml);
  if (val >= 1000) return `${(val / 1000).toFixed(1)} L`;
  return `${Math.round(val)} ml`;
};

export const formatNumber = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("sr-RS");
};
