import React from "react";
import Card from "../common/Card";
import {
  formatDuration,
  formatNumber,
  formatQuality,
  toYmd,
} from "./sleepUtils";
import { FiAward } from "react-icons/fi";

function SleepRecords({ records }) {
  if (!records) return null;

  const formatRecordDate = (d) => {
    if (!d) return "-";
    const normalizedDate = toYmd(d);
    return new Date(`${normalizedDate}T00:00:00`).toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const items = [
    {
      label: "Najduže spavanje",
      value: formatDuration(records.longest_sleep?.duration_min),
      sub: formatRecordDate(records.longest_sleep?.sleep_date),
      icon: "🛏️",
    },
    {
      label: "Najbolji kvalitet",
      value: formatQuality(records.best_quality?.sleep_quality),
      sub: formatRecordDate(records.best_quality?.sleep_date),
      icon: "⭐",
    },
    {
      label: "Najniži HR",
      value: records.lowest_hr?.min_hr
        ? `${records.lowest_hr.min_hr} bpm`
        : "-",
      sub: formatRecordDate(records.lowest_hr?.sleep_date),
      icon: "❤️",
    },
    {
      label: "Najbolji HRV",
      value: records.best_hrv?.avg_hrv ? `${records.best_hrv.avg_hrv} ms` : "-",
      sub: formatRecordDate(records.best_hrv?.sleep_date),
      icon: "💚",
    },
    {
      label: "Najviše deep sleep",
      value: formatDuration(records.most_deep?.deep_min),
      sub: formatRecordDate(records.most_deep?.sleep_date),
      icon: "🌊",
    },
    {
      label: "Najviše REM",
      value: formatDuration(records.most_rem?.rem_min),
      sub: formatRecordDate(records.most_rem?.sleep_date),
      icon: "🧠",
    },
    {
      label: "Prosečno spavanja",
      value: formatDuration(records.avg_duration_alltime),
      sub: `${records.total_days_tracked} noći praćeno`,
      icon: "📈",
    },
    {
      label: "Prosečan kvalitet",
      value: formatQuality(records.avg_quality_alltime),
      sub: "svih vremena",
      icon: "📊",
    },
  ];

  return (
    <Card className="steps-records-card mt-3">
      <h3>
        <FiAward /> Rekordi
      </h3>
      <div className="steps-records-grid">
        {items.map((item, i) => (
          <div key={i} className="steps-record-item">
            <span className="steps-record-icon">{item.icon}</span>
            <div>
              <span className="steps-record-label">{item.label}</span>
              <strong className="steps-record-value">{item.value}</strong>
              <small className="steps-record-sub">{item.sub}</small>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default SleepRecords;
