import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import Card from "../common/Card";
import { formatMl } from "./hydrationUtils";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Avg",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

function HydrationChart({ periodStats, summary, granularity }) {
  const goal = summary?.current_goal || 2500;
  const isYear = granularity === "year";

  const chartData = useMemo(() => {
    const rows = periodStats?.data || [];

    if (isYear) {
      // Monthly buckets
      return rows.map((row) => {
        const monthIdx = parseInt(row.month_key?.split("-")[1]) - 1;
        const daysTracked = parseInt(row.days_tracked) || 1;
        // For year view, goal reference = daily goal * days in that month
        const monthlyGoal = (parseInt(row.goal_ml) || goal) * daysTracked;
        return {
          label: MONTH_SHORT[monthIdx] || row.month_key,
          total_ml: parseInt(row.total_ml) || 0,
          goal_ml: monthlyGoal,
          entry_count: parseInt(row.entry_count) || 0,
          days_tracked: daysTracked,
        };
      });
    }

    // Daily buckets (7d / month)
    return rows.map((row) => ({
      label: new Date(row.bucket_key).toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
      }),
      total_ml: parseInt(row.total_ml) || 0,
      goal_ml: parseInt(row.goal_ml) || goal,
      entry_count: parseInt(row.entry_count) || 0,
    }));
  }, [periodStats, goal, isYear]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="hydration-chart-tooltip">
        <p className="hydration-tooltip-date">{label}</p>
        <p className="hydration-tooltip-value">{formatMl(data.total_ml)}</p>
        {isYear ? (
          <p className="hydration-tooltip-entries">
            {data.days_tracked} dana praćeno · {data.entry_count} unosa
          </p>
        ) : (
          <>
            <p className="hydration-tooltip-goal">
              Cilj: {formatMl(data.goal_ml)}
            </p>
            <p className="hydration-tooltip-entries">
              {data.entry_count} unosa
            </p>
          </>
        )}
      </div>
    );
  };

  const chartTitle = isYear
    ? "💧 Mesečni unos tečnosti"
    : "💧 Dnevni unos tečnosti";

  return (
    <Card className="chart-card">
      <h3>{chartTitle}</h3>
      {chartData.length === 0 ? (
        <p className="empty-state-small">Nema podataka za prikaz.</p>
      ) : (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              {!isYear && (
                <ReferenceLine
                  y={goal}
                  stroke="var(--accent-warning)"
                  strokeDasharray="5 5"
                  label={{
                    value: `Cilj: ${formatMl(goal)}`,
                    position: "insideTopRight",
                    fill: "var(--text-secondary)",
                    fontSize: 11,
                  }}
                />
              )}
              <Bar
                dataKey="total_ml"
                radius={[4, 4, 0, 0]}
                maxBarSize={isYear ? 50 : 40}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      !isYear && entry.total_ml >= entry.goal_ml
                        ? "var(--accent-success)"
                        : "var(--hydration-water)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default HydrationChart;
