import React from "react";
import { SLEEP_PERIOD_OPTIONS } from "./sleepUtils";

function SleepPeriodControls({ granularity, periodLabel, onGranularityChange, onPrevious, onNext }) {
  return (
    <div className="steps-period-controls">
      <div className="steps-period-buttons">
        {SLEEP_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`btn btn-sm ${granularity === opt.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onGranularityChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="steps-period-nav">
        <button className="btn btn-sm btn-ghost" onClick={onPrevious}>◀</button>
        <span className="steps-period-label">{periodLabel}</span>
        <button className="btn btn-sm btn-ghost" onClick={onNext}>▶</button>
      </div>
    </div>
  );
}

export default SleepPeriodControls;
