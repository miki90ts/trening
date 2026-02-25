import React from "react";
import Card from "../common/Card";
import { formatMl, formatNumber } from "./hydrationUtils";
import { FiAward } from "react-icons/fi";

function HydrationRecords({ records }) {
  if (!records) return null;

  const formatRecordDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const items = [
    {
      label: "Najviše u danu",
      value: formatMl(records.daily?.total_ml),
      sub: formatRecordDate(records.daily?.entry_date),
      icon: "🏆",
    },
    {
      label: "Najviše u nedelji",
      value: formatMl(records.weekly?.total_ml),
      sub: records.weekly
        ? `${formatRecordDate(records.weekly.week_start)} — ${formatRecordDate(records.weekly.week_end)}`
        : "-",
      icon: "📅",
    },
    {
      label: "Najviše u mesecu",
      value: formatMl(records.monthly?.total_ml),
      sub: records.monthly?.month_key || "-",
      icon: "📊",
    },
    {
      label: "Najviše u godini",
      value: formatMl(records.yearly?.total_ml),
      sub: records.yearly?.year_key ? `${records.yearly.year_key}` : "-",
      icon: "🗓️",
    },
    {
      label: "Prosečno dnevno",
      value: formatMl(records.avg_daily),
      sub: "svih dana",
      icon: "📈",
    },
    {
      label: "Ukupno popijeno",
      value: formatMl(records.total_ml_alltime),
      sub: `${records.total_days_tracked} dana praćeno`,
      icon: "💧",
    },
  ];

  return (
    <Card className="hydration-records-card">
      <h3>
        <FiAward /> Rekordi
      </h3>
      <div className="hydration-records-grid">
        {items.map((item, i) => (
          <div key={i} className="hydration-record-item">
            <span className="hydration-record-icon">{item.icon}</span>
            <div>
              <span className="hydration-record-label">{item.label}</span>
              <strong className="hydration-record-value">{item.value}</strong>
              <small className="hydration-record-sub">{item.sub}</small>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default HydrationRecords;
