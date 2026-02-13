import React, { useState, useRef, useCallback, useEffect } from 'react';
import Card from '../components/common/Card';
import { FiPlay, FiPause, FiRotateCcw, FiSquare, FiBell, FiBellOff, FiRepeat, FiVolume2 } from 'react-icons/fi';

// ===== Zvučni sistem =====
function playBeep(frequency = 800, duration = 500, count = 3) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let time = audioCtx.currentTime;

  for (let i = 0; i < count; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration / 1000);
    osc.start(time);
    osc.stop(time + duration / 1000);
    time += (duration + 200) / 1000;
  }
}

// Glasniji alarm zvuk — zvono/sirena efekat
function playAlarmSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let time = audioCtx.currentTime;

  // 3 uzastopna zvona sa crescendo efektom
  const notes = [880, 1100, 880, 1100, 880];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    osc.start(time);
    osc.stop(time + 0.4);
    time += 0.45;
  });

  // Drugi layer — niži ton za "zvono" efekat
  setTimeout(() => {
    const audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
    let t = audioCtx2.currentTime;
    [660, 880, 660].forEach(freq => {
      const osc = audioCtx2.createOscillator();
      const gain = audioCtx2.createGain();
      osc.connect(gain);
      gain.connect(audioCtx2.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
      t += 0.55;
    });
  }, 2500);
}

