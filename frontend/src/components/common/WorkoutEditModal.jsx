import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Loading from './Loading';
import * as api from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave } from 'react-icons/fi';

function WorkoutEditModal({ isOpen, onClose, workoutId, categories, onSaved }) {
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category_id: '',
    attempt_date: '',
    notes: ''
  });
  const [sets, setSets] = useState([{ reps: '', weight: '' }]);

  useEffect(() => {
    if (!isOpen || !workoutId) return;
    setLoading(true);
    api.getResultDetail(workoutId)
      .then(data => {
        setWorkout(data);
        setForm({
          category_id: String(data.category_id),
          attempt_date: data.attempt_date ? data.attempt_date.slice(0, 16) : '',
          notes: data.notes || ''
        });
        if (data.sets && data.sets.length > 0) {
          setSets(data.sets.map(s => ({
            reps: String(parseFloat(s.reps)),
            weight: s.weight ? String(parseFloat(s.weight)) : ''
          })));
        } else {
          setSets([{ reps: '', weight: '' }]);
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Greška pri učitavanju'); });
  }, [isOpen, workoutId]);

  const selectedCategory = categories.find(c => c.id === parseInt(form.category_id));
  const hasWeight = selectedCategory?.has_weight === 1 || selectedCategory?.has_weight === true;

  const addSet = () => setSets(prev => [...prev, { reps: '', weight: '' }]);

  const removeSet = (index) => {
    if (sets.length <= 1) return;
    setSets(prev => prev.filter((_, i) => i !== index));
  };

  const updateSet = (index, field, value) => {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const getValueLabel = (type) => {
    switch (type) {
      case 'reps': return 'Ponavljanja';
      case 'seconds': return 'Sekunde';
      case 'minutes': return 'Minuti';
      case 'meters': return 'Metri';
      case 'kg': return 'Kilogrami';
      default: return 'Vrednost';
    }
  };

  const handleSave = async () => {
    // Validacija
    const setsToSend = [];
    for (const s of sets) {
      const reps = parseFloat(s.reps);
      if (!reps || reps <= 0) {
        toast.error('Svaki set mora imati vrednost!');
        return;
      }
      const weight = hasWeight && s.weight ? parseFloat(s.weight) : null;
      setsToSend.push({ reps, weight });
    }

    setSaving(true);
    try {
      await api.updateResult(workoutId, {
        category_id: parseInt(form.category_id),
        attempt_date: form.attempt_date,
        notes: form.notes || undefined,
        sets: setsToSend
      });
      toast.success('Rezultat ažuriran!');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filter kategorija za isti exercise
  const filteredCategories = workout
    ? categories.filter(c => c.exercise_id === workout.exercise_id)
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✏️ Izmeni rezultat">
      {loading || !workout ? (
        <Loading />
      ) : (
        <div className="workout-edit-form">
          {/* Exercise info (readonly) */}
          <div className="workout-edit-info">
            <span className="workout-edit-exercise">
              {workout.exercise_icon} {workout.exercise_name}
            </span>
          </div>

          {/* Kategorija */}
          <div className="form-group">
            <label>Kategorija</label>
            <select
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
            >
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.value_type}) {cat.has_weight ? '⚖️' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Setovi */}
          <div className="sets-builder">
            <div className="sets-header">
              <span className="sets-label">Setovi ({sets.length})</span>
            </div>
            {sets.map((s, i) => (
              <div key={i} className="set-row">
                <span className="set-number">#{i + 1}</span>
                <div className="set-inputs">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={s.reps}
                    onChange={e => updateSet(i, 'reps', e.target.value)}
                    placeholder={selectedCategory ? getValueLabel(selectedCategory.value_type) : 'Vrednost'}
                  />
                  {hasWeight && (
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={s.weight}
                      onChange={e => updateSet(i, 'weight', e.target.value)}
                      placeholder="kg"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="btn-icon btn-remove-set"
                  onClick={() => removeSet(i)}
                  disabled={sets.length <= 1}
                  title="Ukloni set"
                >
                  <FiX />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-add-set" onClick={addSet}>
              <FiPlus /> Dodaj set
            </button>
          </div>

          {/* Datum */}
          <div className="form-group">
            <label>Datum i vreme</label>
            <input
              type="datetime-local"
              value={form.attempt_date}
              onChange={e => setForm({ ...form, attempt_date: e.target.value })}
            />
          </div>

          {/* Napomena */}
          <div className="form-group">
            <label>Napomena</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Opciona napomena"
            />
          </div>

          {/* Save */}
          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: '12px' }}
          >
            <FiSave /> {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
          </button>
        </div>
      )}
    </Modal>
  );
}

export default WorkoutEditModal;
