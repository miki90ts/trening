import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import * as api from '../../services/api';
import { FiHash, FiFileText } from 'react-icons/fi';

const MEAL_TYPE_LABELS = {
  breakfast: '🌅 Doručak',
  lunch: '☀️ Ručak',
  dinner: '🌙 Večera',
  snack: '🍎 Užina'
};

function MealPlanDetailModal({ isOpen, onClose, planId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !planId) return;
    setLoading(true);
    api.getMealPlan(planId)
      .then(data => { setPlan(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isOpen, planId]);

  const computeConsumed = (amount, per100) => ((amount / 100) * per100).toFixed(1);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🍽️ Detalji plana ishrane">
      {loading || !plan ? (
        <Loading />
      ) : (
        <div className="plan-detail">
          <div className="plan-detail-header">
            <div className="plan-detail-color" style={{ background: plan.color || '#10b981' }} />
            <div>
              <h3>{plan.name}</h3>
              {plan.description && <p className="plan-detail-desc">{plan.description}</p>}
            </div>
          </div>

          <div className="plan-detail-stats">
            <div className="workout-stat">
              <FiHash />
              <span>{plan.meals?.length || 0} obroka</span>
            </div>
            <div className="workout-stat">
              <FiHash />
              <span>{plan.meals?.reduce((sum, m) => sum + (m.items?.length || 0), 0)} stavki ukupno</span>
            </div>
          </div>

          <div className="plan-detail-exercises">
            {plan.meals?.map((meal, idx) => {
              const mealTotals = (meal.items || []).reduce((acc, item) => {
                const amt = parseFloat(item.amount_grams) || 0;
                acc.kcal += (amt / 100) * parseFloat(item.kcal_per_100g || 0);
                acc.protein += (amt / 100) * parseFloat(item.protein_per_100g || 0);
                acc.carbs += (amt / 100) * parseFloat(item.carbs_per_100g || 0);
                acc.fat += (amt / 100) * parseFloat(item.fat_per_100g || 0);
                return acc;
              }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

              return (
                <div key={meal.id} className="plan-detail-exercise">
                  <div className="plan-detail-exercise-header">
                    <span className="plan-exercise-num">#{idx + 1}</span>
                    <div>
                      <strong>{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</strong>
                      <span className="plan-detail-exercise-cat">
                        {mealTotals.kcal.toFixed(0)} kcal · P: {mealTotals.protein.toFixed(1)}g · C: {mealTotals.carbs.toFixed(1)}g · F: {mealTotals.fat.toFixed(1)}g
                      </span>
                    </div>
                  </div>

                  <div className="plan-detail-sets">
                    {meal.items?.map(item => (
                      <span key={item.id} className="set-badge">
                        {item.food_item_name || item.custom_name || 'Stavka'}
                        {' · '}{parseFloat(item.amount_grams)}g
                        {' · '}{computeConsumed(item.amount_grams, item.kcal_per_100g)} kcal
                      </span>
                    ))}
                  </div>

                  {meal.notes && (
                    <div className="plan-detail-exercise-notes">
                      <FiFileText size={12} />
                      <span>{meal.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default MealPlanDetailModal;
