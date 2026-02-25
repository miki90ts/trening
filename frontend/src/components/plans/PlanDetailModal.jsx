import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import * as api from '../../services/api';
import { FiHash, FiFileText } from 'react-icons/fi';

function PlanDetailModal({ isOpen, onClose, planId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !planId) return;
    setLoading(true);
    api.getPlan(planId)
      .then(data => { setPlan(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isOpen, planId]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="📋 Detalji plana">
      {loading || !plan ? (
        <Loading />
      ) : (
        <div className="plan-detail">
          <div className="plan-detail-header">
            <div className="plan-detail-color" style={{ background: plan.color || '#6366f1' }} />
            <div>
              <h3>{plan.name}</h3>
              {plan.description && <p className="plan-detail-desc">{plan.description}</p>}
            </div>
          </div>

          <div className="plan-detail-stats">
            <div className="workout-stat">
              <FiHash />
              <span>{plan.exercises?.length || 0} vežbi</span>
            </div>
            <div className="workout-stat">
              <FiHash />
              <span>{plan.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)} setova ukupno</span>
            </div>
          </div>

          <div className="plan-detail-exercises">
            {plan.exercises?.map((ex, idx) => (
              <div key={ex.id} className="plan-detail-exercise">
                <div className="plan-detail-exercise-header">
                  <span className="plan-exercise-num">#{idx + 1}</span>
                  <span className="plan-detail-exercise-icon">{ex.exercise_icon}</span>
                  <div>
                    <strong>{ex.exercise_name}</strong>
                    <span className="plan-detail-exercise-cat">{ex.category_name}</span>
                    {ex.has_weight ? <span className="plan-detail-tag">⚖️</span> : null}
                  </div>
                </div>

                <div className="plan-detail-sets">
                  {ex.sets?.map(s => (
                    <span key={s.id} className="set-badge">
                      Set {s.set_number}: {parseFloat(s.target_reps)} {getUnitLabel(ex.value_type)}
                      {s.target_weight ? ` × ${parseFloat(s.target_weight)}kg` : ''}
                    </span>
                  ))}
                </div>

                {ex.notes && (
                  <div className="plan-detail-exercise-notes">
                    <FiFileText size={12} />
                    <span>{ex.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default PlanDetailModal;
