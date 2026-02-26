import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import Card from "../common/Card";
import { formatDuration, SLEEP_PHASES, toYmd } from "./sleepUtils";

function SleepChart({ periodStats, summary }) {
  const durationData = useMemo(() => {
    if (!periodStats?.data) return [];
    return periodStats.data.map((row) => {
      const dateStr = toYmd(row.bucket_key);
      const d = new Date(`${dateStr}T00:00:00`);
      return {
        date: d.toLocaleDateString("sr-RS", { day: "numeric", month: "short" }),
        duration: row.duration_min ? parseFloat((row.duration_min / 60).toFixed(2)) : 0,
        target: row.target_min ? parseFloat((row.target_min / 60).toFixed(2)) : 8,
        quality: row.sleep_quality || 0,
        avg_hr: row.avg_hr || 0,
        avg_hrv: row.avg_hrv || 0,
        deep: row.deep_min || 0,
        light: row.light_min || 0,
        rem: row.rem_min || 0,
        awake: row.awake_min || 0,
        met: row.duration_min && row.target_min ? row.duration_min >= row.target_min : false,
      };
    });
  }, [periodStats]);

  const phaseAvg = useMemo(() => {
    if (!summary) return [];
    const phases = [
      { name: "Deep", value: summary.avg_deep || 0, color: "#3b82f6" },
      { name: "Light", value: summary.avg_light || 0, color: "#60a5fa" },
      { name: "REM", value: summary.avg_rem || 0, color: "#a78bfa" },
      { name: "Awake", value: summary.avg_awake || 0, color: "#f59e0b" },
    ].filter(p => p.value > 0);
    return phases;
  }, [summary]);

  const targetHours = summary ? (summary.current_target || 480) / 60 : 8;

  if (durationData.length === 0) {
    return <Card><p className="empty-state-small">Nema podataka za grafikon.</p></Card>;
  }

  return (
    <div className="sleep-charts-grid">
      {/* Duration bar chart */}
      <Card>
        <h3>🛏️ Trajanje sna (sati)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={durationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, "auto"]} />
            <Tooltip
              formatter={(value, name) => {
                if (name === "duration") return [`${value}h`, "Spavanje"];
                if (name === "target") return [`${value}h`, "Cilj"];
                return [value, name];
              }}
            />
            <ReferenceLine y={targetHours} stroke="var(--accent-warning)" strokeDasharray="5 5" label={{ value: "Cilj", fill: "var(--accent-warning)", fontSize: 11 }} />
            <Bar dataKey="duration" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {durationData.map((entry, i) => (
                <Cell key={i} fill={entry.met ? "var(--accent-success)" : "var(--accent-primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Sleep phases pie chart */}
      {phaseAvg.length > 0 && (
        <Card>
          <h3>🧬 Prosečne faze sna</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={phaseAvg}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name} ${formatDuration(value)}`}
                labelLine={{ stroke: "var(--text-secondary)", strokeWidth: 1 }}
              >
                {phaseAvg.map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatDuration(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Quality trend */}
      {durationData.some(d => d.quality > 0) && (
        <Card>
          <h3>⭐ Kvalitet sna (%)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={durationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "Kvalitet"]} />
              <Line type="monotone" dataKey="quality" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* HR & HRV trend */}
      {durationData.some(d => d.avg_hr > 0) && (
        <Card>
          <h3>❤️ HR & HRV trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={durationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg_hr" name="Avg HR" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avg_hrv" name="Avg HRV" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Stacked phase bar chart */}
      {durationData.some(d => d.deep > 0 || d.light > 0 || d.rem > 0) && (
        <Card>
          <h3>📊 Faze sna po danima (min)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={durationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, name) => [`${v} min`, name]} />
              <Legend />
              <Bar dataKey="deep" name="Deep" stackId="phases" fill="#3b82f6" />
              <Bar dataKey="light" name="Light" stackId="phases" fill="#60a5fa" />
              <Bar dataKey="rem" name="REM" stackId="phases" fill="#a78bfa" />
              <Bar dataKey="awake" name="Awake" stackId="phases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

export default SleepChart;
