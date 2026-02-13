import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Loading from './Loading';
import * as api from '../../services/api';
import { FiCalendar, FiHash, FiActivity, FiFileText, FiAward } from 'react-icons/fi';

function WorkoutDetailModal({ isOpen, onClose, workoutId }) {
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !workoutId) return;
    setLoading(true);
    api.getResultDetail(workoutId)
      .then(data => { setWorkout(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isOpen, workoutId]);

  const formatScore = (score, type, hasW) => {
    if (hasW) return `${score} vol`;
    if (type === 'seconds') return `${score}s`;
    if (type === 'minutes') return `${score}min`;
    if (type === 'meters') return `${score}m`;
    if (type === 'kg') return `${score}kg`;
    return `${score}x`;
  };

  const getUnitLabel = (type) => {
    switch (type) {
      case 'reps': return 'rep';
      case 'seconds': return 's';
      case 'minutes': return 'min';
      case 'meters': return 'm';
      case 'kg': return 'kg';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalji treninga">
      {loading || !workout ? (
        <Loading />
      ) : (
        <div className="workout-detail">
          {/* Header - Vežba info */}
          <div className="workout-detail-header">
            <span className="workout-detail-icon">{workout.exercise_icon}</span>
            <div>
              <h3 className="workout-detail-exercise">{workout.exercise_name}</h3>
              <span className="workout-detail-category">{workout.category_name}</span>
              {workout.has_weight ? <span className="workout-detail-tag">⚖️ Sa tegovima</span> : null}
            </div>
          </div>

          {/* Učesnik */}
          <div className="workout-detail-user">
            <div className="user-avatar small">
              {workout.profile_image
                ? <img src={workout.profile_image} alt="" />
                : <span className="avatar-placeholder small">{workout.first_name[0]}</span>
              }
            </div>
            <span>{workout.nickname || `${workout.first_name} ${workout.last_name || ''}`}</span>
          </div>

          {/* Score */}
          <div className="workout-detail-score">
            <FiAward />
            <span className="workout-score-value">
              {formatScore(parseFloat(workout.score), workout.value_type, workout.has_weight)}
            </span>
            <span className="workout-score-label">ukupan score</span>
          </div>

          {/* Stats */}
          <div className="workout-detail-stats">
            <div className="workout-stat">
              <FiHash />
              <span>{workout.total_sets} {workout.total_sets === 1 ? 'set' : 'setova'}</span>
            </div>
            <div className="workout-stat">
              <FiActivity />
              <span>{parseFloat(workout.total_reps)} ukupno {getUnitLabel(workout.value_type)}</span>
            </div>
            <div className="workout-stat">
              <FiCalendar />
              <span>{new Date(workout.attempt_date).toLocaleString('sr-RS', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}</span>
            </div>
          </div>

          {/* Setovi */}
          <div className="workout-detail-sets">
            <h4>Setovi</h4>
            <div className="workout-sets-grid">
              {workout.sets && workout.sets.map(s => (
                <div key={s.id} className="workout-set-card">
                  <span className="workout-set-num">Set {s.set_number}</span>
                  <span className="workout-set-reps">
                    {parseFloat(s.reps)} {getUnitLabel(workout.value_type)}
                  </span>
                  {s.weight && (
                    <span className="workout-set-weight">{parseFloat(s.weight)} kg</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Napomena */}
          {workout.notes && (
            <div className="workout-detail-notes">
              <FiFileText />
              <p>{workout.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default WorkoutDetailModal;
