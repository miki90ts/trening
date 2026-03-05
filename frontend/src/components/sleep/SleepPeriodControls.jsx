import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SLEEP_PERIOD_OPTIONS } from "./sleepUtils";

function SleepPeriodControls({
  granularity,
  periodLabel,
  onGranularityChange,
  onPrevious,
  onNext,
}) {
  return (
    <div className="analytics-period-controls">
      <div className="analytics-period-toggle">
        {SLEEP_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`analytics-period-btn ${granularity === opt.key ? "active" : ""}`}
            onClick={() => onGranularityChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="analytics-period-nav">
        <button className="btn btn-ghost" onClick={onPrevious}>
          <FiChevronLeft />
        </button>
        <span className="analytics-period-label">{periodLabel}</span>
        <button className="btn btn-ghost" onClick={onNext}>
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

export default SleepPeriodControls;
