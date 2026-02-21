import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Card from "../common/Card";

const metricMap = {
  kcal: {
    key: "total_kcal",
    label: "Kalorije",
    suffix: "kcal",
    color: "var(--accent-primary)",
  },
  protein: {
    key: "total_protein",
    label: "Proteini",
    suffix: "g",
    color: "var(--accent-success)",
  },
  carbs: {
    key: "total_carbs",
    label: "Ugljeni hidrati",
    suffix: "g",
    color: "var(--accent-warning)",
  },
  fat: {
    key: "total_fat",
    label: "Masti",
    suffix: "g",
    color: "var(--accent-danger)",
  },
};

function NutritionCharts({ periodStats, metric }) {
  const config = metricMap[metric] || metricMap.kcal;

  const chartData = useMemo(() => {
    const rows = periodStats?.data || [];
    return rows.map((row) => ({
      label:
        periodStats?.period?.granularity === "year"
          ? row.bucket_key.slice(5)
          : new Date(row.bucket_key).toLocaleDateString("sr-RS", {
              day: "2-digit",
              month: "2-digit",
            }),
      value: parseFloat(row[config.key] || 0),
    }));
  }, [periodStats, config.key]);

  return (
    <Card className="chart-card">
      <h3>{config.label} kroz period</h3>
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
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <Tooltip
                formatter={(val) => [
                  `${Math.round(val * 100) / 100} ${config.suffix}`,
                  config.label,
                ]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Line
                dataKey="value"
                stroke={config.color}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default NutritionCharts;
