import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import { useActivity } from "../context/ActivityContext";
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle } from "react-icons/fi";

const initialForm = {
  name: "",
  code: "",
  description: "",
};

function AdminActivityTypesPage() {
  const {
    activityTypes,
    loadingTypes,
    loadActivityTypes,
    addActivityType,
    editActivityType,
    removeActivityType,
  } = useActivity();

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    try {
      await loadActivityTypes({ include_inactive: 1 });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const reset = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await editActivityType(editingId, form);
        toast.success("Tip aktivnosti je izmenjen.");
      } else {
        await addActivityType(form);
        toast.success("Tip aktivnosti je dodat.");
      }
      reset();
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      code: row.code || "",
      description: row.description || "",
    });
  };

  const handleToggleActive = async (row) => {
    try {
      await editActivityType(row.id, { is_active: row.is_active ? 0 : 1 });
      toast.success("Status tipa aktivnosti je ažuriran.");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm("Deaktivirati ovaj tip aktivnosti?");
    if (!confirmed) return;
    try {
      await removeActivityType(row.id);
      toast.success("Tip aktivnosti je deaktiviran.");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">🛡️ Admin • Activity Types</h1>

      <Card>
        <h3>{editingId ? "Izmeni tip aktivnosti" : "Dodaj tip aktivnosti"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid three-cols">
            <div className="form-group">
              <label>Naziv *</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="npr. trail_running"
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Opis</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>

          <div className="metrics-form-actions">
            <button type="button" className="btn btn-outline" onClick={reset}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? "Čuvanje..."
                : editingId
                  ? "Sačuvaj izmene"
                  : "Dodaj tip"}
            </button>
          </div>
        </form>
      </Card>

      <Card className="mt-3">
        <h3>Svi tipovi aktivnosti</h3>
        {loadingTypes ? (
          <p className="empty-state-small">Učitavanje...</p>
        ) : activityTypes.length === 0 ? (
          <p className="empty-state">Nema unetih tipova aktivnosti.</p>
        ) : (
          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Naziv</th>
                  <th>Code</th>
                  <th>Opis</th>
                  <th>Status</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {activityTypes.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.code}</td>
                    <td>{row.description || "-"}</td>
                    <td>{row.is_active ? "Aktivan" : "Neaktivan"}</td>
                    <td>
                      <div className="section-header-buttons">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(row)}
                          title="Izmeni"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${row.is_active ? "btn-warning" : "btn-success"}`}
                          onClick={() => handleToggleActive(row)}
                          title={row.is_active ? "Deaktiviraj" : "Aktiviraj"}
                        >
                          {row.is_active ? <FiXCircle /> : <FiCheckCircle />}
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDelete(row)}
                          title="Obriši"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminActivityTypesPage;
