import React from "react";
import Card from "../common/Card";
import Loading from "../common/Loading";
import PeriodControls from "./PeriodControls";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatMonthLabel, formatShortDate } from "./periodUtils";

function getXAxisLabel(item, granularity) {
  if (granularity === "year") {
    return formatMonthLabel(item.bucket_key);
  }
  return formatShortDate(item.bucket_key);
}

function PeriodStatsTab({
  granularity,
  periodLabel,
  onGranularityChange,
  onPreviousPeriod,
  onNextPeriod,
  loadingData,
  periodStats,
}) {
  const chartData = (periodStats?.data || []).map((item) => ({
    ...item,
    label: getXAxisLabel(item, granularity),
    total_volume: parseFloat(item.total_volume || 0),
    total_reps: parseFloat(item.total_reps || 0),
  }));

  return (
    <div className="analytics-content">
      <Card className="analytics-filter-card">
        <PeriodControls
          granularity={granularity}
          periodLabel={periodLabel}
          onGranularityChange={onGranularityChange}
          onPrevious={onPreviousPeriod}
          onNext={onNextPeriod}
        />
      </Card>

      {loadingData && <Loading />}

      {!loadingData && chartData.length > 0 ? (
        <>
          <Card className="chart-card">
            <h3>📊 Pregled treninga po periodu</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="total_workouts"
                  name="Treninzi"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="training_days"
                  name="Dani"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="total_sets"
                  name="Setovi"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="chart-card">
            <h3>📈 Volumen i ponavljanja</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total_volume"
                  name="Volumen (kg)"
                  stroke="#8b5cf6"
                  fill="#8b5cf640"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="total_reps"
                  name="Ponavljanja"
                  stroke="#10b981"
                  fill="#10b98140"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3>📋 Detalji perioda</h3>
            <div className="results-table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Treninzi</th>
                    <th>Dani</th>
                    <th>Kategorije</th>
                    <th>Setovi</th>
                    <th>Ponavljanja</th>
                    <th>Volumen</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, i) => (
                    <tr key={i}>
                      <td>{item.label}</td>
                      <td>{item.total_workouts}</td>
                      <td>{item.training_days}</td>
                      <td>{item.categories_trained}</td>
                      <td>{item.total_sets}</td>
                      <td>{item.total_reps}</td>
                      <td>{parseFloat(item.total_volume).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        !loadingData && (
          <Card className="empty-card">
            <p className="empty-state">Nema podataka za izabrani period.</p>
          </Card>
        )
      )}
    </div>
  );
}

export default PeriodStatsTab;
