import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';
import * as api from '../services/api';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';
import {
  FiArrowLeft, FiCheck, FiCheckCircle, FiPlus, FiX, FiClock,
  FiSave, FiPlay, FiChevronDown, FiChevronUp, FiAward, FiTrash2
} from 'react-icons/fi';

function SessionExecutionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { exercises, categories } = useApp();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [expandedExercises, setExpandedExercises] = useState({});
  const [recordsModal, setRecordsModal] = useState(null);

  // State za dodavanje nove vežbe
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseId, setNewExerciseId] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getSession(sessionId);
      setSession(data);

      // Ako je sesija scheduled, automatski je startuj
      if (data.status === 'scheduled') {
        await api.startSession(sessionId);
        data.status = 'in_progress';
        data.started_at = new Date().toISOString();
      }

      // Postavi elapsed timer
      if (data.started_at) {
        const start = new Date(data.started_at).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }

      // Expand sve po default-u
      const expanded = {};
      data.exercises?.forEach(ex => { expanded[ex.id] = true; });
      setExpandedExercises(expanded);

      setLoading(false);
    } catch (err) {
      toast.error('Greška pri učitavanju sesije');
      navigate('/plans');
    }
  }, [sessionId, navigate]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Timer
  useEffect(() => {
    if (session?.status === 'in_progress' && session?.started_at) {
      timerRef.current = setInterval(() => {
        const start = new Date(session.started_at).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status, session?.started_at]);

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const getUnitLabel = (type) => {
    switch (type) {
      case 'reps': return 'rep';
      case 'seconds': return 's';
      case 'minutes': return 'min';
      case 'meters': return 'm';
      default: return '';
    }
  };

  // Toggle expand
  const toggleExpand = (exId) => {
    setExpandedExercises(prev => ({ ...prev, [exId]: !prev[exId] }));
  };

  // Toggle set completion — auto-fill actual from target
  const toggleSet = (exIdx, setIdx) => {
    setSession(prev => {
      const updated = { ...prev };
      const exercises = [...updated.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      const s = { ...sets[setIdx] };

      s.is_completed = s.is_completed ? 0 : 1;
      if (s.is_completed && s.actual_reps == null) {
        s.actual_reps = s.target_reps;
        s.actual_weight = s.target_weight;
      }

      sets[setIdx] = s;
      ex.sets = sets;

      // Označi exercise kao completed ako su svi setovi completed
      const allDone = sets.every(ss => ss.is_completed);
      ex.is_completed = allDone ? 1 : 0;

      exercises[exIdx] = ex;
      updated.exercises = exercises;
      return updated;
    });
  };

  // Update actual value
  const updateSetValue = (exIdx, setIdx, field, value) => {
    setSession(prev => {
      const updated = { ...prev };
      const exercises = [...updated.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      ex.sets = sets;
      exercises[exIdx] = ex;
      updated.exercises = exercises;
      return updated;
    });
  };

  // Add extra set to existing exercise
  const addExtraSet = (exIdx) => {
    setSession(prev => {
      const updated = { ...prev };
      const exercises = [...updated.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      const nextNum = sets.length + 1;
      sets.push({
        id: null, // new set - no id
        set_number: nextNum,
        target_reps: null,
        target_weight: null,
        actual_reps: '',
        actual_weight: '',
        is_completed: 0
      });
      ex.sets = sets;
      exercises[exIdx] = ex;
      updated.exercises = exercises;
      return updated;
    });
  };

  // Remove a set from exercise
  const removeSet = (exIdx, setIdx) => {
    setSession(prev => {
      const updated = { ...prev };
      const exercises = [...updated.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = ex.sets.filter((_, i) => i !== setIdx);
      sets.forEach((s, i) => { s.set_number = i + 1; });
      ex.sets = sets;
      ex.is_completed = sets.length > 0 && sets.every(ss => ss.is_completed) ? 1 : 0;
      exercises[exIdx] = ex;
      updated.exercises = exercises;
      return updated;
    });
  };

  // Remove entire exercise from session
  const removeExercise = (exIdx) => {
    if (!window.confirm('Obriši ovu vežbu iz sesije?')) return;
    setSession(prev => {
      const updated = { ...prev };
      updated.exercises = updated.exercises.filter((_, i) => i !== exIdx);
      return updated;
    });
  };

  // Toggle all sets in an exercise completed/uncompleted
  const toggleAllSets = (exIdx) => {
    setSession(prev => {
      const updated = { ...prev };
      const exercises = [...updated.exercises];
      const ex = { ...exercises[exIdx] };
      const allCompleted = ex.sets.every(s => s.is_completed);
      const newVal = allCompleted ? 0 : 1;
      ex.sets = ex.sets.map(s => {
        const ns = { ...s, is_completed: newVal };
        if (newVal && ns.actual_reps == null) {
          ns.actual_reps = ns.target_reps;
          ns.actual_weight = ns.target_weight;
        }
        return ns;
      });
      ex.is_completed = newVal;
      exercises[exIdx] = ex;
      updated.exercises = exercises;
      return updated;
    });
  };

  // Add new exercise to session
  const handleAddExercise = () => {
    if (!newCategoryId) return;
    const cat = categories.find(c => c.id === parseInt(newCategoryId));
    const ex = exercises.find(e => e.id === parseInt(newExerciseId));
    if (!cat || !ex) return;

    setSession(prev => {
      const updated = { ...prev };
      updated.exercises = [...updated.exercises, {
        id: null, // indicates new exercise
        category_id: parseInt(newCategoryId),
        category_name: cat.name,
        exercise_name: ex.name,
        exercise_icon: ex.icon,
        has_weight: cat.has_weight,
        value_type: cat.value_type,
        order_index: updated.exercises.length,
        notes: null,
        is_completed: 0,
        sets: [{
          id: null,
          set_number: 1,
          target_reps: null,
          target_weight: null,
          actual_reps: '',
          actual_weight: '',
          is_completed: 0
        }]
      }];
      return updated;
    });

    // Expand the new exercise
    setExpandedExercises(prev => ({ ...prev, ['new_' + Date.now()]: true }));
    setAddingExercise(false);
    setNewExerciseId('');
    setNewCategoryId('');
  };

  // Save progress
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSession(sessionId, {
        exercises: session.exercises.map(ex => ({
          id: ex.id,
          category_id: ex.category_id,
          is_completed: ex.is_completed,
          notes: ex.notes,
          sets: ex.sets.map(s => ({
            id: s.id,
            target_reps: s.target_reps,
            target_weight: s.target_weight,
            actual_reps: s.actual_reps != null && s.actual_reps !== '' ? parseFloat(s.actual_reps) : null,
            actual_weight: s.actual_weight != null && s.actual_weight !== '' ? parseFloat(s.actual_weight) : null,
            is_completed: s.is_completed
          }))
        })),
        notes: session.notes
      });
      toast.success('Progres sačuvan');
    } catch (err) {
      toast.error('Greška pri čuvanju');
    } finally {
      setSaving(false);
    }
  };

  // Complete session
  const handleComplete = async () => {
    // Check if any sets are completed
    const anyCompleted = session.exercises.some(ex =>
      ex.sets.some(s => s.is_completed && s.actual_reps != null && s.actual_reps !== '')
    );
    if (!anyCompleted) {
      toast.warning('Nema završenih setova. Označi bar jedan set.');
      return;
    }

    if (!window.confirm('Završi trening? Svi označeni setovi će biti upisani kao rezultati.')) return;

    setCompleting(true);
    try {
      // Save first
      await api.updateSession(sessionId, {
        exercises: session.exercises.map(ex => ({
          id: ex.id,
          category_id: ex.category_id,
          is_completed: ex.is_completed,
          notes: ex.notes,
          sets: ex.sets.map(s => ({
            id: s.id,
            target_reps: s.target_reps,
            target_weight: s.target_weight,
            actual_reps: s.actual_reps != null && s.actual_reps !== '' ? parseFloat(s.actual_reps) : null,
            actual_weight: s.actual_weight != null && s.actual_weight !== '' ? parseFloat(s.actual_weight) : null,
            is_completed: s.is_completed
          }))
        })),
        notes: session.notes
      });

      // Then complete
      const result = await api.completeSession(sessionId);

      if (result.new_records && result.new_records.length > 0) {
        setRecordsModal(result.new_records);
      } else {
        toast.success('Trening završen! 💪');
        navigate('/plans');
      }
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    } finally {
      setCompleting(false);
    }
  };

  const getFilteredCategories = (exerciseId) => {
    if (!exerciseId) return [];
    return categories.filter(c => c.exercise_id === parseInt(exerciseId));
  };

  // Count completed sets
  const getCompletionStats = () => {
    if (!session?.exercises) return { done: 0, total: 0 };
    let done = 0, total = 0;
    session.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        total++;
        if (s.is_completed) done++;
      });
    });
    return { done, total };
  };

  if (loading || !session) return <Loading />;

  const stats = getCompletionStats();
  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="page session-execution-page">
      {/* Header */}
      <div className="session-exec-header">
        <button className="btn btn-ghost" onClick={() => navigate('/plans')}>
          <FiArrowLeft /> Nazad
        </button>
        <div className="session-exec-title">
          <h1>{session.plan_name}</h1>
          <div className="session-exec-meta">
            <span className="session-timer"><FiClock /> {formatElapsed(elapsed)}</span>
            <span className="session-progress-text">{stats.done}/{stats.total} setova</span>
          </div>
        </div>
        <div className="session-exec-actions">
          <button className="btn btn-ghost" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? 'Čuvam...' : 'Sačuvaj'}
          </button>
          <button className="btn btn-primary btn-complete" onClick={handleComplete} disabled={completing}>
            <FiCheckCircle /> {completing ? 'Završavam...' : 'Završi trening'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="session-progress-bar">
        <div className="session-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Exercises */}
      <div className="session-exercises">
        {session.exercises.map((ex, exIdx) => {
          const exKey = ex.id || `new_${exIdx}`;
          const isExpanded = expandedExercises[exKey] !== false;
          const exCompleted = ex.sets.every(s => s.is_completed);

          return (
            <div key={exKey} className={`session-exercise-card ${exCompleted ? 'completed' : ''}`}>
              <div className="session-exercise-header" onClick={() => toggleExpand(exKey)}>
                <div className="session-exercise-info">
                  <span className="session-exercise-num">#{exIdx + 1}</span>
                  <span className="session-exercise-icon">{ex.exercise_icon}</span>
                  <div>
                    <strong>{ex.exercise_name}</strong>
                    <span className="session-exercise-cat">{ex.category_name}</span>
                  </div>
                </div>
                <div className="session-exercise-right">
                  {exCompleted && <FiCheckCircle className="exercise-done-icon" />}
                  <button
                    className="btn btn-sm btn-ghost btn-danger-ghost"
                    onClick={(e) => { e.stopPropagation(); removeExercise(exIdx); }}
                    title="Obriši vežbu"
                  >
                    <FiTrash2 />
                  </button>
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {isExpanded && (
                <div className="session-exercise-body">
                  {/* Sets table */}
                  <div className="session-sets-table">
                    <div className="session-sets-header">
                      <span>Set</span>
                      <span>Cilj</span>
                      <span>Stvarno</span>
                      {ex.has_weight ? <span>Teg (kg)</span> : <span></span>}
                      <span
                        className="session-sets-check-all"
                        onClick={() => toggleAllSets(exIdx)}
                        title={ex.sets.every(s => s.is_completed) ? 'Poništi sve' : 'Označi sve'}
                      >
                        <FiCheckCircle />
                      </span>
                      <span></span>
                    </div>

                    {ex.sets.map((s, setIdx) => (
                      <div key={s.id || `new_${setIdx}`} className={`session-set-row ${s.is_completed ? 'completed' : ''}`}>
                        <span className="set-num">{s.set_number}</span>

                        <span className="set-target">
                          {s.target_reps != null ? `${parseFloat(s.target_reps)} ${getUnitLabel(ex.value_type)}` : '-'}
                          {s.target_weight ? ` × ${parseFloat(s.target_weight)}kg` : ''}
                        </span>

                        <div className="form-group">
                          <input
                            type="number"
                            className="form-control session-input"
                            placeholder={s.target_reps != null ? String(parseFloat(s.target_reps)) : '0'}
                            value={s.actual_reps != null ? s.actual_reps : ''}
                            onChange={e => updateSetValue(exIdx, setIdx, 'actual_reps', e.target.value)}
                            step="any"
                          />
                        </div>

                        {ex.has_weight ? (
                          <div className="form-group">
                            <input
                              type="number"
                              className="form-control session-input"
                              placeholder={s.target_weight ? String(parseFloat(s.target_weight)) : '0'}
                              value={s.actual_weight != null ? s.actual_weight : ''}
                              onChange={e => updateSetValue(exIdx, setIdx, 'actual_weight', e.target.value)}
                              step="any"
                            />
                          </div>
                        ) : <span></span>}

                        <button
                          className={`btn-check ${s.is_completed ? 'checked' : ''}`}
                          onClick={() => toggleSet(exIdx, setIdx)}
                        >
                          <FiCheck />
                        </button>

                        <button
                          className="btn-remove-set"
                          onClick={() => removeSet(exIdx, setIdx)}
                          title="Obriši set"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-sm btn-ghost session-add-set" onClick={() => addExtraSet(exIdx)}>
                    <FiPlus /> Dodaj set
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add exercise button */}
        {!addingExercise ? (
          <button className="btn btn-ghost session-add-exercise" onClick={() => setAddingExercise(true)}>
            <FiPlus /> Dodaj vežbu
          </button>
        ) : (
          <div className="session-add-exercise-form card">
            <h4>Dodaj novu vežbu</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vežba</label>
                <select
                  className="form-control"
                  value={newExerciseId}
                  onChange={e => { setNewExerciseId(e.target.value); setNewCategoryId(''); }}
                >
                  <option value="">— Izaberi vežbu —</option>
                  {exercises.map(e => (
                    <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kategorija</label>
                <select
                  className="form-control"
                  value={newCategoryId}
                  onChange={e => setNewCategoryId(e.target.value)}
                  disabled={!newExerciseId}
                >
                  <option value="">— Izaberi kategoriju —</option>
                  {getFilteredCategories(newExerciseId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" onClick={handleAddExercise} disabled={!newCategoryId}>
                <FiPlus /> Dodaj
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => { setAddingExercise(false); setNewExerciseId(''); setNewCategoryId(''); }}>
                <FiX /> Otkaži
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Records modal */}
      <Modal isOpen={!!recordsModal} onClose={() => { setRecordsModal(null); navigate('/plans'); }} title="🏆 Novi rekordi!">
        {recordsModal && (
          <div className="session-records">
            <p className="session-records-intro">Čestitamo! Oborio si lične rekorde:</p>
            {recordsModal.map((r, i) => (
              <div key={i} className="session-record-item">
                <span className="session-record-icon">{r.exercise_icon} <FiAward className="record-trophy" /></span>
                <div>
                  <strong>{r.exercise_name} — {r.category_name}</strong>
                  <span className="session-record-score">
                    Novi: <b>{r.new_score}</b>
                    {r.previous_record != null && <> (prethodni: {r.previous_record})</>}
                  </span>
                </div>
              </div>
            ))}
            <button className="btn btn-primary" onClick={() => { setRecordsModal(null); navigate('/plans'); }} style={{ marginTop: '1rem', width: '100%' }}>
              Završi
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SessionExecutionPage;
