import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as api from '../services/api';
import Loading from '../components/common/Loading';
import {
  FiArrowLeft, FiCalendar, FiClock, FiCheckCircle,
  FiTrendingUp, FiTrendingDown, FiMinus
} from 'react-icons/fi';

const MEAL_TYPE_LABELS = {
  breakfast: '🌅 Doručak',
  lunch: '☀️ Ručak',
  dinner: '🌙 Večera',
  snack: '🍎 Užina'
};

function MealSessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getMealSession(sessionId);
      setSession(data);
    } catch (err) {
      toast.error('Greška pri učitavanju');
      navigate('/meal-plans');
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

  const computeConsumed = (amountStr, per100Str) => {
    const amount = parseFloat(amountStr) || 0;
    const per100 = parseFloat(per100Str) || 0;
    return (amount / 100) * per100;
  };

  const getDiff = (actual, planned) => {
    if (actual == null || planned == null) return null;
    const a = parseFloat(actual);
    const p = parseFloat(planned);
    const diff = a - p;
    if (Math.abs(diff) < 0.5) return { cls: 'neutral', icon: <FiMinus />, text: '0g' };
    if (diff > 0) return { cls: 'positive', icon: <FiTrendingUp />, text: `+${diff.toFixed(0)}g` };
    return { cls: 'negative', icon: <FiTrendingDown />, text: `${diff.toFixed(0)}g` };
  };

  if (loading || !session) return <Loading />;

  // Compute daily totals from completed items
  const dailyTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const plannedTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  session.meals?.forEach(meal => {
    meal.items?.forEach(item => {
      const plannedAmt = parseFloat(item.amount_grams) || 0;
      plannedTotals.kcal += computeConsumed(plannedAmt, item.kcal_per_100g);
      plannedTotals.protein += computeConsumed(plannedAmt, item.protein_per_100g);
      plannedTotals.carbs += computeConsumed(plannedAmt, item.carbs_per_100g);
      plannedTotals.fat += computeConsumed(plannedAmt, item.fat_per_100g);

      if (item.is_completed && !item.is_removed) {
        const actualAmt = item.actual_amount_grams != null ? parseFloat(item.actual_amount_grams) : plannedAmt;
        dailyTotals.kcal += computeConsumed(actualAmt, item.kcal_per_100g);
        dailyTotals.protein += computeConsumed(actualAmt, item.protein_per_100g);
        dailyTotals.carbs += computeConsumed(actualAmt, item.carbs_per_100g);
        dailyTotals.fat += computeConsumed(actualAmt, item.fat_per_100g);
      }
    });
  });

  return (
    <div className="page session-detail-page meal-session-detail-page">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/meal-plans')}>
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
          <FiCheckCircle />
          <div>
            <small>Status</small>
            <strong className="text-success">Završeno</strong>
          </div>
        </div>
        <div className="summary-card">
          <FiClock />
          <div>
            <small>Planirano</small>
            <strong>{plannedTotals.kcal.toFixed(0)} kcal</strong>
          </div>
        </div>
        <div className="summary-card">
          <FiCheckCircle />
          <div>
            <small>Stvarno</small>
            <strong>{dailyTotals.kcal.toFixed(0)} kcal</strong>
          </div>
        </div>
      </div>

      {/* Macro comparison */}
      <div className="meal-session-macro-comparison card">
        <h3>Makronutrijenti — Planirano vs Stvarno</h3>
        <div className="macro-comparison-grid">
          <div className="macro-comparison-item">
            <span className="macro-label">Kalorije</span>
            <span className="macro-planned">{plannedTotals.kcal.toFixed(0)} kcal</span>
            <span className="macro-actual">{dailyTotals.kcal.toFixed(0)} kcal</span>
            <span className={`macro-diff ${dailyTotals.kcal > plannedTotals.kcal ? 'positive' : dailyTotals.kcal < plannedTotals.kcal ? 'negative' : 'neutral'}`}>
              {(dailyTotals.kcal - plannedTotals.kcal).toFixed(0)} kcal
            </span>
          </div>
          <div className="macro-comparison-item">
            <span className="macro-label">Protein</span>
            <span className="macro-planned">{plannedTotals.protein.toFixed(1)}g</span>
            <span className="macro-actual">{dailyTotals.protein.toFixed(1)}g</span>
            <span className={`macro-diff ${dailyTotals.protein >= plannedTotals.protein ? 'positive' : 'negative'}`}>
              {(dailyTotals.protein - plannedTotals.protein).toFixed(1)}g
            </span>
          </div>
          <div className="macro-comparison-item">
            <span className="macro-label">Ugljeni h.</span>
            <span className="macro-planned">{plannedTotals.carbs.toFixed(1)}g</span>
            <span className="macro-actual">{dailyTotals.carbs.toFixed(1)}g</span>
            <span className={`macro-diff ${Math.abs(dailyTotals.carbs - plannedTotals.carbs) < 5 ? 'neutral' : dailyTotals.carbs > plannedTotals.carbs ? 'negative' : 'positive'}`}>
              {(dailyTotals.carbs - plannedTotals.carbs).toFixed(1)}g
            </span>
          </div>
          <div className="macro-comparison-item">
            <span className="macro-label">Masti</span>
            <span className="macro-planned">{plannedTotals.fat.toFixed(1)}g</span>
            <span className="macro-actual">{dailyTotals.fat.toFixed(1)}g</span>
            <span className={`macro-diff ${Math.abs(dailyTotals.fat - plannedTotals.fat) < 5 ? 'neutral' : dailyTotals.fat > plannedTotals.fat ? 'negative' : 'positive'}`}>
              {(dailyTotals.fat - plannedTotals.fat).toFixed(1)}g
            </span>
          </div>
        </div>
      </div>

      {/* Meals detail */}
      <div className="session-detail-exercises">
        {session.meals?.map((meal, idx) => {
          const completedItems = meal.items?.filter(it => it.is_completed && !it.is_removed) || [];
          const removedItems = meal.items?.filter(it => it.is_removed) || [];
          const skippedItems = meal.items?.filter(it => !it.is_completed && !it.is_removed) || [];

          return (
            <div key={meal.id} className="session-detail-exercise">
              <div className="session-detail-exercise-header">
                <span className="plan-exercise-num">#{idx + 1}</span>
                <div>
                  <strong>{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</strong>
                  <span className="session-exercise-cat">
                    {completedItems.length} pojeo · {skippedItems.length} preskočio · {removedItems.length} obrisao
                  </span>
                </div>
                {meal.is_completed ?
                  <FiCheckCircle className="exercise-done-icon" /> :
                  <span className="text-muted">Delimično</span>
                }
              </div>

              {completedItems.length > 0 && (
                <div className="session-detail-sets-table">
                  <div className="session-detail-sets-header">
                    <span>Stavka</span>
                    <span>Plan (g)</span>
                    <span>Stvarno (g)</span>
                    <span>Razlika</span>
                  </div>
                  {completedItems.map(item => {
                    const plannedAmt = parseFloat(item.amount_grams);
                    const actualAmt = item.actual_amount_grams != null ? parseFloat(item.actual_amount_grams) : plannedAmt;
                    const diff = getDiff(actualAmt, plannedAmt);
                    const itemKcal = computeConsumed(actualAmt, item.kcal_per_100g);

                    return (
                      <div key={item.id} className="session-detail-set-row">
                        <span>{item.food_item_name || item.custom_name || 'Stavka'}</span>
                        <span>{plannedAmt}g</span>
                        <span>{actualAmt}g · {itemKcal.toFixed(0)} kcal</span>
                        <span className="set-diff-cell">
                          {diff && (
                            <span className={`set-diff ${diff.cls}`}>
                              {diff.icon} {diff.text}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {skippedItems.length > 0 && (
                <div className="session-detail-skipped">
                  <small>{skippedItems.length} stavki preskočeno: {skippedItems.map(it => it.food_item_name || it.custom_name).join(', ')}</small>
                </div>
              )}

              {removedItems.length > 0 && (
                <div className="session-detail-skipped">
                  <small>🗑️ {removedItems.length} obrisano: {removedItems.map(it => it.food_item_name || it.custom_name).join(', ')}</small>
                </div>
              )}

              {meal.notes && (
                <div className="session-detail-notes">
                  <small>📝 {meal.notes}</small>
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

export default MealSessionDetailPage;
