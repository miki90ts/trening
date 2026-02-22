export const toYmd = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toDateTimeLocal = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export const shiftAnchor = (anchor, granularity, direction) => {
  const date = new Date(`${anchor}T00:00:00`);
  if (Number.isNaN(date.getTime())) return toYmd(new Date());

  if (granularity === "month") {
    date.setMonth(date.getMonth() + (direction >= 0 ? 1 : -1));
  } else {
    date.setDate(date.getDate() + (direction >= 0 ? 7 : -7));
  }

  return toYmd(date);
};

export const formatDuration = (seconds) => {
  const total = Math.max(0, parseInt(seconds || 0, 10));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

export const formatPace = (pace) => {
  const value = parseFloat(pace);
  if (!Number.isFinite(value) || value <= 0) return "-";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
};

export const formatDistanceKm = (meters) =>
  (parseFloat(meters || 0) / 1000).toFixed(2);

export const formatPeriodLabel = (granularity, anchor) => {
  const date = new Date(`${anchor}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (granularity === "month") {
    return date.toLocaleDateString("sr-RS", { month: "long", year: "numeric" });
  }
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("sr-RS")} - ${end.toLocaleDateString("sr-RS")}`;
};

export const initialActivityForm = {
  name: "",
  description: "",
  activity_type_id: "",
  performed_at: toDateTimeLocal(new Date()),
  distance_meters: "",
  duration_seconds: "",
  avg_heart_rate: "",
  min_heart_rate: "",
  max_heart_rate: "",
  ascent_meters: "",
  descent_meters: "",
  min_elevation_meters: "",
  max_elevation_meters: "",
  calories: "",
  running_cadence_avg: "",
  running_cadence_min: "",
  running_cadence_max: "",
  avg_speed_kmh: "",
  max_speed_kmh: "",
  moving_time_seconds: "",
};

export const emptySplit = {
  label: "",
  distance_meters: "",
  duration_seconds: "",
};

export const parseOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const mapDetailToForm = (detail) => ({
  name: detail.name || "",
  description: detail.description || "",
  activity_type_id: detail.activity_type_id
    ? String(detail.activity_type_id)
    : "",
  performed_at: detail.performed_at
    ? toDateTimeLocal(detail.performed_at)
    : toDateTimeLocal(new Date()),
  distance_meters: detail.distance_meters ?? "",
  duration_seconds: detail.duration_seconds ?? "",
  avg_heart_rate: detail.avg_heart_rate ?? "",
  min_heart_rate: detail.min_heart_rate ?? "",
  max_heart_rate: detail.max_heart_rate ?? "",
  ascent_meters: detail.ascent_meters ?? "",
  descent_meters: detail.descent_meters ?? "",
  min_elevation_meters: detail.min_elevation_meters ?? "",
  max_elevation_meters: detail.max_elevation_meters ?? "",
  calories: detail.calories ?? "",
  running_cadence_avg: detail.running_cadence_avg ?? "",
  running_cadence_min: detail.running_cadence_min ?? "",
  running_cadence_max: detail.running_cadence_max ?? "",
  avg_speed_kmh: detail.avg_speed_kmh ?? "",
  max_speed_kmh: detail.max_speed_kmh ?? "",
  moving_time_seconds: detail.moving_time_seconds ?? "",
});

export const mapDetailSplits = (detail) =>
  (detail.splits || []).map((split) => ({
    label: split.label || "",
    distance_meters: split.distance_meters ?? "",
    duration_seconds: split.duration_seconds ?? "",
  }));

export const buildActivityPayload = (formData, splits) => {
  const payload = {
    name: formData.name,
    description: formData.description || undefined,
    activity_type_id: Number(formData.activity_type_id),
    performed_at: new Date(formData.performed_at).toISOString(),
    distance_meters: Number(formData.distance_meters),
    duration_seconds: Number(formData.duration_seconds),
    avg_heart_rate: parseOptionalNumber(formData.avg_heart_rate),
    min_heart_rate: parseOptionalNumber(formData.min_heart_rate),
    max_heart_rate: parseOptionalNumber(formData.max_heart_rate),
    ascent_meters: parseOptionalNumber(formData.ascent_meters),
    descent_meters: parseOptionalNumber(formData.descent_meters),
    min_elevation_meters: parseOptionalNumber(formData.min_elevation_meters),
    max_elevation_meters: parseOptionalNumber(formData.max_elevation_meters),
    calories: parseOptionalNumber(formData.calories),
    running_cadence_avg: parseOptionalNumber(formData.running_cadence_avg),
    running_cadence_min: parseOptionalNumber(formData.running_cadence_min),
    running_cadence_max: parseOptionalNumber(formData.running_cadence_max),
    avg_speed_kmh: parseOptionalNumber(formData.avg_speed_kmh),
    max_speed_kmh: parseOptionalNumber(formData.max_speed_kmh),
    moving_time_seconds: parseOptionalNumber(formData.moving_time_seconds),
  };

  payload.splits = splits
    .filter((split) => split.distance_meters && split.duration_seconds)
    .map((split) => ({
      label: split.label,
      distance_meters: Number(split.distance_meters),
      duration_seconds: Number(split.duration_seconds),
    }));

  return payload;
};
