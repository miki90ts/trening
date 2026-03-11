import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import Loading from "../components/common/Loading";
import * as api from "../services/api";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
];
const SEGMENT_TYPES = [
  { value: "warmup", label: "Warm up" },
  { value: "run", label: "Run" },
  { value: "recover", label: "Recover" },
  { value: "rest", label: "Rest" },
  { value: "cooldown", label: "Cool down" },
  { value: "other", label: "Other" },
];
const TARGET_TYPES = [
  { value: "distance", label: "Distanca" },
  { value: "duration", label: "Vreme" },
];
const TARGET_METRICS = [
  { value: "none", label: "Bez target metrike" },
  { value: "pace", label: "Pace" },
  { value: "hr", label: "HR" },
  { value: "cadence", label: "Cadence" },
];
const RECOVERY_TYPES = [
  { value: "none", label: "Bez recovery" },
  { value: "distance", label: "Recovery distanca" },
  { value: "duration", label: "Recovery vreme" },
];

function paceTextToSeconds(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [minutes, seconds] = text.split(":").map((part) => parseInt(part, 10));
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  if (seconds < 0 || seconds > 59 || minutes < 0) return null;
  return minutes * 60 + seconds;
}

function secondsToPaceText(value) {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const totalSeconds = Math.round(numeric);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function secondsToDurationParts(value) {
  const numeric = parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { minutes: "", seconds: "" };
  }
  return {
    minutes: String(Math.floor(numeric / 60)),
    seconds: String(numeric % 60),
  };
}

function durationPartsToSeconds(minutesValue, secondsValue) {
  const minutes = parseInt(minutesValue, 10);
  const seconds = parseInt(secondsValue, 10);
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return safeMinutes * 60 + safeSeconds;
}

