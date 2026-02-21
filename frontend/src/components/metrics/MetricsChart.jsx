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

function MetricsChart({ periodStats }) {
  const chartData = useMemo(() => {
    const rows = periodStats?.data || [];
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
  }, [periodStats]);

  return (
    <Card className="chart-card">
      <h3>Kretanje kilaže (dnevni prosek)</h3>
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
                  "Dnevni prosek",
                ]}
                labelFormatter={(label) => `Datum: ${label}`}
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
