import React from 'react';

function RecordBadge({ isNewRecord, previousValue, newValue, valueType }) {
  if (!isNewRecord) return null;

  const formatValue = (val) => {
    if (valueType === 'seconds') return `${val}s`;
    if (valueType === 'minutes') return `${val}min`;
    if (valueType === 'meters') return `${val}m`;
    if (valueType === 'kg') return `${val}kg`;
    return val;
  };

  return (
    <div className="record-badge animate-record">
      <span className="record-icon">🏆</span>
      <span className="record-text">NOVI REKORD!</span>
      {previousValue && (
        <span className="record-improvement">
          {formatValue(previousValue)} → {formatValue(newValue)}
        </span>
      )}
    </div>
  );
}

export default RecordBadge;
