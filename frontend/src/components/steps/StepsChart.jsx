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

const getYearMonthFromBucket = (bucketKey) => {
  if (!bucketKey) return null;

  if (typeof bucketKey === "string") {
    const match = bucketKey.match(/^(\d{4})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return { year, monthIndex };
      }
    }
  }

  const parsed = new Date(bucketKey);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    monthIndex: parsed.getMonth(),
  };
};

function StepsChart({ periodStats, summary, granularity }) {
  const goal = summary?.current_goal || 10000;
  const isYear = granularity === "year";

  const chartData = useMemo(() => {
    const rows = periodStats?.data || [];

    if (isYear) {
      const yearFromPeriod = parseInt(
        periodStats?.period?.start?.slice(0, 4),
        10,
      );
      const selectedYear = Number.isFinite(yearFromPeriod)
        ? yearFromPeriod
        : new Date().getFullYear();

      const totalsByMonth = new Array(12).fill(0);

      rows.forEach((row) => {
        const bucket = getYearMonthFromBucket(row.bucket_key);
        if (!bucket) return;
        if (bucket.year !== selectedYear) return;
        totalsByMonth[bucket.monthIndex] += parseInt(row.step_count, 10) || 0;
      });

      return totalsByMonth.map((total, monthIndex) => ({
        label: MONTH_SHORT[monthIndex],
        steps: total,
      }));
    }

    return rows.map((row) => ({
      label: new Date(row.bucket_key).toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
      }),
      steps: parseInt(row.step_count) || 0,
      goal: parseInt(row.goal) || goal,
    }));
  }, [periodStats, goal, isYear]);

  const chartTitle = isYear ? "Ukupno koraka po mesecima" : "Dnevni koraci";

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
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value.toLocaleString("sr-RS"), "Koraci"]}
                labelFormatter={(label) =>
                  isYear ? `Mesec: ${label}` : `Datum: ${label}`
                }
              />
              {!isYear && (
                <ReferenceLine
                  y={goal}
                  stroke="var(--accent-warning)"
                  strokeDasharray="5 5"
                  label={{
                    value: `Cilj: ${goal.toLocaleString("sr-RS")}`,
                    position: "insideTopRight",
                    fill: "var(--text-secondary)",
                    fontSize: 11,
                  }}
                />
              )}
              <Bar dataKey="steps" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      !isYear && entry.steps >= entry.goal
                        ? "var(--accent-success)"
                        : "var(--accent-primary)"
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

export default StepsChart;
