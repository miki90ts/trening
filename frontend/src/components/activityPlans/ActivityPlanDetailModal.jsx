import React, { useEffect, useState } from "react";
import { FiActivity, FiHash, FiTarget } from "react-icons/fi";
import Modal from "../common/Modal";
import Loading from "../common/Loading";
import * as api from "../../services/api";

function formatPace(seconds) {
  const numeric = parseFloat(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const rounded = Math.round(numeric);
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}/km`;
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

function formatMetric(segment) {
  if (segment.target_metric === "pace") {
    const min = formatPace(segment.target_pace_min_sec_per_km);
    const max = formatPace(segment.target_pace_max_sec_per_km);
    if (min && max) return `pace ${min} - ${max}`;
    return min || max || "";
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

function formatTarget(segment) {
  const base =
    segment.target_type === "distance"
      ? `${((Number(segment.target_distance_meters || 0) || 0) / 1000).toFixed(2)} km`
      : formatDuration(segment.target_duration_seconds);
  const metric = formatMetric(segment);
  return metric ? `${base} · ${metric}` : base;
}

function formatRecovery(type, distance, duration) {
  if (type === "distance") {
    return `${((Number(distance || 0) || 0) / 1000).toFixed(2)} km`;
  }
  if (type === "duration") {
    return formatDuration(duration);
  }
  return "Bez recovery";
}

function ActivityPlanDetailModal({ isOpen, onClose, planId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !planId) return;
    setLoading(true);
    api
      .getActivityPlan(planId)
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, planId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏃 Detalji plana aktivnosti"
    >
      {loading || !plan ? (
        <Loading />
      ) : (
        <div className="plan-detail">
          <div className="plan-detail-header">
            <div
              className="plan-detail-color"
              style={{ background: plan.color || "#3b82f6" }}
            />
            <div>
              <h3>{plan.name}</h3>
              {plan.description && (
                <p className="plan-detail-desc">{plan.description}</p>
              )}
            </div>
          </div>

          <div className="plan-detail-stats">
            <div className="workout-stat">
              <FiActivity />
              <span>{plan.activity_type_name || "Aktivnost"}</span>
            </div>
            <div className="workout-stat">
              <FiHash />
              <span>{plan.segments?.length || 0} segmenata</span>
            </div>
            <div className="workout-stat">
              <FiTarget />
              <span>
                {plan.segments?.reduce((sum, segment) => {
                  const groupRepeats = Math.max(
                    1,
                    parseInt(segment.group_repeat_count, 10) || 1,
                  );
                  const repeats = Math.max(
                    1,
                    parseInt(segment.repeat_count, 10) || 1,
                  );
                  const work = groupRepeats * repeats;
                  const innerRecovery =
                    segment.recovery_type !== "none"
                      ? groupRepeats * Math.max(0, repeats - 1)
                      : 0;
                  const setRecovery =
                    groupRepeats > 1 && segment.group_recovery_type !== "none"
                      ? Math.max(0, groupRepeats - 1)
                      : 0;
                  return sum + work + innerRecovery + setRecovery;
                }, 0) || 0}{" "}
                execution koraka
              </span>
            </div>
          </div>

          <div className="plan-detail-exercises">
            {(plan.segments || []).map((segment, index) => (
              <div key={segment.id || index} className="plan-detail-exercise">
                <div className="plan-detail-exercise-header">
                  <span className="plan-exercise-num">#{index + 1}</span>
                  <div>
                    <strong>
                      {formatSegmentType(segment.segment_type)}
                      {segment.label ? ` · ${segment.label}` : ""}
                    </strong>
                    <span className="plan-detail-exercise-cat">
                      {formatTarget(segment)}
                    </span>
                  </div>
                </div>

                <div className="plan-detail-sets">
                  <span className="set-badge">
                    Repeat: {segment.repeat_count || 1}x
                  </span>
                  <span className="set-badge">
                    Recovery:{" "}
                    {formatRecovery(
                      segment.recovery_type,
                      segment.recovery_distance_meters,
                      segment.recovery_duration_seconds,
                    )}
                  </span>
                  <span className="set-badge">
                    Setovi: {segment.group_repeat_count || 1}x
                  </span>
                  {(segment.group_repeat_count || 1) > 1 && (
                    <span className="set-badge">
                      Set recovery:{" "}
                      {formatRecovery(
                        segment.group_recovery_type,
                        segment.group_recovery_distance_meters,
                        segment.group_recovery_duration_seconds,
                      )}
                    </span>
                  )}
                </div>

                {segment.notes && (
                  <div className="plan-detail-exercise-notes">
                    <span>{segment.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ActivityPlanDetailModal;
