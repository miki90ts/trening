import React, { useState } from "react";
import Card from "../common/Card";
import { QUICK_ADD_OPTIONS } from "./hydrationUtils";

const DrinkIcon = ({ type, size = 56 }) => {
  const icons = {
    glass: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 8h32l-4 48H20L16 8z"
          fill="var(--hydration-water)"
          opacity="0.15"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 24c4 3 8-3 12 0s8-3 12 0"
          stroke="var(--hydration-water)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="32"
          cy="8"
          rx="16"
          ry="2"
          fill="var(--hydration-water)"
          opacity="0.3"
        />
      </svg>
    ),
    "small-bottle": (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="24"
          y="4"
          width="16"
          height="8"
          rx="2"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M24 12l-4 8v32a4 4 0 004 4h16a4 4 0 004-4V20l-4-8H24z"
          fill="var(--hydration-water)"
          opacity="0.15"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 30h24"
          stroke="var(--hydration-water)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <text
          x="32"
          y="44"
          textAnchor="middle"
          fill="var(--hydration-water)"
          fontSize="10"
          fontWeight="600"
        >
          330
        </text>
      </svg>
    ),
    "medium-bottle": (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="25"
          y="2"
          width="14"
          height="8"
          rx="2"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M25 10l-5 10v34a4 4 0 004 4h16a4 4 0 004-4V20l-5-10H25z"
          fill="var(--hydration-water)"
          opacity="0.15"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 26h24"
          stroke="var(--hydration-water)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <text
          x="32"
          y="44"
          textAnchor="middle"
          fill="var(--hydration-water)"
          fontSize="10"
          fontWeight="600"
        >
          0.5L
        </text>
      </svg>
    ),
    "large-bottle": (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="25"
          y="1"
          width="14"
          height="7"
          rx="2"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M25 8l-6 12v36a4 4 0 004 4h18a4 4 0 004-4V20l-6-12H25z"
          fill="var(--hydration-water)"
          opacity="0.15"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M19 24h26"
          stroke="var(--hydration-water)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <text
          x="32"
          y="44"
          textAnchor="middle"
          fill="var(--hydration-water)"
          fontSize="10"
          fontWeight="600"
        >
          0.7L
        </text>
      </svg>
    ),
    "liter-bottle": (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="26"
          y="0"
          width="12"
          height="7"
          rx="2"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M26 7l-8 14v35a4 4 0 004 4h20a4 4 0 004-4V21l-8-14H26z"
          fill="var(--hydration-water)"
          opacity="0.15"
          stroke="var(--hydration-water)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M18 24h28"
          stroke="var(--hydration-water)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <text
          x="32"
          y="46"
          textAnchor="middle"
          fill="var(--hydration-water)"
          fontSize="12"
          fontWeight="700"
        >
          1L
        </text>
      </svg>
    ),
    espresso: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 24h30v20a6 6 0 01-6 6H20a6 6 0 01-6-6V24z"
          fill="var(--hydration-coffee)"
          opacity="0.15"
          stroke="var(--hydration-coffee)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M44 28c6 0 8 4 8 8s-2 8-8 8"
          stroke="var(--hydration-coffee)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M10 24h38"
          stroke="var(--hydration-coffee)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M22 18c0-4 2-6 2-8"
          stroke="var(--hydration-coffee)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M29 16c0-4 2-6 2-8"
          stroke="var(--hydration-coffee)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M36 18c0-4 2-6 2-8"
          stroke="var(--hydration-coffee)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    "coffee-cup": (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 20h32v24a8 8 0 01-8 8H20a8 8 0 01-8-8V20z"
          fill="var(--hydration-coffee)"
          opacity="0.15"
          stroke="var(--hydration-coffee)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M44 24c6 0 10 4 10 10s-4 10-10 10"
          stroke="var(--hydration-coffee)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 20h40"
          stroke="var(--hydration-coffee)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M22 14c0-4 2-6 2-8"
          stroke="var(--hydration-coffee)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M32 12c0-4 2-6 2-8"
          stroke="var(--hydration-coffee)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    "tea-cup": (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 22h32v22a8 8 0 01-8 8H20a8 8 0 01-8-8V22z"
          fill="var(--hydration-tea)"
          opacity="0.15"
          stroke="var(--hydration-tea)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M44 26c6 0 9 4 9 9s-3 9-9 9"
          stroke="var(--hydration-tea)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 22h40"
          stroke="var(--hydration-tea)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M28 16c0-3 1.5-5 1.5-7"
          stroke="var(--hydration-tea)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
        <rect
          x="26"
          y="8"
          width="6"
          height="8"
          rx="1"
          fill="var(--hydration-tea)"
          opacity="0.2"
        />
        <line
          x1="29"
          y1="8"
          x2="29"
          y2="2"
          stroke="var(--hydration-tea)"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </svg>
    ),
  };

  return icons[type] || icons.glass;
};

function HydrationQuickAdd({ onQuickAdd, onManualAdd, disabled }) {
  const [animating, setAnimating] = useState(null);

  const handleClick = (option) => {
    if (disabled) return;
    setAnimating(option.id);
    onQuickAdd(option);
    setTimeout(() => setAnimating(null), 600);
  };

  // Group by type
  const waterOptions = QUICK_ADD_OPTIONS.filter((o) => o.type === "water");
  const coffeeOptions = QUICK_ADD_OPTIONS.filter((o) => o.type === "coffee");
  const teaOptions = QUICK_ADD_OPTIONS.filter((o) => o.type === "tea");

  const renderGroup = (title, emoji, options) => (
    <div className="hydration-quick-group">
      <h4 className="hydration-quick-group-title">
        {emoji} {title}
      </h4>
      <div className="hydration-quick-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`hydration-quick-btn ${animating === option.id ? "hydration-quick-btn-animate" : ""}`}
            onClick={() => handleClick(option)}
            disabled={disabled}
            title={`${option.label} (${option.amount} ml)`}
          >
            <div className="hydration-quick-icon">
              <DrinkIcon type={option.icon} />
              {animating === option.id && (
                <span className="hydration-quick-check">✓</span>
              )}
            </div>
            <span className="hydration-quick-amount">{option.amount} ml</span>
            <span className="hydration-quick-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="hydration-quick-card">
      <div className="hydration-quick-header">
        <h3>⚡ Brzi unos</h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onManualAdd}
        >
          ✏️ Ručni unos
        </button>
      </div>
      {renderGroup("Voda", "💧", waterOptions)}
      {renderGroup("Kafa", "☕", coffeeOptions)}
      {renderGroup("Čaj", "🍵", teaOptions)}
    </Card>
  );
}

export default HydrationQuickAdd;