function TimerPage() {
  // ===== STOPWATCH =====
  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0);
  const swIntervalRef = useRef(null);
  const swStartTimeRef = useRef(0);

  const startStopwatch = () => {
    if (swRunning) return;
    setSwRunning(true);
    swStartTimeRef.current = Date.now() - swTime;
    swIntervalRef.current = setInterval(() => {
      setSwTime(Date.now() - swStartTimeRef.current);
    }, 10);
  };

  const stopStopwatch = () => {
    setSwRunning(false);
    clearInterval(swIntervalRef.current);
  };

  const resetStopwatch = () => {
    setSwRunning(false);
    clearInterval(swIntervalRef.current);
    setSwTime(0);
  };

  // ===== TIMER =====
  const [timerMinutes, setTimerMinutes] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerFinished, setTimerFinished] = useState(false);
  const timerIntervalRef = useRef(null);
  const timerEndRef = useRef(0);

  const totalTimerMs = (timerMinutes * 60 + timerSeconds) * 1000;

  const startTimer = () => {
    if (timerRunning) return;
    const remaining = timerRemaining > 0 ? timerRemaining : totalTimerMs;
    if (remaining <= 0) return;

    setTimerFinished(false);
    setTimerRunning(true);
    timerEndRef.current = Date.now() + remaining;

    timerIntervalRef.current = setInterval(() => {
      const left = timerEndRef.current - Date.now();
      if (left <= 0) {
        clearInterval(timerIntervalRef.current);
        setTimerRemaining(0);
        setTimerRunning(false);
        setTimerFinished(true);
        playBeep(880, 400, 3);
      } else {
        setTimerRemaining(left);
      }
    }, 10);
  };

  const pauseTimer = () => {
    setTimerRunning(false);
    clearInterval(timerIntervalRef.current);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerFinished(false);
    clearInterval(timerIntervalRef.current);
    setTimerRemaining(0);
  };

  // ===== REPEAT ALARM =====
  const [alarmStartTime, setAlarmStartTime] = useState('');  // HH:MM
  const [alarmEndTime, setAlarmEndTime] = useState('');      // HH:MM
  const [alarmInterval, setAlarmInterval] = useState(10);    // minuti
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmNextRing, setAlarmNextRing] = useState(null);  // Date objekt
  const [alarmRingCount, setAlarmRingCount] = useState(0);
  const [alarmTotalRings, setAlarmTotalRings] = useState(0);
  const [alarmRinging, setAlarmRinging] = useState(false);
  const [alarmLog, setAlarmLog] = useState([]);
  const alarmIntervalRef = useRef(null);
  const alarmNextRingRef = useRef(null); // Ref za sinhrono praćenje — sprečava dupliranje

  const alarmPresets = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
    { label: '1 sat', value: 60 },
  ];

  const quickDurations = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 sat', minutes: 60 },
    { label: '2 sata', minutes: 120 },
    { label: '3 sata', minutes: 180 },
  ];

  // Izračunaj koliko zvona ukupno
  const calculateTotalRings = useCallback(() => {
    if (!alarmStartTime || !alarmEndTime || alarmInterval <= 0) return 0;
    const [sh, sm] = alarmStartTime.split(':').map(Number);
    const [eh, em] = alarmEndTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) return 0;
    return Math.floor((endMin - startMin) / alarmInterval);
  }, [alarmStartTime, alarmEndTime, alarmInterval]);

  // Quick set: postavi start na sada i end na sada + trajanje
  const quickSetAlarm = (durationMinutes) => {
    const now = new Date();
    const start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const endDate = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    setAlarmStartTime(start);
    setAlarmEndTime(end);
  };

  // Postavi start na sada
  const setStartNow = () => {
    const now = new Date();
    setAlarmStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  const startAlarm = () => {
    if (!alarmStartTime || !alarmEndTime || alarmInterval <= 0) return;

    const [sh, sm] = alarmStartTime.split(':').map(Number);
    const [eh, em] = alarmEndTime.split(':').map(Number);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(today.getTime() + (sh * 60 + sm) * 60 * 1000);
    const endDate = new Date(today.getTime() + (eh * 60 + em) * 60 * 1000);

    if (endDate <= startDate) return;

    const totalRings = calculateTotalRings();
    if (totalRings <= 0) return;

    setAlarmTotalRings(totalRings);
    setAlarmRingCount(0);
    setAlarmActive(true);
    setAlarmLog([]);

    // Računamo sledeće zvono
    const intervalMs = alarmInterval * 60 * 1000;
    let nextRing;

    if (now < startDate) {
      nextRing = new Date(startDate.getTime() + intervalMs);
    } else {
      const elapsed = now.getTime() - startDate.getTime();
      const intervalsPassed = Math.floor(elapsed / intervalMs);
      nextRing = new Date(startDate.getTime() + (intervalsPassed + 1) * intervalMs);
    }

    if (nextRing > endDate) {
      setAlarmActive(false);
      return;
    }

    // Koristi ref za sinhrono praćenje — sprečava dupliranje
    alarmNextRingRef.current = nextRing;
    setAlarmNextRing(nextRing);

    let ringCount = 0;
    const logEntries = [];

    alarmIntervalRef.current = setInterval(() => {
      const currentTime = new Date();

      if (currentTime >= endDate) {
        clearInterval(alarmIntervalRef.current);
        alarmNextRingRef.current = null;
        setAlarmActive(false);
        setAlarmNextRing(null);
        return;
      }

      const currentNextRing = alarmNextRingRef.current;
      if (!currentNextRing) return;

      if (currentTime >= currentNextRing) {
        // ZVONI! — odmah pomeri ref na sledeće zvono sinhrono
        const next = new Date(currentNextRing.getTime() + intervalMs);
        if (next > endDate) {
          alarmNextRingRef.current = null;
        } else {
          alarmNextRingRef.current = next;
        }
        setAlarmNextRing(alarmNextRingRef.current);

        // Pusti zvuk i ažuriraj UI
        playAlarmSound();
        setAlarmRinging(true);
        setTimeout(() => setAlarmRinging(false), 3000);

        ringCount++;
        logEntries.push({
          time: currentTime.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          number: ringCount
        });
        setAlarmRingCount(ringCount);
        setAlarmLog([...logEntries]);

        // Ako nema više zvona, zaustavi
        if (!alarmNextRingRef.current) {
          clearInterval(alarmIntervalRef.current);
          setTimeout(() => {
            setAlarmActive(false);
            setAlarmNextRing(null);
          }, 100);
        }
      }
    }, 500);
  };

  const stopAlarm = () => {
    setAlarmActive(false);
    setAlarmRinging(false);
    clearInterval(alarmIntervalRef.current);
    alarmNextRingRef.current = null;
    setAlarmNextRing(null);
  };

  const resetAlarm = () => {
    stopAlarm();
    setAlarmRingCount(0);
    setAlarmTotalRings(0);
    setAlarmLog([]);
  };

  // Countdown do sledećeg zvona
  const [alarmCountdown, setAlarmCountdown] = useState('');
  useEffect(() => {
    if (!alarmActive || !alarmNextRing) {
      setAlarmCountdown('');
      return;
    }

    const countdownInterval = setInterval(() => {
      const now = new Date();
      const diff = alarmNextRing.getTime() - now.getTime();
      if (diff <= 0) {
        setAlarmCountdown('🔔 ZVONI!');
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setAlarmCountdown(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
      }
    }, 250);

    return () => clearInterval(countdownInterval);
  }, [alarmActive, alarmNextRing]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(swIntervalRef.current);
      clearInterval(timerIntervalRef.current);
      clearInterval(alarmIntervalRef.current);
    };
  }, []);

  // Format time
  const formatTime = (ms, showMs = true) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    const pad = (n) => String(n).padStart(2, '0');
    if (showMs) return `${pad(minutes)}:${pad(seconds)}.${pad(milliseconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const timerProgress = totalTimerMs > 0
    ? ((totalTimerMs - timerRemaining) / totalTimerMs) * 100
    : 0;

  const presets = [
    { label: '1 min', min: 1, sec: 0 },
    { label: '2 min', min: 2, sec: 0 },
    { label: '3 min', min: 3, sec: 0 },
    { label: '5 min', min: 5, sec: 0 },
    { label: '30 sek', min: 0, sec: 30 },
    { label: '90 sek', min: 1, sec: 30 },
  ];

  const previewRings = calculateTotalRings();

  return (
    <div className="page timer-page">
      <h1 className="page-title">⏱️ Timer & Stopwatch</h1>

      <div className="timer-grid">
        {/* STOPWATCH */}
        <Card className="timer-card">
          <h2>Stopwatch</h2>
          <p className="timer-subtitle">Ručno merenje vremena</p>

          <div className="timer-display stopwatch-display">
            <span className="time-value">{formatTime(swTime)}</span>
          </div>

          <div className="timer-controls">
            {!swRunning ? (
              <button className="btn btn-primary btn-circle" onClick={startStopwatch}>
                <FiPlay />
              </button>
            ) : (
              <button className="btn btn-warning btn-circle" onClick={stopStopwatch}>
                <FiPause />
              </button>
            )}
            <button className="btn btn-secondary btn-circle" onClick={resetStopwatch}>
              <FiRotateCcw />
            </button>
          </div>
        </Card>

        {/* TIMER */}
        <Card className={`timer-card ${timerFinished ? 'timer-finished' : ''}`}>
          <h2>Timer</h2>
          <p className="timer-subtitle">Odbrojavanje do nule</p>

          {!timerRunning && timerRemaining === 0 && (
            <>
              <div className="timer-presets">
                {presets.map(p => (
                  <button
                    key={p.label}
                    className={`btn btn-sm ${timerMinutes === p.min && timerSeconds === p.sec ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setTimerMinutes(p.min); setTimerSeconds(p.sec); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="timer-input-row">
                <div className="timer-input-group">
                  <label>Min</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={timerMinutes}
                    onChange={e => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <span className="timer-colon">:</span>
                <div className="timer-input-group">
                  <label>Sek</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={e => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="timer-display countdown-display">
            <svg className="timer-svg" viewBox="0 0 200 200">
              <circle className="timer-bg-circle" cx="100" cy="100" r="90" />
              <circle
                className="timer-progress-circle"
                cx="100" cy="100" r="90"
                style={{
                  strokeDasharray: `${2 * Math.PI * 90}`,
                  strokeDashoffset: `${2 * Math.PI * 90 * (1 - timerProgress / 100)}`,
                }}
              />
            </svg>
            <span className={`time-value ${timerFinished ? 'time-finished' : ''}`}>
              {timerRemaining > 0 ? formatTime(timerRemaining, false) : formatTime(totalTimerMs, false)}
            </span>
          </div>

          {timerFinished && (
            <div className="timer-finished-message animate-pulse">
              🔔 VREME JE ISTEKLO! 🔔
            </div>
          )}

          <div className="timer-controls">
            {!timerRunning && !timerFinished && (
              <button className="btn btn-primary btn-circle" onClick={startTimer} disabled={totalTimerMs === 0}>
                <FiPlay />
              </button>
            )}
            {timerRunning && (
              <button className="btn btn-warning btn-circle" onClick={pauseTimer}>
                <FiPause />
              </button>
            )}
            {(timerRunning || timerRemaining > 0 || timerFinished) && (
              <button className="btn btn-secondary btn-circle" onClick={resetTimer}>
                <FiRotateCcw />
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* ===== REPEAT ALARM ===== */}
      <div className="alarm-section">
        <Card className={`alarm-card ${alarmRinging ? 'alarm-ringing' : ''} ${alarmActive ? 'alarm-active-card' : ''}`}>
          <div className="alarm-header">
            <div>
              <h2><FiBell /> Ponavljajući Alarm</h2>
              <p className="timer-subtitle">Podsetnik na svaki X minuta — idealno za serije vežbi</p>
            </div>
            {alarmActive && (
              <span className="alarm-status-badge">
                <FiVolume2 className="alarm-status-icon" /> AKTIVAN
              </span>
            )}
          </div>

          {!alarmActive ? (
            <div className="alarm-setup">
              {/* Brzo postavljanje trajanja */}
              <div className="alarm-quick-section">
                <label className="alarm-section-label">⚡ Brzo postavljanje trajanja</label>
                <div className="alarm-quick-buttons">
                  {quickDurations.map(q => (
                    <button
                      key={q.label}
                      className="btn btn-sm btn-secondary"
                      onClick={() => quickSetAlarm(q.minutes)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval */}
              <div className="alarm-quick-section">
                <label className="alarm-section-label">🔁 Interval alarma</label>
                <div className="alarm-quick-buttons">
                  {alarmPresets.map(p => (
                    <button
                      key={p.value}
                      className={`btn btn-sm ${alarmInterval === p.value ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAlarmInterval(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="alarm-custom-interval">
                  <label>Ili unesi ručno (min):</label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={alarmInterval}
                    onChange={e => setAlarmInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="alarm-interval-input"
                  />
                </div>
              </div>

              {/* Početno i krajnje vreme */}
              <div className="alarm-time-row">
                <div className="alarm-time-group">
                  <label>🕐 Početak</label>
                  <input
                    type="time"
                    value={alarmStartTime}
                    onChange={e => setAlarmStartTime(e.target.value)}
                    className="alarm-time-input"
                  />
                  <button className="btn btn-sm btn-secondary alarm-now-btn" onClick={setStartNow}>
                    Sada
                  </button>
                </div>
                <div className="alarm-time-group">
                  <label>🏁 Kraj</label>
                  <input
                    type="time"
                    value={alarmEndTime}
                    onChange={e => setAlarmEndTime(e.target.value)}
                    className="alarm-time-input"
                  />
                </div>
              </div>

              {/* Preview */}
              {alarmStartTime && alarmEndTime && (
                <div className="alarm-preview">
                  <FiRepeat />
                  <span>
                    {previewRings > 0
                      ? `Alarm će zvoniti ${previewRings}× — svaki${alarmInterval === 1 ? '' : 'h'} ${alarmInterval} min od ${alarmStartTime} do ${alarmEndTime}`
                      : 'Nevažeće vreme — krajnje vreme mora biti posle početnog.'
                    }
                  </span>
                </div>
              )}

              {/* Start dugme */}
              <button
                className="btn btn-primary btn-full alarm-start-btn"
                onClick={startAlarm}
                disabled={!alarmStartTime || !alarmEndTime || previewRings <= 0}
              >
                <FiBell /> Pokreni alarm
              </button>
            </div>
          ) : (
            <div className="alarm-running">
              {/* Countdown do sledećeg zvona */}
              <div className={`alarm-countdown ${alarmRinging ? 'alarm-countdown-ring' : ''}`}>
                <div className="alarm-countdown-label">Sledeće zvono za</div>
                <div className="alarm-countdown-value">{alarmCountdown}</div>
              </div>

              {/* Statistika */}
              <div className="alarm-stats">
                <div className="alarm-stat">
                  <span className="alarm-stat-value">{alarmRingCount}</span>
                  <span className="alarm-stat-label">Zvonilo</span>
                </div>
                <div className="alarm-stat">
                  <span className="alarm-stat-value">{alarmTotalRings - alarmRingCount}</span>
                  <span className="alarm-stat-label">Preostalo</span>
                </div>
                <div className="alarm-stat">
                  <span className="alarm-stat-value">{alarmInterval}min</span>
                  <span className="alarm-stat-label">Interval</span>
                </div>
                <div className="alarm-stat">
                  <span className="alarm-stat-value">{alarmEndTime}</span>
                  <span className="alarm-stat-label">Kraj</span>
                </div>
              </div>

              {/* Alarm Log */}
              {alarmLog.length > 0 && (
                <div className="alarm-log">
                  <h4>📋 Istorija zvona</h4>
                  <div className="alarm-log-list">
                    {alarmLog.map((entry, i) => (
                      <div key={i} className="alarm-log-entry">
                        <span className="alarm-log-number">#{entry.number}</span>
                        <span className="alarm-log-time">🔔 {entry.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kontrole */}
              <div className="timer-controls">
                <button className="btn btn-danger btn-full" onClick={stopAlarm}>
                  <FiBellOff /> Zaustavi alarm
                </button>
              </div>
            </div>
          )}

          {/* Reset ako je bilo aktivnosti */}
          {!alarmActive && alarmLog.length > 0 && (
            <div className="alarm-done">
              <div className="alarm-done-message">
                ✅ Alarm završen — zvonilo {alarmRingCount}× ukupno
              </div>
              <div className="alarm-log">
                <h4>📋 Istorija zvona</h4>
                <div className="alarm-log-list">
                  {alarmLog.map((entry, i) => (
                    <div key={i} className="alarm-log-entry">
                      <span className="alarm-log-number">#{entry.number}</span>
                      <span className="alarm-log-time">🔔 {entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn btn-secondary btn-full" onClick={resetAlarm} style={{ marginTop: 12 }}>
                <FiRotateCcw /> Resetuj
              </button>
            </div>
          )}
        </Card>

        {/* Test sound dugme */}
        <div className="alarm-test">
          <button className="btn btn-sm btn-secondary" onClick={playAlarmSound}>
            <FiVolume2 /> Test zvuka
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimerPage;
