import React from "react";
import Card from "../common/Card";
import Loading from "../common/Loading";
import PeriodControls from "./PeriodControls";
import {
  LineChart,
  Line,
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
import { formatShortDate } from "./periodUtils";

function ProgressTab({
  exercises,
  filteredCategories,
  selectedExercise,
  selectedCategory,
  onExerciseChange,
  onCategoryChange,
  loadingData,
  progressData,
  granularity,
  periodLabel,
  onGranularityChange,
  onPreviousPeriod,
  onNextPeriod,
}) {
  return (
    <div className="analytics-content">
      <Card className="analytics-filter-card">
        <div className="form-row">
          <div className="form-group">
            <label>Vežba</label>
            <select
              value={selectedExercise}
              onChange={(e) => onExerciseChange(e.target.value)}
            >
              <option value="">-- Izaberi vežbu --</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.icon} {ex.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Kategorija</label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={!selectedExercise}
            >
              <option value="">-- Izaberi kategoriju --</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.value_type}) {cat.has_weight ? "⚖️" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

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

      {progressData && progressData.data.length > 0 && (
        <>
          <Card className="chart-card">
            <h3>📈 Napredak (Score)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={progressData.data.map((d) => ({
                  ...d,
                  date: formatShortDate(d.attempt_date),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="date"
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
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: "#6366f1" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="chart-card">
            <h3>📊 Volume Load (težina × ponavljanja)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={progressData.data.map((d) => ({
                  ...d,
                  date: formatShortDate(d.attempt_date),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="date"
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
                  dataKey="volume_load"
                  name="Volume Load"
                  stroke="#8b5cf6"
                  fill="#8b5cf680"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="chart-card">
            <h3>📉 Ponavljanja i Setovi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={progressData.data.map((d) => ({
                  ...d,
                  date: formatShortDate(d.attempt_date),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="date"
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
                  dataKey="total_reps"
                  name="Ponavljanja"
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

          {progressData.category.has_weight === 1 &&
            progressData.data.some((d) => d.estimated_1rm > 0) && (
              <Card className="chart-card">
                <h3>🧠 Procenjeni 1RM (Epley formula)</h3>
                <p className="chart-description">
                  Formula: 1RM = težina × (1 + ponavljanja / 30)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={progressData.data
                      .filter((d) => d.estimated_1rm > 0)
                      .map((d) => ({
                        ...d,
                        date: formatShortDate(d.attempt_date),
                      }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-color)"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-secondary)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={12}
                      unit=" kg"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                      }}
                      formatter={(val) => [`${val} kg`, "Est. 1RM"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="estimated_1rm"
                      name="Est. 1RM (kg)"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="max_weight"
                      name="Max teg (kg)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
        </>
      )}

      {progressData && progressData.data.length === 0 && selectedCategory && (
        <Card className="empty-card">
          <p className="empty-state">Nema podataka za izabranu kategoriju.</p>
        </Card>
      )}

      {!selectedCategory && (
        <Card className="empty-card">
          <p className="empty-state">
            Izaberite vežbu i kategoriju za prikaz grafikona napretka.
          </p>
        </Card>
      )}
    </div>
  );
}

export default ProgressTab;
