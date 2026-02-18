import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import Loading from "../components/common/Loading";
import RecordBadge from "../components/common/RecordBadge";
import ResultsDataTable from "../components/common/ResultsDataTable";
import WorkoutDetailModal from "../components/common/WorkoutDetailModal";
import WorkoutEditModal from "../components/common/WorkoutEditModal";
import { toast } from "react-toastify";
import * as api from "../services/api";
import {
  FiSend,
  FiTrash2,
  FiPlus,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiEdit2,
  FiList,
  FiArrowLeft,
  FiAward,
} from "react-icons/fi";

function ResultsPage() {
  const { users, exercises, categories, loading } = useApp();
  const { user: currentUser, isAdmin } = useAuth();
  const [form, setForm] = useState({
    user_id: "",
    exercise_id: "",
    category_id: "",
    attempt_date: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  // Režim unosa: 'simple' = jednoredni, 'detailed' = više setova
  const [inputMode, setInputMode] = useState("simple");
  // Simple mode: jedan red
  const [simpleSet, setSimpleSet] = useState({ sets: 1, reps: "", weight: "" });
  // Detailed mode: niz setova
  const [detailedSets, setDetailedSets] = useState([{ reps: "", weight: "" }]);

  const [filteredCategories, setFilteredCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [newRecord, setNewRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  // 'form' = unos + poslednjih 5, 'table' = puna tabela, 'records' = lični rekordi
  const [viewMode, setViewMode] = useState("form");
  const [personalRecords, setPersonalRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  // Refresh trigger — svaka promena refreshKey osvežava listu i DataTable
  const [refreshKey, setRefreshKey] = useState(0);

  // Odredi da li izabrana kategorija koristi tegove
  const selectedCategory = categories.find(
    (c) => c.id === parseInt(form.category_id),
  );
  const hasWeight =
    selectedCategory?.has_weight === 1 || selectedCategory?.has_weight === true;

  // Filter kategorija po vežbi
  useEffect(() => {
    if (form.exercise_id) {
      const filtered = categories.filter(
        (c) => c.exercise_id === parseInt(form.exercise_id),
      );
      setFilteredCategories(filtered);
      if (
        filtered.length > 0 &&
        !filtered.find((c) => c.id === parseInt(form.category_id))
      ) {
        setForm((prev) => ({ ...prev, category_id: "" }));
      }
    } else {
      setFilteredCategories([]);
    }
  }, [form.exercise_id, categories]);

  // Učitaj poslednje rezultate (osvežava se kad se refreshKey promeni)
  const loadRecent = useCallback(() => {
    api
      .getResults({ limit: 5 })
      .then(setResults)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
  }, [refreshKey, loadRecent]);

  // Dodaj set (detailed mode)
  const addSet = () => {
    setDetailedSets((prev) => [...prev, { reps: "", weight: "" }]);
  };

  // Ukloni set (detailed mode)
  const removeSet = (index) => {
    if (detailedSets.length <= 1) return;
    setDetailedSets((prev) => prev.filter((_, i) => i !== index));
  };

  // Ažuriraj set (detailed mode)
  const updateSet = (index, field, value) => {
    setDetailedSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  // Toggle expand za prikaz setova u tabeli
  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id) {
      toast.error("Izaberite kategoriju!");
      return;
    }

    // Napravi niz setova
    let setsToSend = [];

    if (inputMode === "simple") {
      const numSets = parseInt(simpleSet.sets) || 1;
      const reps = parseFloat(simpleSet.reps);
      if (!reps || reps <= 0) {
        toast.error("Unesite vrednost ponavljanja!");
        return;
      }
      const weight =
        hasWeight && simpleSet.weight ? parseFloat(simpleSet.weight) : null;
      for (let i = 0; i < numSets; i++) {
        setsToSend.push({ reps, weight });
      }
    } else {
      for (const s of detailedSets) {
        const reps = parseFloat(s.reps);
        if (!reps || reps <= 0) {
          toast.error("Svaki set mora imati vrednost ponavljanja!");
          return;
        }
        const weight = hasWeight && s.weight ? parseFloat(s.weight) : null;
        setsToSend.push({ reps, weight });
      }
    }

    setSubmitting(true);
    setNewRecord(null);
    try {
      const resultData = {
        category_id: parseInt(form.category_id),
        sets: setsToSend,
        attempt_date: form.attempt_date,
        notes: form.notes || undefined,
      };

      if (isAdmin && form.user_id) {
        resultData.user_id = parseInt(form.user_id);
      }

      const result = await api.createResult(resultData);

      if (result.is_new_record) {
        setNewRecord(result);
        toast.success("🏆 NOVI REKORD!!!", { autoClose: 5000 });
      } else {
        toast.success("Rezultat unet!");
      }

      // Refreshuj sve — i poslednjih 5 i DataTable ako je otvoren
      setRefreshKey((k) => k + 1);

      // Reset
      setSimpleSet({ sets: 1, reps: "", weight: "" });
      setDetailedSets([{ reps: "", weight: "" }]);
      setForm((prev) => ({ ...prev, notes: "" }));
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getValueLabel = (type) => {
    switch (type) {
      case "reps":
        return "Ponavljanja";
      case "seconds":
        return "Sekunde";
      case "minutes":
        return "Minuti";
      case "meters":
        return "Metri";
      case "kg":
        return "Kilogrami";
      default:
        return "Vrednost";
    }
  };

  const formatScore = (score, type, hasW) => {
    if (hasW) return `${score} vol`;
    if (type === "seconds") return `${score}s`;
    if (type === "minutes") return `${score}min`;
    if (type === "meters") return `${score}m`;
    if (type === "kg") return `${score}kg`;
    return `${score}x`;
  };

  // Učitaj lične rekorde kad se prebaci na records view
  useEffect(() => {
    if (viewMode === "records") {
      setLoadingRecords(true);
      api
        .getPersonalRecords()
        .then(setPersonalRecords)
        .catch(() => {})
        .finally(() => setLoadingRecords(false));
    }
  }, [viewMode]);

  if (loading) return <Loading />;

  // === PERSONAL RECORDS VIEW ===
  if (viewMode === "records") {
    return (
      <div className="page">
        <div className="section-header-row">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setViewMode("form")}
          >
            <FiArrowLeft /> Nazad na unos
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>
            🏆 Lični rekordi
          </h1>
          <div />
          {/* spacer */}
        </div>
        {loadingRecords ? (
          <Loading />
        ) : personalRecords.length === 0 ? (
          <p className="empty-state">Još nema ličnih rekorda.</p>
        ) : (
          <div className="results-table-wrapper">
            <table className="results-table records-table">
              <thead>
                <tr>
                  <th>Vežba</th>
                  <th>Kategorija</th>
                  <th>Najbolji score</th>
                  <th>Setovi</th>
                  <th>Ponavljanja</th>
                  <th>Max teg</th>
                  <th>Est. 1RM</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {personalRecords.map((r, i) => (
                  <tr key={i} className="record-row">
                    <td>
                      <span className="exercise-icon-cell">
                        {r.exercise_icon}
                      </span>
                      {r.exercise_name}
                    </td>
                    <td>{r.category_name}</td>
                    <td className="value-cell record-score">
                      {formatScore(
                        parseFloat(r.score),
                        r.value_type,
                        r.has_weight,
                      )}
                    </td>
                    <td>{r.total_sets}</td>
                    <td>{r.total_reps}</td>
                    <td>
                      {r.max_weight ? `${parseFloat(r.max_weight)} kg` : "-"}
                    </td>
                    <td className="estimated-1rm-cell">
                      {r.has_weight && r.estimated_1rm > 0 ? (
                        <span className="badge-1rm">{r.estimated_1rm} kg</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {new Date(r.attempt_date).toLocaleDateString("sr-RS")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // === FULL-PAGE TABLE VIEW ===
  if (viewMode === "table") {
    return (
      <div className="page">
        <div className="section-header-row">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setViewMode("form")}
          >
            <FiArrowLeft /> Nazad na unos
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>
            📊 Svi rezultati
          </h1>
          <div />
          {/* spacer */}
        </div>
        <ResultsDataTable
          categories={categories}
          refreshKey={refreshKey}
          onDataChanged={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    );
  }

  // === FORM VIEW (default) ===
  return (
    <div className="page">
      <h1 className="page-title">📝 Unos rezultata</h1>

      {newRecord && (
        <RecordBadge
          isNewRecord={true}
          previousValue={newRecord.previous_record}
          newValue={newRecord.score}
          valueType={newRecord.value_type}
        />
      )}

      <Card className="form-card">
        <form onSubmit={handleSubmit} className="form results-form">
          {/* Red 1: Učesnik + Vežba */}
          <div className="form-row">
            <div className="form-group">
              <label>Učesnik</label>
              {isAdmin ? (
                <select
                  value={form.user_id}
                  onChange={(e) =>
                    setForm({ ...form, user_id: e.target.value })
                  }
                >
                  <option value="">
                    Ja ({currentUser?.nickname || currentUser?.first_name})
                  </option>
                  {users
                    .filter((u) => u.id !== currentUser?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nickname || `${u.first_name} ${u.last_name || ""}`}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="current-user-display">
                  <span className="current-user-avatar">
                    {currentUser?.profile_image ? (
                      <img src={currentUser.profile_image} alt="" />
                    ) : (
                      currentUser?.first_name?.[0]
                    )}
                  </span>
                  <span>
                    {currentUser?.nickname ||
                      `${currentUser?.first_name} ${currentUser?.last_name || ""}`}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Vežba *</label>
              <select
                value={form.exercise_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    exercise_id: e.target.value,
                    category_id: "",
                  })
                }
                required
              >
                <option value="">-- Izaberi vežbu --</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.icon} {ex.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Red 2: Kategorija */}
          <div className="form-row">
            <div className="form-group">
              <label>Kategorija *</label>
              <select
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                required
                disabled={!form.exercise_id}
              >
                <option value="">-- Izaberi kategoriju --</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.value_type}) {cat.has_weight ? "⚖️" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Režim unosa - Toggle */}
          {form.category_id && (
            <div className="input-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${inputMode === "simple" ? "active" : ""}`}
                onClick={() => setInputMode("simple")}
              >
                Jednostavan unos
              </button>
              <button
                type="button"
                className={`mode-btn ${inputMode === "detailed" ? "active" : ""}`}
                onClick={() => setInputMode("detailed")}
              >
                Detaljni unos (po setu)
              </button>
            </div>
          )}

          {/* Simple Mode */}
          {form.category_id && inputMode === "simple" && (
            <div className="form-row form-row-3">
              <div className="form-group">
                <label>Broj serija</label>
                <input
                  type="number"
                  min="1"
                  value={simpleSet.sets}
                  onChange={(e) =>
                    setSimpleSet({ ...simpleSet, sets: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  {selectedCategory
                    ? getValueLabel(selectedCategory.value_type)
                    : "Vrednost"}{" "}
                  *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simpleSet.reps}
                  onChange={(e) =>
                    setSimpleSet({ ...simpleSet, reps: e.target.value })
                  }
                  required
                  placeholder="Unesi vrednost"
                />
              </div>
              {hasWeight && (
                <div className="form-group">
                  <label>Težina (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={simpleSet.weight}
                    onChange={(e) =>
                      setSimpleSet({ ...simpleSet, weight: e.target.value })
                    }
                    placeholder="kg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Detailed Mode */}
          {form.category_id && inputMode === "detailed" && (
            <div className="sets-builder">
              <div className="sets-header">
                <span className="sets-label">
                  Setovi ({detailedSets.length})
                </span>
              </div>
              {detailedSets.map((s, i) => (
                <div key={i} className="set-row">
                  <span className="set-number">#{i + 1}</span>
                  <div className="set-inputs">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={s.reps}
                      onChange={(e) => updateSet(i, "reps", e.target.value)}
                      placeholder={
                        selectedCategory
                          ? getValueLabel(selectedCategory.value_type)
                          : "Vrednost"
                      }
                      required
                    />
                    {hasWeight && (
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={s.weight}
                        onChange={(e) => updateSet(i, "weight", e.target.value)}
                        placeholder="kg"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-icon btn-remove-set"
                    onClick={() => removeSet(i)}
                    disabled={detailedSets.length <= 1}
                    title="Ukloni set"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-add-set"
                onClick={addSet}
              >
                <FiPlus /> Dodaj set
              </button>
            </div>
          )}

          {/* Red 3: Datum + Napomena */}
          <div className="form-row">
            <div className="form-group">
              <label>Datum i vreme</label>
              <input
                type="datetime-local"
                value={form.attempt_date}
                onChange={(e) =>
                  setForm({ ...form, attempt_date: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Napomena</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Opciona napomena"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            <FiSend /> {submitting ? "Šalje se..." : "Unesi rezultat"}
          </button>
        </form>
      </Card>

      {/* Poslednji rezultati */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2>📋 Poslednji rezultati</h2>
          <div className="section-header-buttons">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setViewMode("records")}
            >
              <FiAward /> Pregled svih rekorda
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setViewMode("table")}
            >
              <FiList /> Pregled svih rezultata
            </button>
          </div>
        </div>

        {results.length === 0 ? (
          <p className="empty-state">Još nema unetih rezultata.</p>
        ) : (
          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Učesnik</th>
                  <th>Vežba</th>
                  <th>Kategorija</th>
                  <th>Setovi</th>
                  <th>Score</th>
                  <th>Datum</th>
                  <th className="dt-actions-col">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr className={expandedRows[r.id] ? "row-expanded" : ""}>
                      <td>
                        {r.nickname || `${r.first_name} ${r.last_name || ""}`}
                      </td>
                      <td>
                        {r.exercise_icon} {r.exercise_name}
                      </td>
                      <td>{r.category_name}</td>
                      <td>
                        <button
                          className="btn-sets-toggle"
                          onClick={() => toggleExpand(r.id)}
                          title="Prikaži setove"
                        >
                          {r.total_sets} {r.total_sets === 1 ? "set" : "setova"}
                          {expandedRows[r.id] ? (
                            <FiChevronUp />
                          ) : (
                            <FiChevronDown />
                          )}
                        </button>
                      </td>
                      <td className="value-cell">
                        {formatScore(
                          parseFloat(r.score),
                          r.value_type,
                          r.has_weight,
                        )}
                      </td>
                      <td>
                        {new Date(r.attempt_date).toLocaleDateString("sr-RS")}
                      </td>
                      <td className="dt-actions">
                        <button
                          className="btn-icon dt-btn dt-btn-view"
                          onClick={() => setDetailId(r.id)}
                          title="Pregledaj"
                        >
                          <FiEye />
                        </button>
                        {(r.user_id === currentUser?.id || isAdmin) && (
                          <>
                            <button
                              className="btn-icon dt-btn dt-btn-edit"
                              onClick={() => setEditId(r.id)}
                              title="Izmeni"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn-icon dt-btn dt-btn-delete"
                              onClick={async () => {
                                if (!window.confirm("Obrisati ovaj rezultat?"))
                                  return;
                                try {
                                  await api.deleteResult(r.id);
                                  setRefreshKey((k) => k + 1);
                                  toast.success("Rezultat obrisan.");
                                } catch (err) {
                                  toast.error(
                                    "Greška: " +
                                      (err.response?.data?.error ||
                                        err.message),
                                  );
                                }
                              }}
                              title="Obriši"
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {expandedRows[r.id] && r.sets && r.sets.length > 0 && (
                      <tr className="sets-detail-row">
                        <td colSpan="7">
                          <div className="sets-detail">
                            {r.sets.map((s) => (
                              <span key={s.id} className="set-badge">
                                Set {s.set_number}: {s.reps}
                                {r.value_type === "seconds" ? "s" : "x"}
                                {s.weight ? ` × ${s.weight}kg` : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modali */}
      <WorkoutDetailModal
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        workoutId={detailId}
      />
      <WorkoutEditModal
        isOpen={!!editId}
        onClose={() => setEditId(null)}
        workoutId={editId}
        categories={categories}
        onSaved={() => {
          setEditId(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

export default ResultsPage;
