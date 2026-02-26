import React, { useState, useEffect } from "react";
import { toYmd } from "./sleepUtils";

function SleepEntryForm({ initialData, isSubmitting, onSubmit, onCancel, currentTarget }) {
  const [sleepDate, setSleepDate] = useState(toYmd(new Date()));
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [awakeMin, setAwakeMin] = useState("");
  const [remMin, setRemMin] = useState("");
  const [lightMin, setLightMin] = useState("");
  const [deepMin, setDeepMin] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [minHr, setMinHr] = useState("");
  const [avgHrv, setAvgHrv] = useState("");
  const [targetMin, setTargetMin] = useState(currentTarget || 480);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setSleepDate(initialData.sleep_date ? toYmd(initialData.sleep_date) : toYmd(new Date()));
      setBedtime(initialData.bedtime ? initialData.bedtime.slice(0, 5) : "");
      setWakeTime(initialData.wake_time ? initialData.wake_time.slice(0, 5) : "");
      setAwakeMin(initialData.awake_min ?? "");
      setRemMin(initialData.rem_min ?? "");
      setLightMin(initialData.light_min ?? "");
      setDeepMin(initialData.deep_min ?? "");
      setSleepQuality(initialData.sleep_quality ?? "");
      setAvgHr(initialData.avg_hr ?? "");
      setMinHr(initialData.min_hr ?? "");
      setAvgHrv(initialData.avg_hrv ?? "");
      setTargetMin(initialData.target_min ?? currentTarget ?? 480);
      setNotes(initialData.notes || "");
    } else {
      setSleepDate(toYmd(new Date()));
      setBedtime("");
      setWakeTime("");
      setAwakeMin("");
      setRemMin("");
      setLightMin("");
      setDeepMin("");
      setSleepQuality("");
      setAvgHr("");
      setMinHr("");
      setAvgHrv("");
      setTargetMin(currentTarget || 480);
      setNotes("");
    }
  }, [initialData, currentTarget]);

  // Auto-compute duration preview
  const computedDuration = (() => {
    if (!bedtime || !wakeTime) return null;
    const [bh, bm] = bedtime.split(":").map(Number);
    const [wh, wm] = wakeTime.split(":").map(Number);
    let bed = bh * 60 + bm;
    let wake = wh * 60 + wm;
    if (wake <= bed) wake += 1440;
    return wake - bed;
  })();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sleepDate) return;

    onSubmit({
      sleep_date: sleepDate,
      bedtime: bedtime || null,
      wake_time: wakeTime || null,
      duration_min: computedDuration,
      awake_min: awakeMin !== "" ? parseInt(awakeMin) : null,
      rem_min: remMin !== "" ? parseInt(remMin) : null,
      light_min: lightMin !== "" ? parseInt(lightMin) : null,
      deep_min: deepMin !== "" ? parseInt(deepMin) : null,
      sleep_quality: sleepQuality !== "" ? parseFloat(sleepQuality) : null,
      avg_hr: avgHr !== "" ? parseInt(avgHr) : null,
      min_hr: minHr !== "" ? parseInt(minHr) : null,
      avg_hrv: avgHrv !== "" ? parseInt(avgHrv) : null,
      target_min: targetMin !== "" ? parseInt(targetMin) : null,
      notes: notes.trim() || null,
    });
  };

  const formatDurationPreview = (min) => {
    if (!min) return "";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `= ${h}h ${m}m`;
  };

  const targetHours = Math.floor(targetMin / 60);
  const targetMins = targetMin % 60;

  return (
    <form onSubmit={handleSubmit} className="steps-entry-form sleep-entry-form">
      {/* Row 1: Date & Target */}
      <div className="sleep-form-row">
        <div className="form-group">
          <label className="form-label">Datum</label>
          <input type="date" className="form-control" value={sleepDate} onChange={(e) => setSleepDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Cilj spavanja (min)</label>
          <input type="number" className="form-control" value={targetMin} onChange={(e) => setTargetMin(e.target.value)} min="0" step="30" placeholder="480" />
          <small className="form-hint">{targetHours}h {targetMins}m</small>
        </div>
      </div>

      {/* Row 2: Bedtime / Wake */}
      <div className="sleep-form-row">
        <div className="form-group">
          <label className="form-label">🛏️ Vreme ležanja</label>
          <input type="time" className="form-control" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">⏰ Vreme buđenja</label>
          <input type="time" className="form-control" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
        </div>
        {computedDuration && (
          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <span className="sleep-duration-preview">{formatDurationPreview(computedDuration)}</span>
          </div>
        )}
      </div>

      {/* Row 3: Sleep phases */}
      <details className="sleep-form-details">
        <summary>📊 Faze sna (opciono — sat/ring)</summary>
        <div className="sleep-form-row sleep-form-phases">
          <div className="form-group">
            <label className="form-label">Awake (min)</label>
            <input type="number" className="form-control" value={awakeMin} onChange={(e) => setAwakeMin(e.target.value)} min="0" placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">REM (min)</label>
            <input type="number" className="form-control" value={remMin} onChange={(e) => setRemMin(e.target.value)} min="0" placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Light (min)</label>
            <input type="number" className="form-control" value={lightMin} onChange={(e) => setLightMin(e.target.value)} min="0" placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Deep (min)</label>
            <input type="number" className="form-control" value={deepMin} onChange={(e) => setDeepMin(e.target.value)} min="0" placeholder="0" />
          </div>
        </div>
      </details>

      {/* Row 4: Biometrics */}
      <details className="sleep-form-details">
        <summary>❤️ Biometrija (opciono — sat/ring)</summary>
        <div className="sleep-form-row">
          <div className="form-group">
            <label className="form-label">Kvalitet sna (%)</label>
            <input type="number" className="form-control" value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)} min="0" max="100" step="1" placeholder="npr. 85" />
          </div>
          <div className="form-group">
            <label className="form-label">Avg HR (bpm)</label>
            <input type="number" className="form-control" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} min="30" max="200" placeholder="npr. 55" />
          </div>
          <div className="form-group">
            <label className="form-label">Min HR (bpm)</label>
            <input type="number" className="form-control" value={minHr} onChange={(e) => setMinHr(e.target.value)} min="25" max="200" placeholder="npr. 42" />
          </div>
          <div className="form-group">
            <label className="form-label">Avg HRV (ms)</label>
            <input type="number" className="form-control" value={avgHrv} onChange={(e) => setAvgHrv(e.target.value)} min="0" max="300" placeholder="npr. 52" />
          </div>
        </div>
      </details>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Napomena</label>
        <textarea className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Opciono..." />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Čuvam..." : initialData ? "Sačuvaj izmene" : "Dodaj"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Otkaži</button>
      </div>
    </form>
  );
}

export default SleepEntryForm;
