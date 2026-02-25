import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';
import * as api from '../services/api';
import Loading from '../components/common/Loading';
import {
  FiArrowLeft, FiPlus, FiChevronUp, FiChevronDown,
  FiSave, FiCopy, FiTrash2
} from 'react-icons/fi';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];

function PlanBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get('copyFrom');
  const isEdit = !!id;

  const { exercises, categories } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [planExercises, setPlanExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Za copy-from dropdown
  const [allPlans, setAllPlans] = useState([]);
  const [showCopyPicker, setShowCopyPicker] = useState(false);

  // Učitaj listu planova za copy opciju
  useEffect(() => {
    api.getPlans().then(setAllPlans).catch(() => {});
  }, []);

  // Učitaj plan za edit ili copy
  const loadPlan = useCallback(async (planId, isCopy) => {
    setLoading(true);
    try {
      const plan = await api.getPlan(planId);
      if (isCopy) {
        setName(plan.name + ' (kopija)');
      } else {
        setName(plan.name);
      }
      setDescription(plan.description || '');
      setColor(plan.color || '#6366f1');
      setPlanExercises(plan.exercises.map(ex => ({
        exercise_id: String(ex.exercise_id),
        category_id: String(ex.category_id),
        notes: ex.notes || '',
        expanded: true,
        sets: ex.sets.map(s => ({
          target_reps: String(parseFloat(s.target_reps)),
          target_weight: s.target_weight ? String(parseFloat(s.target_weight)) : ''
        }))
      })));
    } catch {
      toast.error('Greška pri učitavanju plana');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit) {
      loadPlan(id, false);
    } else if (copyFromId) {
      loadPlan(copyFromId, true);
    }
  }, [id, copyFromId, isEdit, loadPlan]);

  // Copy from selected plan (inline picker)
  const handleCopyFrom = async (planId) => {
    await loadPlan(planId, true);
    setShowCopyPicker(false);
    toast.info('Plan kopiran — prilagodi po želji i sačuvaj');
  };

  // ---- Exercise CRUD ----
  const addExercise = () => {
    setPlanExercises(prev => [...prev, {
      exercise_id: '',
      category_id: '',
      notes: '',
      expanded: true,
      sets: [{ target_reps: '', target_weight: '' }]
    }]);
  };

  const removeExercise = (idx) => {
    setPlanExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx, field, value) => {
    setPlanExercises(prev => prev.map((ex, i) => {
      if (i !== idx) return ex;
      const updated = { ...ex, [field]: value };
      if (field === 'exercise_id') updated.category_id = '';
      return updated;
    }));
  };

  const toggleExpand = (idx) => {
    setPlanExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, expanded: !ex.expanded } : ex));
  };

  const moveExercise = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= planExercises.length) return;
    setPlanExercises(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // ---- Set CRUD ----
  const addSet = (exIdx) => {
    setPlanExercises(prev => prev.map((ex, i) =>
      i === exIdx ? { ...ex, sets: [...ex.sets, { target_reps: '', target_weight: '' }] } : ex
    ));
  };

  const removeSet = (exIdx, setIdx) => {
    setPlanExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      if (ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
    }));
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setPlanExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s)
      };
    }));
  };

  // ---- Helpers ----
  const getFilteredCategories = (exerciseId) => {
    if (!exerciseId) return [];
    return categories.filter(c => c.exercise_id === parseInt(exerciseId));
  };

  const getCategory = (categoryId) => {
    return categories.find(c => c.id === parseInt(categoryId));
  };

  const getValueLabel = (type) => {
    switch (type) {
      case 'reps': return 'Rep';
      case 'seconds': return 'Sek';
      case 'minutes': return 'Min';
      case 'meters': return 'Met';
      case 'kg': return 'Kg';
      default: return 'Vred';
    }
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!name.trim()) { toast.error('Unesite naziv plana'); return; }
    if (planExercises.length === 0) { toast.error('Dodajte bar jednu vežbu'); return; }

    for (let i = 0; i < planExercises.length; i++) {
      const ex = planExercises[i];
      if (!ex.category_id) { toast.error(`Vežba #${i + 1}: izaberite kategoriju`); return; }
      for (const s of ex.sets) {
        if (!s.target_reps || parseFloat(s.target_reps) <= 0) {
          toast.error(`Vežba #${i + 1}: svaki set mora imati vrednost`);
          return;
        }
      }
    }

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      exercises: planExercises.map(ex => ({
        category_id: parseInt(ex.category_id),
        notes: ex.notes || null,
        sets: ex.sets.map(s => ({
          target_reps: parseFloat(s.target_reps),
          target_weight: s.target_weight ? parseFloat(s.target_weight) : null
        }))
      }))
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.updatePlan(id, data);
        toast.success('Plan ažuriran!');
      } else {
        await api.createPlan(data);
        toast.success('Plan kreiran!');
      }
      navigate('/plans');
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page plan-builder-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/plans')}>
            <FiArrowLeft /> Nazad
          </button>
          <h1 className="page-title">
            {isEdit ? '✏️ Izmeni plan' : '📋 Novi plan treninga'}
          </h1>
        </div>
        <div className="page-header-actions">
          {!isEdit && allPlans.length > 0 && (
            <button
              className="btn btn-outline"
              onClick={() => setShowCopyPicker(!showCopyPicker)}
            >
              <FiCopy /> Kopiraj od postojećeg
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? 'Čuvanje...' : (isEdit ? 'Sačuvaj izmene' : 'Kreiraj plan')}
          </button>
        </div>
      </div>

      {/* Copy from picker */}
      {showCopyPicker && (
        <div className="copy-plan-picker card">
          <div className="copy-plan-picker-header">
            <h4><FiCopy /> Izaberi plan za kopiranje</h4>
            <button className="btn-icon-sm" onClick={() => setShowCopyPicker(false)}><FiTrash2 /></button>
          </div>
          <p className="copy-plan-picker-desc">Svi podaci će se učitati — samo prilagodi ime, dodaj/obriši vežbe i sačuvaj kao novi plan.</p>
          <div className="copy-plan-list">
            {allPlans.map(p => (
              <button
                key={p.id}
                className="copy-plan-item"
                onClick={() => handleCopyFrom(p.id)}
              >
                <span className="copy-plan-color" style={{ background: p.color || '#6366f1' }} />
                <span className="copy-plan-name">{p.name}</span>
                <span className="copy-plan-count">{p.exercise_count} vežbi</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="plan-builder-form-page">
        {/* Basic info row */}
        <div className="plan-builder-basics card">
          <div className="plan-builder-basics-grid">
            <div className="form-group">
              <label>Naziv plana *</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="npr. Push Day, Leg Day..."
              />
            </div>

            <div className="form-group">
              <label>Opis</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Opcioni opis plana"
              />
            </div>

            <div className="form-group">
              <label>Boja</label>
              <div className="plan-color-picker">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`plan-color-btn ${color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Exercises section */}
        <div className="plan-builder-exercises-section">
          <div className="plan-exercises-header">
            <h3>Vežbe ({planExercises.length})</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={addExercise}>
              <FiPlus /> Dodaj vežbu
            </button>
          </div>

          {planExercises.length === 0 && (
            <div className="plan-no-exercises">
              <p>Nema vežbi. Klikni "Dodaj vežbu" ili kopiraj od postojećeg plana.</p>
            </div>
          )}

          <div className="plan-exercises-list">
            {planExercises.map((ex, exIdx) => {
              const cat = getCategory(ex.category_id);
              const hasWeight = cat?.has_weight === 1 || cat?.has_weight === true;
              const filteredCats = getFilteredCategories(ex.exercise_id);
              const exInfo = exercises.find(e => e.id === parseInt(ex.exercise_id));

              return (
                <div key={exIdx} className="plan-exercise-card">
                  <div className="plan-exercise-header" onClick={() => toggleExpand(exIdx)}>
                    <div className="plan-exercise-title">
                      <span className="plan-exercise-num">#{exIdx + 1}</span>
                      <span>{exInfo ? `${exInfo.icon} ${exInfo.name}` : 'Nova vežba'}</span>
                      {cat && <span className="plan-exercise-cat">— {cat.name}</span>}
                    </div>
                    <div className="plan-exercise-actions">
                      <button type="button" className="btn-icon" onClick={e => { e.stopPropagation(); moveExercise(exIdx, -1); }} disabled={exIdx === 0} title="Gore">
                        <FiChevronUp />
                      </button>
                      <button type="button" className="btn-icon" onClick={e => { e.stopPropagation(); moveExercise(exIdx, 1); }} disabled={exIdx === planExercises.length - 1} title="Dole">
                        <FiChevronDown />
                      </button>
                      <button type="button" className="btn-icon btn-danger" onClick={e => { e.stopPropagation(); removeExercise(exIdx); }} title="Ukloni">
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {ex.expanded && (
                    <div className="plan-exercise-body">
                      <div className="plan-exercise-selects">
                        <div className="form-group">
                          <label>Vežba</label>
                          <select className="form-control" value={ex.exercise_id} onChange={e => updateExercise(exIdx, 'exercise_id', e.target.value)}>
                            <option value="">-- Izaberi --</option>
                            {exercises.map(exc => (
                              <option key={exc.id} value={exc.id}>{exc.icon} {exc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Kategorija</label>
                          <select
                            className="form-control"
                            value={ex.category_id}
                            onChange={e => updateExercise(exIdx, 'category_id', e.target.value)}
                            disabled={!ex.exercise_id}
                          >
                            <option value="">-- Izaberi --</option>
                            {filteredCats.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.value_type}) {c.has_weight ? '⚖️' : ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Setovi */}
                      {ex.category_id && (
                        <div className="plan-sets-builder">
                          <span className="sets-label">Setovi ({ex.sets.length})</span>
                          {ex.sets.map((s, sIdx) => (
                            <div key={sIdx} className="set-row">
                              <span className="set-number">#{sIdx + 1}</span>
                              <div className="set-inputs">
                                <input
                                  type="number"
                                  className="form-control"
                                  step="0.01"
                                  min="0"
                                  value={s.target_reps}
                                  onChange={e => updateSet(exIdx, sIdx, 'target_reps', e.target.value)}
                                  placeholder={cat ? getValueLabel(cat.value_type) : 'Vred'}
                                />
                                {hasWeight && (
                                  <input
                                    type="number"
                                    className="form-control"
                                    step="0.5"
                                    min="0"
                                    value={s.target_weight}
                                    onChange={e => updateSet(exIdx, sIdx, 'target_weight', e.target.value)}
                                    placeholder="kg"
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn-icon btn-danger"
                                onClick={() => removeSet(exIdx, sIdx)}
                                disabled={ex.sets.length <= 1}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          ))}
                          <button type="button" className="btn btn-sm btn-ghost plan-add-set-btn" onClick={() => addSet(exIdx)}>
                            <FiPlus /> Dodaj set
                          </button>
                        </div>
                      )}

                      <div className="form-group" style={{ marginTop: '0.5rem' }}>
                        <label>Napomena</label>
                        <input
                          type="text"
                          className="form-control"
                          value={ex.notes}
                          onChange={e => updateExercise(exIdx, 'notes', e.target.value)}
                          placeholder="Opciona napomena za ovu vežbu"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {planExercises.length > 0 && (
            <button type="button" className="btn btn-outline plan-add-exercise-btn" onClick={addExercise}>
              <FiPlus /> Dodaj vežbu
            </button>
          )}
        </div>

        {/* Bottom save */}
        <div className="plan-builder-bottom-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/plans')}>
            Otkaži
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? 'Čuvanje...' : (isEdit ? 'Sačuvaj izmene' : 'Kreiraj plan')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlanBuilderPage;
