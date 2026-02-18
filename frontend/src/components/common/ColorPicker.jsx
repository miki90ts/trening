import React from "react";

const PRESET_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#d946ef",
  "#0ea5e9",
  "#e11d48",
  "#a855f7",
  "#78716c",
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      <div className="color-picker-grid">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`color-picker-swatch ${value === color ? "color-picker-swatch--selected" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
      </div>
      <div className="color-picker-custom">
        <input
          type="color"
          value={value || "#6366f1"}
          onChange={(e) => onChange(e.target.value)}
          className="color-picker-input"
        />
        <span className="color-picker-value">{value || "#6366f1"}</span>
      </div>
    </div>
  );
}

export { PRESET_COLORS };
export default ColorPicker;
