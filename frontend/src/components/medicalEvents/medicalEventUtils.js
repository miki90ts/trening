export const MEDICAL_EVENT_TYPE_OPTIONS = [
  {
    value: "illness",
    label: "Bolest",
    icon: "🤒",
    color: "var(--accent-warning)",
    className: "medical-event-badge--illness",
  },
  {
    value: "injury",
    label: "Povreda",
    icon: "🩹",
    color: "var(--accent-danger)",
    className: "medical-event-badge--injury",
  },
  {
    value: "operation",
    label: "Operacija",
    icon: "🏥",
    color: "#0ea5e9",
    className: "medical-event-badge--operation",
  },
];

export function getMedicalEventMeta(type) {
  return (
    MEDICAL_EVENT_TYPE_OPTIONS.find((option) => option.value === type) || {
      value: type,
      label: "Medicinski događaj",
      icon: "🏥",
      color: "var(--accent-primary)",
      className: "medical-event-badge--default",
    }
  );
}

export function normalizeMedicalEventDate(dateValue) {
  if (!dateValue) return "";

  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();
    const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymdMatch) {
      return ymdMatch[1];
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return "";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parseDate(dateValue) {
  const normalized = normalizeMedicalEventDate(dateValue);
  if (!normalized) return null;
  return new Date(`${normalized}T00:00:00`);
}

export function formatMedicalEventDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return "-";

  const startLabel = start.toLocaleDateString("sr-RS");
  const endLabel = end.toLocaleDateString("sr-RS");

  if (
    normalizeMedicalEventDate(startDate) === normalizeMedicalEventDate(endDate)
  ) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
}

export function getMedicalEventDurationDays(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return null;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / millisecondsPerDay) + 1;
}
