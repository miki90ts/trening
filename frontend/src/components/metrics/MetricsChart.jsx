import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

function MetricsChart({ periodStats, granularity }) {
  const isYear = granularity === "year";

  const chartData = useMemo(() => {
    const rows = periodStats?.data || [];

    if (isYear) {
      return rows.map((row) => {
        const monthIdx = parseInt(row.month_key?.split("-")[1], 10) - 1;
        return {
          label: MONTH_SHORT[monthIdx] || row.month_key,
          value: Number.isFinite(parseFloat(row.avg_weight))
            ? parseFloat(row.avg_weight)
            : 0,
          entry_count: parseInt(row.entry_count, 10) || 0,
        };
      });
    }

    return rows.map((row) => ({
      label: new Date(row.bucket_key).toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
      }),
      value:
        row.avg_weight === null || row.avg_weight === undefined
          ? null
          : parseFloat(row.avg_weight),
    }));
  }, [periodStats, isYear]);

  const chartTitle = isYear
    ? "Kretanje kilaže (mesečni prosek)"
    : "Kretanje kilaže (dnevni prosek)";

  return (
    <Card className="chart-card">
      <h3>{chartTitle}</h3>
      {chartData.length === 0 ? (
        <p className="empty-state-small">Nema podataka za prikaz.</p>
      ) : (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
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
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(value) => [
                  value === null ? "-" : `${Math.round(value * 100) / 100} kg`,
                  isYear ? "Mesečni prosek" : "Dnevni prosek",
                ]}
                labelFormatter={(label) =>
                  isYear ? `Mesec: ${label}` : `Datum: ${label}`
                }
              />
              <Line
                dataKey="value"
                stroke="var(--accent-primary)"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                type="monotone"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default MetricsChart;
