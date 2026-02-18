import React from "react";
import { FiDownload } from "react-icons/fi";

function AnalyticsExportActions({ onExportAll, onExportActive }) {
  return (
    <div className="section-header-buttons">
      <button className="btn btn-outline" onClick={onExportAll}>
        <FiDownload /> Izvezi sve
      </button>
      <button className="btn btn-primary" onClick={onExportActive}>
        <FiDownload /> Izvezi aktivni period
      </button>
    </div>
  );
}

export default AnalyticsExportActions;
