import React from "react";
import Card from "../common/Card";
import { formatNumber, formatMeters } from "./stepsUtils";
import { FiAward } from "react-icons/fi";

function StepsRecords({ records }) {
  if (!records) return null;

  const formatRecordDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("sr-RS", { day: "numeric", month: "short", year: "numeric" });
  };

  const items = [
    {
      label: "Najviše u danu",
      value: formatNumber(records.daily?.step_count),
      sub: formatRecordDate(records.daily?.step_date),
      icon: "🏆",
    },
    {
      label: "Najviše u nedelji",
      value: formatNumber(records.weekly?.total),
      sub: records.weekly
        ? `${formatRecordDate(records.weekly.week_start)} — ${formatRecordDate(records.weekly.week_end)}`
        : "-",
      icon: "📅",
    },
    {
      label: "Najviše u mesecu",
      value: formatNumber(records.monthly?.total),
      sub: records.monthly?.month_key || "-",
      icon: "📊",
    },
    {
      label: "Najviše u godini",
      value: formatNumber(records.yearly?.total),
      sub: records.yearly?.year_key ? `${records.yearly.year_key}` : "-",
      icon: "🗓️",
    },
    {
      label: "Prosečno dnevno",
      value: formatNumber(records.avg_daily),
      sub: formatMeters(records.avg_daily * 0.75) + "/dan",
      icon: "📈",
    },
    {
      label: "Ukupno pređeno",
      value: formatMeters(records.total_meters_alltime),
      sub: `${formatNumber(records.total_steps_alltime)} koraka · ${records.total_days_tracked} dana`,
      icon: "🚶",
    },
  ];

  return (
    <Card className="steps-records-card">
      <h3><FiAward /> Rekordi</h3>
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

export default StepsRecords;
