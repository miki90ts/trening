import React from "react";
import { FiTrendingUp, FiCalendar, FiAward, FiActivity } from "react-icons/fi";

function AnalyticsTabs({ activeTab, onTabChange }) {
  return (
    <div className="analytics-tabs">
      <button
        className={`analytics-tab ${activeTab === "overview" ? "active" : ""}`}
        onClick={() => onTabChange("overview")}
      >
        <FiActivity /> Pregled
      </button>
      <button
        className={`analytics-tab ${activeTab === "progress" ? "active" : ""}`}
        onClick={() => onTabChange("progress")}
      >
        <FiTrendingUp /> Napredak
      </button>
      <button
        className={`analytics-tab ${activeTab === "period" ? "active" : ""}`}
        onClick={() => onTabChange("period")}
      >
        <FiCalendar /> Nedeljno / Mesečno
      </button>
      <button
        className={`analytics-tab ${activeTab === "records" ? "active" : ""}`}
        onClick={() => onTabChange("records")}
      >
        <FiAward /> Lični rekordi
      </button>
    </div>
  );
}

export default AnalyticsTabs;
