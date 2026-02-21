import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { METRICS_PERIOD_OPTIONS } from "./metricsUtils";

function MetricsPeriodControls({
  granularity,
  periodLabel,
  onGranularityChange,
  onPrevious,
  onNext,
}) {
  return (
    <div className="analytics-period-controls">
      <div className="analytics-period-toggle">
        {METRICS_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={`analytics-period-btn ${granularity === option.key ? "active" : ""}`}
            onClick={() => onGranularityChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="analytics-period-nav">
        <button className="btn btn-outline" onClick={onPrevious}>
          <FiChevronLeft /> Nazad
        </button>
        <span className="analytics-period-label">{periodLabel}</span>
        <button className="btn btn-outline" onClick={onNext}>
          Napred <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

export default MetricsPeriodControls;
