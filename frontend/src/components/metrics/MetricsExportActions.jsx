import React from "react";

function MetricsExportActions({ onExportCsv, onExportPdf }) {
  return (
    <div className="nutrition-export-actions">
      <button type="button" className="btn btn-secondary" onClick={onExportCsv}>
        Export tabele (CSV)
      </button>
      <button type="button" className="btn btn-primary" onClick={onExportPdf}>
        Export perioda (PDF)
      </button>
    </div>
  );
}

export default MetricsExportActions;
