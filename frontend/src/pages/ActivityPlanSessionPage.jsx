import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiCheck, FiCheckCircle, FiSave } from "react-icons/fi";
import Loading from "../components/common/Loading";
import * as api from "../services/api";

function formatPace(seconds) {
  const numeric = parseFloat(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  const rounded = Math.round(numeric);
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}/km`;
}

function formatSegmentType(type) {
  const map = {
    warmup: "Warm up",
    run: "Run",
    recover: "Recover",
    rest: "Rest",
    cooldown: "Cool down",
    other: "Other",
  };
  return map[type] || "Segment";
}

function formatDuration(seconds) {
  const total = parseInt(seconds, 10);
  if (!Number.isFinite(total) || total <= 0) return "—";
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (secs === 0) return `${minutes} min`;
  if (minutes === 0) return `${secs} sek`;
  return `${minutes} min ${secs} sek`;
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

function normalizeDurationValues(minutesValue, secondsValue) {
  const rawMinutes = String(minutesValue ?? "").replace(/\D/g, "");
  const rawSeconds = String(secondsValue ?? "").replace(/\D/g, "");
  const totalSeconds =
    (rawMinutes ? parseInt(rawMinutes, 10) : 0) * 60 +
    (rawSeconds ? parseInt(rawSeconds, 10) : 0);
  if (!totalSeconds) {
    return {
      minutes: rawMinutes ? "0" : "",
      seconds: rawSeconds ? "0" : "",
    };
  }
  return {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60),
  };
}

function metersToDistanceParts(value) {
  const numeric = parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { km: "", meters: "" };
  }
  return {
    km: String(Math.floor(numeric / 1000)),
    meters: String(numeric % 1000),
  };
}

function distancePartsToMeters(kmValue, metersValue) {
  const km = parseInt(kmValue, 10);
  const meters = parseInt(metersValue, 10);
  const safeKm = Number.isFinite(km) && km > 0 ? km : 0;
  const safeMeters = Number.isFinite(meters) && meters > 0 ? meters : 0;
  return safeKm * 1000 + safeMeters;
}

function normalizeDistanceValues(kmValue, metersValue) {
  const rawKm = String(kmValue ?? "").replace(/\D/g, "");
  const rawMeters = String(metersValue ?? "").replace(/\D/g, "");
  const totalMeters =
    (rawKm ? parseInt(rawKm, 10) : 0) * 1000 +
    (rawMeters ? parseInt(rawMeters, 10) : 0);
  if (!totalMeters) {
    return {
      km: rawKm ? "0" : "",
      meters: rawMeters ? "0" : "",
    };
  }
  return {
    km: String(Math.floor(totalMeters / 1000)),
    meters: String(totalMeters % 1000),
  };
}

function getMetricMidpoint(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);
  if (minValue > 0 && maxValue > 0)
    return Math.round((minValue + maxValue) / 2);
  if (minValue > 0) return minValue;
  if (maxValue > 0) return maxValue;
  return null;
}

function getTargetPaceValue(segment) {
  const min = Number(segment.target_pace_min_sec_per_km || 0);
  const max = Number(segment.target_pace_max_sec_per_km || 0);
  if (min > 0 && max > 0) return (min + max) / 2;
  if (min > 0) return min;
  if (max > 0) return max;
  return null;
}

function initializeSegment(segment) {
  const targetDistance = Number(segment.target_distance_meters || 0) || 0;
  const targetDuration = Number(segment.target_duration_seconds || 0) || 0;
  const paceValue = getTargetPaceValue(segment);

  const defaultDistance = targetDistance > 0 ? targetDistance : null;
  const defaultDuration =
    targetDuration > 0
      ? targetDuration
      : defaultDistance && paceValue
        ? Math.round((defaultDistance / 1000) * paceValue)
        : null;

  const actualDistance =
    segment.actual_distance_meters !== null &&
    segment.actual_distance_meters !== undefined
      ? Number(segment.actual_distance_meters || 0)
      : defaultDistance;
  const actualDuration =
    segment.actual_duration_seconds !== null &&
    segment.actual_duration_seconds !== undefined
      ? Number(segment.actual_duration_seconds || 0)
      : defaultDuration;

  const distanceParts = metersToDistanceParts(actualDistance);
  const durationParts = secondsToDurationParts(actualDuration);

  return {
    ...segment,
    actual_distance_meters: actualDistance > 0 ? actualDistance : null,
    actual_duration_seconds: actualDuration > 0 ? actualDuration : null,
    actual_distance_km: distanceParts.km,
    actual_distance_m: distanceParts.meters,
    actual_duration_min: durationParts.minutes,
    actual_duration_sec: durationParts.seconds,
    actual_avg_hr:
      segment.actual_avg_hr ??
      getMetricMidpoint(segment.target_hr_min, segment.target_hr_max),
    actual_avg_cadence:
      segment.actual_avg_cadence ??
      getMetricMidpoint(segment.target_cadence_min, segment.target_cadence_max),
  };
}

function formatMetricTarget(segment) {
  if (segment.target_metric === "pace") {
    const min =
      segment.target_pace_min_sec_per_km != null
        ? formatPace(segment.target_pace_min_sec_per_km)
        : null;
    const max =
      segment.target_pace_max_sec_per_km != null
        ? formatPace(segment.target_pace_max_sec_per_km)
        : null;
    if (min && max && min !== "-" && max !== "-") return `pace ${min} - ${max}`;
    if (min && min !== "-") return `pace ≥ ${min}`;
    if (max && max !== "-") return `pace ≤ ${max}`;
  }
  if (segment.target_metric === "hr") {
    if (segment.target_hr_min && segment.target_hr_max) {
      return `HR ${segment.target_hr_min}-${segment.target_hr_max}`;
    }
    if (segment.target_hr_min) return `HR ≥ ${segment.target_hr_min}`;
    if (segment.target_hr_max) return `HR ≤ ${segment.target_hr_max}`;
  }
  if (segment.target_metric === "cadence") {
    if (segment.target_cadence_min && segment.target_cadence_max) {
      return `cadence ${segment.target_cadence_min}-${segment.target_cadence_max}`;
    }
    if (segment.target_cadence_min)
      return `cadence ≥ ${segment.target_cadence_min}`;
    if (segment.target_cadence_max)
      return `cadence ≤ ${segment.target_cadence_max}`;
  }
  return "";
}

function formatSegmentKind(segment) {
  if (segment.segment_kind === "set_recovery") return "Set recovery";
  if (segment.segment_kind === "recovery") return "Recovery";
  return "Work";
}

function formatTarget(segment) {
  const base =
    segment.target_type === "distance"
      ? `${((Number(segment.target_distance_meters || 0) || 0) / 1000).toFixed(2)} km`
      : formatDuration(segment.target_duration_seconds);
  const metric = formatMetricTarget(segment);
  return metric ? `${base} · ${metric}` : base;
}

function ActivityPlanSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getActivityPlanSession(sessionId);
      if (data.status === "scheduled") {
        await api.startActivityPlanSession(sessionId);
        data.status = "in_progress";
      }
      setSession({
        ...data,
        segments: (data.segments || []).map(initializeSegment),
      });
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.message ||
          "Greška pri učitavanju activity session-a",
      );
      navigate("/activity-plans");
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const patchSegment = (index, patch) => {
    setSession((prev) => ({
      ...prev,
      segments: prev.segments.map((segment, currentIndex) =>
        currentIndex === index ? { ...segment, ...patch } : segment,
      ),
    }));
  };

  const updateDistancePart = (index, field, value) => {
    setSession((prev) => ({
      ...prev,
      segments: prev.segments.map((segment, currentIndex) => {
        if (currentIndex !== index) return segment;
        const normalized = normalizeDistanceValues(
          field === "actual_distance_km" ? value : segment.actual_distance_km,
          field === "actual_distance_m" ? value : segment.actual_distance_m,
        );
        const totalMeters = distancePartsToMeters(
          normalized.km,
          normalized.meters,
        );
        return {
          ...segment,
          actual_distance_km: normalized.km,
          actual_distance_m: normalized.meters,
          actual_distance_meters: totalMeters > 0 ? totalMeters : null,
        };
      }),
    }));
  };

  const updateDurationPart = (index, field, value) => {
    setSession((prev) => ({
      ...prev,
      segments: prev.segments.map((segment, currentIndex) => {
        if (currentIndex !== index) return segment;
        const normalized = normalizeDurationValues(
          field === "actual_duration_min" ? value : segment.actual_duration_min,
          field === "actual_duration_sec" ? value : segment.actual_duration_sec,
        );
        const totalSeconds = durationPartsToSeconds(
          normalized.minutes,
          normalized.seconds,
        );
        return {
          ...segment,
          actual_duration_min: normalized.minutes,
          actual_duration_sec: normalized.seconds,
          actual_duration_seconds: totalSeconds > 0 ? totalSeconds : null,
        };
      }),
    }));
  };

  const toggleSegment = (index) => {
    setSession((prev) => ({
      ...prev,
      segments: prev.segments.map((segment, currentIndex) => {
        if (currentIndex !== index) return segment;
        if (segment.is_completed) {
          return { ...segment, is_completed: 0 };
        }
        return initializeSegment({ ...segment, is_completed: 1 });
      }),
    }));
  };

  const sessionTotals = useMemo(() => {
    const completedSegments = (session?.segments || []).filter(
      (segment) => segment.is_completed,
    );
    const distance = completedSegments.reduce(
      (sum, segment) => sum + Number(segment.actual_distance_meters || 0),
      0,
    );
    const duration = completedSegments.reduce(
      (sum, segment) => sum + Number(segment.actual_duration_seconds || 0),
      0,
    );
    return {
      distance,
      duration,
      pace: distance > 0 && duration > 0 ? (duration * 1000) / distance : null,
    };
  }, [session]);

  const savePayload = () => ({
    notes: session.notes,
    segments: session.segments.map((segment) => ({
      id: segment.id,
      actual_distance_meters:
        Number(segment.actual_distance_meters || 0) > 0
          ? Number(segment.actual_distance_meters)
          : null,
      actual_duration_seconds:
        Number(segment.actual_duration_seconds || 0) > 0
          ? Number(segment.actual_duration_seconds)
          : null,
      actual_avg_hr:
        segment.actual_avg_hr !== "" && segment.actual_avg_hr !== null
          ? parseInt(segment.actual_avg_hr, 10)
          : null,
      actual_avg_cadence:
        segment.actual_avg_cadence !== "" && segment.actual_avg_cadence !== null
          ? parseInt(segment.actual_avg_cadence, 10)
          : null,
      is_completed: segment.is_completed ? 1 : 0,
      notes: segment.notes || null,
    })),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateActivityPlanSession(sessionId, savePayload());
      toast.success("Activity session sačuvan");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.updateActivityPlanSession(sessionId, savePayload());
      const result = await api.completeActivityPlanSession(sessionId);
      toast.success("Plan aktivnosti završen i upisan u istoriju aktivnosti");
      navigate(
        result.activity_id
          ? `/activity/${result.activity_id}`
          : "/activity-plans",
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !session) return <Loading />;

  return (
    <div className="page session-execution-page activity-plan-session-page">
      <div className="session-exec-header">
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/activity-plans")}
        >
          <FiArrowLeft /> Nazad
        </button>
        <div className="session-exec-title">
          <h1>🏃 {session.plan_name}</h1>
          <div className="session-exec-meta">
            <span className="session-progress-text">
              {session.activity_type_name} ·{" "}
              {
                (session.segments || []).filter(
                  (segment) => segment.is_completed,
                ).length
              }
              /{session.segments.length} segmenata
            </span>
          </div>
        </div>
        <div className="session-exec-actions">
          <button
            className="btn btn-ghost"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? "Čuvam..." : "Sačuvaj"}
          </button>
          <button
            className="btn btn-primary btn-complete"
            onClick={handleComplete}
            disabled={completing}
          >
            <FiCheckCircle /> {completing ? "Završavam..." : "Završi plan"}
          </button>
        </div>
      </div>

      <div className="meal-daily-totals-bar">
        <div className="meal-daily-total">
          <strong>{(sessionTotals.distance / 1000).toFixed(2)} km</strong>
          <small>Distanca</small>
        </div>
        <div className="meal-daily-total">
          <strong>{formatDuration(sessionTotals.duration)}</strong>
          <small>Vreme</small>
        </div>
        <div className="meal-daily-total">
          <strong>{formatPace(sessionTotals.pace)}</strong>
          <small>Tempo</small>
        </div>
      </div>

      <div className="card form-card" style={{ marginBottom: "1rem" }}>
        <div className="form-group">
          <label>Napomene sesije</label>
          <textarea
            rows={3}
            value={session.notes || ""}
            onChange={(event) =>
              setSession((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Unesi dodatne beleške o aktivnosti, uslovima, osećaju, opremi..."
          />
        </div>
      </div>

      <div className="session-exercises">
        {(session.segments || []).map((segment, index) => {
          const actualDistance = Number(segment.actual_distance_meters || 0);
          const actualDuration = Number(segment.actual_duration_seconds || 0);
          const actualPace =
            actualDistance > 0 && actualDuration > 0
              ? (actualDuration * 1000) / actualDistance
              : null;

          return (
            <div
              key={segment.id}
              className={`session-exercise-card ${segment.is_completed ? "completed" : ""}`}
            >
              <div className="session-exercise-header">
                <div className="session-exercise-info">
                  <span className="session-exercise-num">#{index + 1}</span>
                  <div>
                    <strong>{segment.title}</strong>
                    <span className="session-exercise-cat">
                      {formatSegmentKind(segment)} ·{" "}
                      {formatSegmentType(segment.segment_type)}
                      {segment.group_total > 1 && segment.group_index
                        ? ` · Set ${segment.group_index}/${segment.group_total}`
                        : ""}
                      {segment.repeat_total > 1 && segment.repeat_index
                        ? ` · Rep ${segment.repeat_index}/${segment.repeat_total}`
                        : ""}{" "}
                      · {formatTarget(segment)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="session-exercise-body">
                <div
                  className="form-grid"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  }}
                >
                  <div className="form-group">
                    <label>Distanca (km)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={segment.actual_distance_km ?? ""}
                      onChange={(event) =>
                        updateDistancePart(
                          index,
                          "actual_distance_km",
                          event.target.value,
                        )
                      }
                      placeholder="km"
                    />
                  </div>
                  <div className="form-group">
                    <label>Distanca (m)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={segment.actual_distance_m ?? ""}
                      onChange={(event) =>
                        updateDistancePart(
                          index,
                          "actual_distance_m",
                          event.target.value,
                        )
                      }
                      placeholder="m"
                    />
                  </div>
                  <div className="form-group">
                    <label>Vreme (min)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={segment.actual_duration_min ?? ""}
                      onChange={(event) =>
                        updateDurationPart(
                          index,
                          "actual_duration_min",
                          event.target.value,
                        )
                      }
                      placeholder="min"
                    />
                  </div>
                  <div className="form-group">
                    <label>Vreme (sek)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={segment.actual_duration_sec ?? ""}
                      onChange={(event) =>
                        updateDurationPart(
                          index,
                          "actual_duration_sec",
                          event.target.value,
                        )
                      }
                      placeholder="sek"
                    />
                  </div>
                  <div className="form-group">
                    <label>Stvarni tempo</label>
                    <input value={formatPace(actualPace)} disabled />
                  </div>
                </div>

                <div className="form-grid three-cols">
                  <div className="form-group">
                    <label>Avg HR</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.actual_avg_hr ?? ""}
                      onChange={(event) =>
                        patchSegment(index, {
                          actual_avg_hr: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Avg cadence</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.actual_avg_cadence ?? ""}
                      onChange={(event) =>
                        patchSegment(index, {
                          actual_avg_cadence: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Potvrda</label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        minHeight: "42px",
                      }}
                    >
                      <button
                        type="button"
                        className={`btn-check ${segment.is_completed ? "checked" : ""}`}
                        onClick={() => toggleSegment(index)}
                      >
                        <FiCheck />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Napomena segmenta</label>
                  <textarea
                    rows={2}
                    value={segment.notes || ""}
                    onChange={(event) =>
                      patchSegment(index, { notes: event.target.value })
                    }
                    placeholder="Kako je prošao segment, osećaj, uslovi, odstupanja..."
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityPlanSessionPage;
