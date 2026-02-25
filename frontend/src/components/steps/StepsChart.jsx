import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import Card from "../common/Card";

function StepsChart({ periodStats, summary }) {
  const goal = summary?.current_goal || 10000;

  const chartData = useMemo(() => {
    const rows = periodStats?.data || [];
    return rows.map((row) => ({
      label: new Date(row.bucket_key).toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
      }),
      steps: parseInt(row.step_count) || 0,
      goal: parseInt(row.goal) || goal,
    }));
  }, [periodStats, goal]);

  return (
    <Card className="chart-card">
      <h3>Dnevni koraci</h3>
      {chartData.length === 0 ? (
        <p className="empty-state-small">Nema podataka za prikaz.</p>
      ) : (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value.toLocaleString("sr-RS"), "Koraci"]}
                labelFormatter={(label) => `Datum: ${label}`}
              />
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
              <Bar dataKey="steps" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.steps >= entry.goal ? "var(--accent-success)" : "var(--accent-primary)"}
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
