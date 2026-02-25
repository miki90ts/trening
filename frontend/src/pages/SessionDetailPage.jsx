import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as api from '../services/api';
import Loading from '../components/common/Loading';
import {
  FiArrowLeft, FiCalendar, FiClock, FiCheckCircle, FiTrendingUp,
  FiTrendingDown, FiMinus
} from 'react-icons/fi';

function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getSession(sessionId);
      setSession(data);
    } catch (err) {
      toast.error('Greška pri učitavanju');
      navigate('/plans');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('sr-Latn-RS', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const formatTime = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleTimeString('sr-Latn-RS', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getDuration = () => {
    if (!session?.started_at || !session?.completed_at) return '-';
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.completed_at).getTime();
    const diffSec = Math.floor((end - start) / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
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

  const getDiff = (actual, target) => {
    if (actual == null || target == null) return null;
    const a = parseFloat(actual);
    const t = parseFloat(target);
    if (t === 0) return null;
    const diff = a - t;
    if (diff > 0) return { cls: 'positive', icon: <FiTrendingUp />, text: `+${diff}` };
    if (diff < 0) return { cls: 'negative', icon: <FiTrendingDown />, text: `${diff}` };
    return { cls: 'neutral', icon: <FiMinus />, text: '0' };
  };

  if (loading || !session) return <Loading />;

  return (
    <div className="page session-detail-page">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/plans')}>
          <FiArrowLeft /> Nazad
        </button>
        <h1 className="page-title">📊 {session.plan_name}</h1>
      </div>

      {/* Summary cards */}
      <div className="session-detail-summary">
        <div className="summary-card">
          <FiCalendar />
          <div>
            <small>Datum</small>
            <strong>{formatDate(session.scheduled_date)}</strong>
          </div>
        </div>
        <div className="summary-card">
          <FiClock />
          <div>
            <small>Trajanje</small>
            <strong>{getDuration()}</strong>
          </div>
        </div>
        <div className="summary-card">
          <FiClock />
          <div>
            <small>Početak</small>
            <strong>{formatTime(session.started_at)}</strong>
          </div>
        </div>
        <div className="summary-card">
          <FiCheckCircle />
          <div>
            <small>Status</small>
            <strong className="text-success">Završeno</strong>
          </div>
        </div>
      </div>

      {/* Exercises comparison */}
      <div className="session-detail-exercises">
        {session.exercises?.map((ex, idx) => {
          const completedSets = ex.sets?.filter(s => s.is_completed) || [];
          const skippedSets = ex.sets?.filter(s => !s.is_completed) || [];

          return (
            <div key={ex.id} className="session-detail-exercise">
              <div className="session-detail-exercise-header">
                <span className="plan-exercise-num">#{idx + 1}</span>
                <span>{ex.exercise_icon}</span>
                <div>
                  <strong>{ex.exercise_name}</strong>
                  <span className="session-exercise-cat">{ex.category_name}</span>
                </div>
                {ex.is_completed ?
                  <FiCheckCircle className="exercise-done-icon" /> :
                  <span className="text-muted">Preskočeno</span>
                }
              </div>

              {completedSets.length > 0 && (
                <div className="session-detail-sets-table">
                  <div className="session-detail-sets-header">
                    <span>Set</span>
                    <span>Cilj</span>
                    <span>Stvarno</span>
                    <span>Razlika</span>
                  </div>
                  {completedSets.map(s => {
                    const repsDiff = getDiff(s.actual_reps, s.target_reps);
                    const weightDiff = ex.has_weight ? getDiff(s.actual_weight, s.target_weight) : null;
                    const unit = getUnitLabel(ex.value_type);

                    return (
                      <div key={s.id} className="session-detail-set-row">
                        <span>{s.set_number}</span>
                        <span>
                          {s.target_reps != null ? `${parseFloat(s.target_reps)} ${unit}` : '-'}
                          {s.target_weight ? ` × ${parseFloat(s.target_weight)}kg` : ''}
                        </span>
                        <span>
                          {s.actual_reps != null ? `${parseFloat(s.actual_reps)} ${unit}` : '-'}
                          {s.actual_weight ? ` × ${parseFloat(s.actual_weight)}kg` : ''}
                        </span>
                        <span className="set-diff-cell">
                          {repsDiff && (
                            <span className={`set-diff ${repsDiff.cls}`}>
                              {repsDiff.icon} {repsDiff.text}
                            </span>
                          )}
                          {weightDiff && (
                            <span className={`set-diff ${weightDiff.cls}`}>
                              {weightDiff.icon} {weightDiff.text}kg
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {skippedSets.length > 0 && (
                <div className="session-detail-skipped">
                  <small>{skippedSets.length} set(ova) preskočeno</small>
                </div>
              )}

              {ex.notes && (
                <div className="session-detail-notes">
                  <small>📝 {ex.notes}</small>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {session.notes && (
        <div className="session-detail-global-notes card">
          <h4>📝 Beleška</h4>
          <p>{session.notes}</p>
        </div>
      )}
    </div>
  );
}

export default SessionDetailPage;