function formatDurationParts(minutesValue, secondsValue) {
  const totalSeconds = durationPartsToSeconds(minutesValue, secondsValue);
  if (totalSeconds <= 0) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} min`;
  if (minutes === 0) return `${seconds} sek`;
  return `${minutes} min ${seconds} sek`;
}

function normalizeDurationValues(minutesValue, secondsValue) {
  const rawMinutes = String(minutesValue ?? "").replace(/\D/g, "");
  const rawSeconds = String(secondsValue ?? "").replace(/\D/g, "");

  const parsedMinutes = rawMinutes === "" ? 0 : parseInt(rawMinutes, 10);
  const parsedSeconds = rawSeconds === "" ? 0 : parseInt(rawSeconds, 10);

  if (!Number.isFinite(parsedMinutes) && !Number.isFinite(parsedSeconds)) {
    return { minutes: "", seconds: "" };
  }

  const safeMinutes = Number.isFinite(parsedMinutes) ? parsedMinutes : 0;
  const safeSeconds = Number.isFinite(parsedSeconds) ? parsedSeconds : 0;
  const totalSeconds = Math.max(0, safeMinutes * 60 + safeSeconds);
  const normalizedMinutes = Math.floor(totalSeconds / 60);
  const normalizedSeconds = totalSeconds % 60;

  return {
    minutes:
      normalizedMinutes > 0 || rawMinutes !== ""
        ? String(normalizedMinutes)
        : "",
    seconds:
      normalizedSeconds > 0 || rawSeconds !== "" || normalizedMinutes > 0
        ? String(normalizedSeconds)
        : "",
  };
}

function formatPaceInput(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);

  if (!digits) return "";
  if (digits.length <= 2) {
    return digits.length === 2 ? `${digits}:` : digits;
  }

  const minutes = digits.slice(0, 2);
  let seconds = digits.slice(2, 4);
  if (seconds.length === 2) {
    seconds = String(Math.min(59, parseInt(seconds, 10))).padStart(2, "0");
  }
  return `${minutes}:${seconds}`;
}

function inferTargetMetric(segment) {
  if (
    segment.target_metric &&
    ["none", "pace", "hr", "cadence"].includes(segment.target_metric)
  ) {
    return segment.target_metric;
  }
  if (
    segment.target_pace_min_sec_per_km !== null &&
    segment.target_pace_min_sec_per_km !== undefined
  ) {
    return "pace";
  }
  if (
    segment.target_pace_max_sec_per_km !== null &&
    segment.target_pace_max_sec_per_km !== undefined
  ) {
    return "pace";
  }
  if (segment.target_hr_min !== null && segment.target_hr_min !== undefined) {
    return "hr";
  }
  if (segment.target_hr_max !== null && segment.target_hr_max !== undefined) {
    return "hr";
  }
  if (
    segment.target_cadence_min !== null &&
    segment.target_cadence_min !== undefined
  ) {
    return "cadence";
  }
  if (
    segment.target_cadence_max !== null &&
    segment.target_cadence_max !== undefined
  ) {
    return "cadence";
  }
  return "none";
}

function createEmptySegment() {
  return {
    segment_type: "run",
    label: "",
    target_type: "distance",
    target_metric: "none",
    target_distance_km: "1",
    target_duration_min: "",
    target_duration_sec: "",
    target_pace_min_text: "",
    target_pace_max_text: "",
    target_hr_min: "",
    target_hr_max: "",
    target_cadence_min: "",
    target_cadence_max: "",
    repeat_count: "1",
    recovery_type: "none",
    recovery_distance_km: "",
    recovery_duration_min: "",
    recovery_duration_sec: "",
    group_repeat_count: "1",
    group_recovery_type: "none",
    group_recovery_distance_km: "",
    group_recovery_duration_min: "",
    group_recovery_duration_sec: "",
    notes: "",
  };
}

function formatSegmentType(segmentType) {
  return (
    SEGMENT_TYPES.find((item) => item.value === segmentType)?.label || "Segment"
  );
}

function formatTargetBase(segment) {
  if (segment.target_type === "duration") {
    return formatDurationParts(
      segment.target_duration_min,
      segment.target_duration_sec,
    );
  }
  const distance = parseFloat(segment.target_distance_km || 0);
  return distance > 0 ? `${distance} km` : "—";
}

function formatMetricSummary(segment) {
  if (segment.target_metric === "pace") {
    const min = segment.target_pace_min_text?.trim();
    const max = segment.target_pace_max_text?.trim();
    if (min && max) return `pace ${min}–${max}/km`;
    if (min) return `pace ≥ ${min}/km`;
    if (max) return `pace ≤ ${max}/km`;
  }
  if (segment.target_metric === "hr") {
    const min = segment.target_hr_min?.trim();
    const max = segment.target_hr_max?.trim();
    if (min && max) return `HR ${min}-${max}`;
    if (min) return `HR ≥ ${min}`;
    if (max) return `HR ≤ ${max}`;
  }
  if (segment.target_metric === "cadence") {
    const min = segment.target_cadence_min?.trim();
    const max = segment.target_cadence_max?.trim();
    if (min && max) return `cadence ${min}-${max}`;
    if (min) return `cadence ≥ ${min}`;
    if (max) return `cadence ≤ ${max}`;
  }
  return "";
}

function formatRecoverySummary(type, distanceKm, durationMin, durationSec) {
  if (type === "distance") {
    const distance = parseFloat(distanceKm || 0);
    return distance > 0 ? `${distance} km recovery` : "recovery distanca";
  }
  if (type === "duration") {
    const duration = formatDurationParts(durationMin, durationSec);
    return duration !== "—" ? `${duration} recovery` : "recovery vreme";
  }
  return "";
}

function buildSegmentSummary(segment) {
  const typeLabel = formatSegmentType(segment.segment_type);
  const optionalLabel = segment.label?.trim()
    ? ` · ${segment.label.trim()}`
    : "";
  const base = `${formatTargetBase(segment)} ${typeLabel}${optionalLabel}`;
  const metric = formatMetricSummary(segment);
  const innerRepeats = Math.max(1, parseInt(segment.repeat_count, 10) || 1);
  const outerRepeats = Math.max(
    1,
    parseInt(segment.group_repeat_count, 10) || 1,
  );

  let inner = innerRepeats > 1 ? `${innerRepeats}x ${base}` : base;
  if (metric) inner += ` @ ${metric}`;
  if (segment.recovery_type !== "none" && innerRepeats > 1) {
    inner += ` + ${formatRecoverySummary(
      segment.recovery_type,
      segment.recovery_distance_km,
      segment.recovery_duration_min,
      segment.recovery_duration_sec,
    )}`;
  }

  if (outerRepeats > 1) {
    let grouped = `${outerRepeats}x (${inner})`;
    if (segment.group_recovery_type !== "none") {
      grouped += ` + ${formatRecoverySummary(
        segment.group_recovery_type,
        segment.group_recovery_distance_km,
        segment.group_recovery_duration_min,
        segment.group_recovery_duration_sec,
      )} između setova`;
    }
    return grouped;
  }

  return inner;
}

function ActivityPlanBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const copyFromId = !isEdit ? searchParams.get("copyFrom") : null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityTypes, setActivityTypes] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [segments, setSegments] = useState([createEmptySegment()]);

  useEffect(() => {
    api.getActivityTypes({ limit: 999 }).then((result) => {
      const items = Array.isArray(result) ? result : result?.data || [];
      setActivityTypes(items.filter((item) => item.is_active !== 0));
      if (!activityTypeId) {
        const running = items.find((item) => item.code === "running");
        if (running) setActivityTypeId(String(running.id));
      }
    });
  }, [activityTypeId]);

  const loadPlan = useCallback(async () => {
    const sourcePlanId = isEdit ? id : copyFromId;
    if (!sourcePlanId) return;
    setLoading(true);
    try {
      const plan = await api.getActivityPlan(sourcePlanId);
      setName(plan.name || "");
      setDescription(plan.description || "");
      setColor(plan.color || "#3b82f6");
      setActivityTypeId(String(plan.activity_type_id || ""));
      setSegments(
        (plan.segments || []).map((segment) => ({
          segment_type: segment.segment_type || "run",
          label:
            segment.label ||
            (!segment.segment_type && segment.title ? segment.title : "") ||
            "",
          target_type: segment.target_type || "distance",
          target_metric: inferTargetMetric(segment),
          target_distance_km: segment.target_distance_meters
            ? String(
                (Number(segment.target_distance_meters) / 1000).toFixed(2),
              ).replace(/\.00$/, "")
            : "",
          target_duration_min: secondsToDurationParts(
            segment.target_duration_seconds,
          ).minutes,
          target_duration_sec: secondsToDurationParts(
            segment.target_duration_seconds,
          ).seconds,
          target_pace_min_text: secondsToPaceText(
            segment.target_pace_min_sec_per_km,
          ),
          target_pace_max_text: secondsToPaceText(
            segment.target_pace_max_sec_per_km,
          ),
          target_hr_min: segment.target_hr_min
            ? String(segment.target_hr_min)
            : "",
          target_hr_max: segment.target_hr_max
            ? String(segment.target_hr_max)
            : "",
          target_cadence_min: segment.target_cadence_min
            ? String(segment.target_cadence_min)
            : "",
          target_cadence_max: segment.target_cadence_max
            ? String(segment.target_cadence_max)
            : "",
          repeat_count: String(segment.repeat_count || 1),
          recovery_type: segment.recovery_type || "none",
          recovery_distance_km: segment.recovery_distance_meters
            ? String(
                (Number(segment.recovery_distance_meters) / 1000).toFixed(2),
              ).replace(/\.00$/, "")
            : "",
          recovery_duration_min: secondsToDurationParts(
            segment.recovery_duration_seconds,
          ).minutes,
          recovery_duration_sec: secondsToDurationParts(
            segment.recovery_duration_seconds,
          ).seconds,
          group_repeat_count: String(segment.group_repeat_count || 1),
          group_recovery_type: segment.group_recovery_type || "none",
          group_recovery_distance_km: segment.group_recovery_distance_meters
            ? String(
                (Number(segment.group_recovery_distance_meters) / 1000).toFixed(
                  2,
                ),
              ).replace(/\.00$/, "")
            : "",
          group_recovery_duration_min: secondsToDurationParts(
            segment.group_recovery_duration_seconds,
          ).minutes,
          group_recovery_duration_sec: secondsToDurationParts(
            segment.group_recovery_duration_seconds,
          ).seconds,
          notes: segment.notes || "",
        })),
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.message ||
          "Greška pri učitavanju plana aktivnosti",
      );
    } finally {
      setLoading(false);
    }
  }, [copyFromId, id, isEdit]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const updateSegment = (index, field, value) => {
    setSegments((prev) =>
      prev.map((segment, currentIndex) => {
        if (currentIndex !== index) return segment;
        const next = { ...segment, [field]: value };

        if (
          field === "target_pace_min_text" ||
          field === "target_pace_max_text"
        ) {
          next[field] = formatPaceInput(value);
        }

        if (
          field === "target_duration_min" ||
          field === "target_duration_sec"
        ) {
          const normalized = normalizeDurationValues(
            field === "target_duration_min" ? value : next.target_duration_min,
            field === "target_duration_sec" ? value : next.target_duration_sec,
          );
          next.target_duration_min = normalized.minutes;
          next.target_duration_sec = normalized.seconds;
        }

        if (
          field === "recovery_duration_min" ||
          field === "recovery_duration_sec"
        ) {
          const normalized = normalizeDurationValues(
            field === "recovery_duration_min"
              ? value
              : next.recovery_duration_min,
            field === "recovery_duration_sec"
              ? value
              : next.recovery_duration_sec,
          );
          next.recovery_duration_min = normalized.minutes;
          next.recovery_duration_sec = normalized.seconds;
        }

        if (
          field === "group_recovery_duration_min" ||
          field === "group_recovery_duration_sec"
        ) {
          const normalized = normalizeDurationValues(
            field === "group_recovery_duration_min"
              ? value
              : next.group_recovery_duration_min,
            field === "group_recovery_duration_sec"
              ? value
              : next.group_recovery_duration_sec,
          );
          next.group_recovery_duration_min = normalized.minutes;
          next.group_recovery_duration_sec = normalized.seconds;
        }

        if (field === "target_metric") {
          if (value !== "pace") {
            next.target_pace_min_text = "";
            next.target_pace_max_text = "";
          }
          if (value !== "hr") {
            next.target_hr_min = "";
            next.target_hr_max = "";
          }
          if (value !== "cadence") {
            next.target_cadence_min = "";
            next.target_cadence_max = "";
          }
        }

        if (field === "recovery_type") {
          if (value !== "distance") next.recovery_distance_km = "";
          if (value !== "duration") {
            next.recovery_duration_min = "";
            next.recovery_duration_sec = "";
          }
        }

        if (field === "group_repeat_count") {
          const count = Math.max(1, parseInt(value, 10) || 1);
          if (count <= 1) {
            next.group_recovery_type = "none";
            next.group_recovery_distance_km = "";
            next.group_recovery_duration_min = "";
            next.group_recovery_duration_sec = "";
          }
        }

        if (field === "group_recovery_type") {
          if (value !== "distance") next.group_recovery_distance_km = "";
          if (value !== "duration") {
            next.group_recovery_duration_min = "";
            next.group_recovery_duration_sec = "";
          }
        }

        return next;
      }),
    );
  };

  const addSegment = () =>
    setSegments((prev) => [...prev, createEmptySegment()]);

  const removeSegment = (index) =>
    setSegments((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );

  const expandedSegmentCount = useMemo(
    () =>
      segments.reduce((sum, segment) => {
        const groupRepeats = Math.max(
          1,
          parseInt(segment.group_repeat_count, 10) || 1,
        );
        const repeats = Math.max(1, parseInt(segment.repeat_count, 10) || 1);
        const workCount = groupRepeats * repeats;
        const innerRecoveryCount =
          segment.recovery_type !== "none"
            ? groupRepeats * Math.max(0, repeats - 1)
            : 0;
        const setRecoveryCount =
          groupRepeats > 1 && segment.group_recovery_type !== "none"
            ? Math.max(0, groupRepeats - 1)
            : 0;
        return sum + workCount + innerRecoveryCount + setRecoveryCount;
      }, 0),
    [segments],
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Unesite naziv plana aktivnosti");
      return;
    }
    if (!activityTypeId) {
      toast.error("Izaberi tip aktivnosti");
      return;
    }
    if (segments.length === 0) {
      toast.error("Dodaj bar jedan segment");
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        activity_type_id: parseInt(activityTypeId, 10),
        segments: segments.map((segment, index) => {
          const targetPaceMin =
            segment.target_metric === "pace"
              ? paceTextToSeconds(segment.target_pace_min_text)
              : null;
          const targetPaceMax =
            segment.target_metric === "pace"
              ? paceTextToSeconds(segment.target_pace_max_text)
              : null;

          if (
            segment.target_metric === "pace" &&
            segment.target_pace_min_text &&
            targetPaceMin === null
          ) {
            throw new Error(`Segment #${index + 1}: min pace nije validan`);
          }
          if (
            segment.target_metric === "pace" &&
            segment.target_pace_max_text &&
            targetPaceMax === null
          ) {
            throw new Error(`Segment #${index + 1}: max pace nije validan`);
          }
          if (
            segment.target_metric !== "none" &&
            !targetPaceMin &&
            !targetPaceMax &&
            !segment.target_hr_min &&
            !segment.target_hr_max &&
            !segment.target_cadence_min &&
            !segment.target_cadence_max
          ) {
            throw new Error(`Segment #${index + 1}: unesi target opseg`);
          }

          return {
            segment_type: segment.segment_type,
            label: segment.label.trim() || null,
            target_type: segment.target_type,
            target_metric: segment.target_metric,
            target_distance_meters:
              segment.target_type === "distance"
                ? Math.round(
                    (parseFloat(segment.target_distance_km) || 0) * 1000,
                  )
                : null,
            target_duration_seconds:
              segment.target_type === "duration"
                ? durationPartsToSeconds(
                    segment.target_duration_min,
                    segment.target_duration_sec,
                  )
                : null,
            target_pace_min_sec_per_km: targetPaceMin,
            target_pace_max_sec_per_km: targetPaceMax,
            target_hr_min:
              segment.target_metric === "hr" && segment.target_hr_min
                ? parseInt(segment.target_hr_min, 10)
                : null,
            target_hr_max:
              segment.target_metric === "hr" && segment.target_hr_max
                ? parseInt(segment.target_hr_max, 10)
                : null,
            target_cadence_min:
              segment.target_metric === "cadence" && segment.target_cadence_min
                ? parseInt(segment.target_cadence_min, 10)
                : null,
            target_cadence_max:
              segment.target_metric === "cadence" && segment.target_cadence_max
                ? parseInt(segment.target_cadence_max, 10)
                : null,
            repeat_count: Math.max(1, parseInt(segment.repeat_count, 10) || 1),
            recovery_type: segment.recovery_type,
            recovery_distance_meters:
              segment.recovery_type === "distance"
                ? Math.round(
                    (parseFloat(segment.recovery_distance_km) || 0) * 1000,
                  )
                : null,
            recovery_duration_seconds:
              segment.recovery_type === "duration"
                ? durationPartsToSeconds(
                    segment.recovery_duration_min,
                    segment.recovery_duration_sec,
                  )
                : null,
            group_repeat_count: Math.max(
              1,
              parseInt(segment.group_repeat_count, 10) || 1,
            ),
            group_recovery_type:
              Math.max(1, parseInt(segment.group_repeat_count, 10) || 1) > 1
                ? segment.group_recovery_type
                : "none",
            group_recovery_distance_meters:
              segment.group_recovery_type === "distance"
                ? Math.round(
                    (parseFloat(segment.group_recovery_distance_km) || 0) *
                      1000,
                  )
                : null,
            group_recovery_duration_seconds:
              segment.group_recovery_type === "duration"
                ? durationPartsToSeconds(
                    segment.group_recovery_duration_min,
                    segment.group_recovery_duration_sec,
                  )
                : null,
            notes: segment.notes.trim() || null,
          };
        }),
      };

      setSaving(true);
      if (isEdit) {
        await api.updateActivityPlan(id, payload);
        toast.success("Plan aktivnosti ažuriran");
      } else {
        await api.createActivityPlan(payload);
        toast.success("Plan aktivnosti kreiran");
      }
      navigate("/activity-plans");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page plan-builder-page">
      <div className="page-header">
        <div className="page-header-left">
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/activity-plans")}
          >
            <FiArrowLeft /> Nazad
          </button>
          <h1 className="page-title">
            {isEdit ? "✏️ Izmeni plan aktivnosti" : "🏃 Novi plan aktivnosti"}
          </h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          <FiSave /> {saving ? "Čuvanje..." : "Sačuvaj"}
        </button>
      </div>

      <div className="card form-card">
        <div className="form-grid two-cols">
          <div className="form-group">
            <label>Naziv plana</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="npr. 10K tempo + intervali"
            />
          </div>
          <div className="form-group">
            <label>Tip aktivnosti</label>
            <select
              value={activityTypeId}
              onChange={(event) => setActivityTypeId(event.target.value)}
            >
              <option value="">Izaberi tip</option>
              {activityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Opis</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Strukturirani plan trčanja sa splitovima, intervalima i recovery blokovima"
          />
        </div>
        <div className="form-group">
          <label>Boja</label>
          <div className="plan-colors-grid">
            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className={`plan-color-btn ${color === value ? "active" : ""}`}
                style={{ background: value }}
                onClick={() => setColor(value)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card form-card">
        <div className="plan-exercises-header">
          <h3>
            Segmenti ({segments.length}) · Expanded: {expandedSegmentCount}
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={addSegment}
          >
            <FiPlus /> Dodaj segment
          </button>
        </div>

        {segments.map((segment, index) => {
          const groupRepeats = Math.max(
            1,
            parseInt(segment.group_repeat_count, 10) || 1,
          );

          return (
            <div
              key={`segment-${index + 1}`}
              className="card form-card"
              style={{ marginTop: "1rem" }}
            >
              <div
                className="plan-card-header"
                style={{ marginBottom: "1rem" }}
              >
                <div className="plan-card-title">
                  <h3>Segment #{index + 1}</h3>
                  <p style={{ marginTop: "0.35rem" }}>
                    {buildSegmentSummary(segment)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost btn-danger-ghost"
                  onClick={() => removeSegment(index)}
                  disabled={segments.length === 1}
                >
                  <FiTrash2 />
                </button>
              </div>

              <div className="form-grid two-cols">
                <div className="form-group">
                  <label>Tip segmenta</label>
                  <select
                    value={segment.segment_type}
                    onChange={(event) =>
                      updateSegment(index, "segment_type", event.target.value)
                    }
                  >
                    {SEGMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Opcioni label</label>
                  <input
                    value={segment.label}
                    onChange={(event) =>
                      updateSegment(index, "label", event.target.value)
                    }
                    placeholder="npr. Tempo, 10K pace, Hill"
                  />
                </div>
              </div>

              <div className="form-grid three-cols">
                <div className="form-group">
                  <label>Tip cilja</label>
                  <select
                    value={segment.target_type}
                    onChange={(event) =>
                      updateSegment(index, "target_type", event.target.value)
                    }
                  >
                    {TARGET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    {segment.target_type === "distance"
                      ? "Distanca (km)"
                      : "Vreme"}
                  </label>
                  {segment.target_type === "distance" ? (
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={segment.target_distance_km}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_distance_km",
                          event.target.value,
                        )
                      }
                    />
                  ) : (
                    <div className="form-row">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={segment.target_duration_min}
                        onChange={(event) =>
                          updateSegment(
                            index,
                            "target_duration_min",
                            event.target.value,
                          )
                        }
                        placeholder="min"
                      />
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={segment.target_duration_sec}
                        onChange={(event) =>
                          updateSegment(
                            index,
                            "target_duration_sec",
                            event.target.value,
                          )
                        }
                        placeholder="sek"
                      />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Target metrika</label>
                  <select
                    value={segment.target_metric}
                    onChange={(event) =>
                      updateSegment(index, "target_metric", event.target.value)
                    }
                  >
                    {TARGET_METRICS.map((metric) => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {segment.target_metric === "pace" && (
                <div className="form-grid two-cols">
                  <div className="form-group">
                    <label>Pace od (mm:ss/km)</label>
                    <input
                      value={segment.target_pace_min_text}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_pace_min_text",
                          event.target.value,
                        )
                      }
                      placeholder="3:55"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pace do (mm:ss/km)</label>
                    <input
                      value={segment.target_pace_max_text}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_pace_max_text",
                          event.target.value,
                        )
                      }
                      placeholder="4:05"
                    />
                  </div>
                </div>
              )}

              {segment.target_metric === "hr" && (
                <div className="form-grid two-cols">
                  <div className="form-group">
                    <label>HR od</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.target_hr_min}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_hr_min",
                          event.target.value,
                        )
                      }
                      placeholder="150"
                    />
                  </div>
                  <div className="form-group">
                    <label>HR do</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.target_hr_max}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_hr_max",
                          event.target.value,
                        )
                      }
                      placeholder="165"
                    />
                  </div>
                </div>
              )}

              {segment.target_metric === "cadence" && (
                <div className="form-grid two-cols">
                  <div className="form-group">
                    <label>Cadence od</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.target_cadence_min}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_cadence_min",
                          event.target.value,
                        )
                      }
                      placeholder="176"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cadence do</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.target_cadence_max}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "target_cadence_max",
                          event.target.value,
                        )
                      }
                      placeholder="182"
                    />
                  </div>
                </div>
              )}

              <div className="form-grid four-cols">
                <div className="form-group">
                  <label>Repeat count</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={segment.repeat_count}
                    onChange={(event) =>
                      updateSegment(index, "repeat_count", event.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Recovery između ponavljanja</label>
                  <select
                    value={segment.recovery_type}
                    onChange={(event) =>
                      updateSegment(index, "recovery_type", event.target.value)
                    }
                  >
                    {RECOVERY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {segment.recovery_type === "distance" && (
                  <div className="form-group">
                    <label>Recovery distanca (km)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={segment.recovery_distance_km}
                      onChange={(event) =>
                        updateSegment(
                          index,
                          "recovery_distance_km",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                )}
                {segment.recovery_type === "duration" && (
                  <>
                    <div className="form-group">
                      <label>Min</label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={segment.recovery_duration_min}
                        onChange={(event) =>
                          updateSegment(
                            index,
                            "recovery_duration_min",
                            event.target.value,
                          )
                        }
                        placeholder="min"
                      />
                    </div>
                    <div className="form-group">
                      <label>Sek</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={segment.recovery_duration_sec}
                        onChange={(event) =>
                          updateSegment(
                            index,
                            "recovery_duration_sec",
                            event.target.value,
                          )
                        }
                        placeholder="sek"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="form-grid four-cols">
                <div className="form-group">
                  <label>Broj setova / grupa</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={segment.group_repeat_count}
                    onChange={(event) =>
                      updateSegment(
                        index,
                        "group_repeat_count",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Recovery između setova</label>
                  <select
                    value={segment.group_recovery_type}
                    onChange={(event) =>
                      updateSegment(
                        index,
                        "group_recovery_type",
                        event.target.value,
                      )
                    }
                    disabled={groupRepeats <= 1}
                  >
                    {RECOVERY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {segment.group_recovery_type === "distance" &&
                  groupRepeats > 1 && (
                    <div className="form-group">
                      <label>Set recovery distanca (km)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={segment.group_recovery_distance_km}
                        onChange={(event) =>
                          updateSegment(
                            index,
                            "group_recovery_distance_km",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  )}
                {segment.group_recovery_type === "duration" &&
                  groupRepeats > 1 && (
                    <>
                      <div className="form-group">
                        <label>Min</label>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={segment.group_recovery_duration_min}
                          onChange={(event) =>
                            updateSegment(
                              index,
                              "group_recovery_duration_min",
                              event.target.value,
                            )
                          }
                          placeholder="min"
                        />
                      </div>
                      <div className="form-group">
                        <label>Sek</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="1"
                          value={segment.group_recovery_duration_sec}
                          onChange={(event) =>
                            updateSegment(
                              index,
                              "group_recovery_duration_sec",
                              event.target.value,
                            )
                          }
                          placeholder="sek"
                        />
                      </div>
                    </>
                  )}
              </div>

              <div className="form-group">
                <label>Napomena</label>
                <textarea
                  rows={2}
                  value={segment.notes}
                  onChange={(event) =>
                    updateSegment(index, "notes", event.target.value)
                  }
                  placeholder="npr. fokus na formi, kontroli ritma i oporavku"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityPlanBuilderPage;
