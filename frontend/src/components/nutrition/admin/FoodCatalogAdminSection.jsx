import React, { useEffect, useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { toast } from "react-toastify";
import Modal from "../../common/Modal";
import * as api from "../../../services/api";

const initialForm = {
  name: "",
  item_type: "food",
  kcal_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
  is_active: true,
};

function FoodCatalogAdminSection() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const loadFoods = async (page = 1) => {
    setLoading(true);
    try {
      const data = await api.getFoodsPaginated({
        page,
        pageSize,
        q: query || undefined,
        include_inactive: includeInactive ? 1 : 0,
      });
      setFoods(data.data || []);
      setPagination(
        data.pagination || {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoods(1);
  }, [includeInactive, pageSize, query]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    loadFoods(nextPage);
  };

  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }

    return pages;
  };

  const openCreate = () => {
    setEditingFood(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (food) => {
    setEditingFood(food);
    setForm({
      name: food.name || "",
      item_type: food.item_type || "food",
      kcal_per_100g: food.kcal_per_100g ?? "",
      protein_per_100g: food.protein_per_100g ?? "",
      carbs_per_100g: food.carbs_per_100g ?? "",
      fat_per_100g: food.fat_per_100g ?? "",
      is_active: Boolean(food.is_active),
    });
    setModalOpen(true);
  };

  const parsedPayload = useMemo(
    () => ({
      ...form,
      kcal_per_100g: parseFloat(form.kcal_per_100g),
      protein_per_100g: parseFloat(form.protein_per_100g),
      carbs_per_100g: parseFloat(form.carbs_per_100g),
      fat_per_100g: parseFloat(form.fat_per_100g),
    }),
    [form],
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Naziv je obavezan");
      return;
    }

    const values = [
      parsedPayload.kcal_per_100g,
      parsedPayload.protein_per_100g,
      parsedPayload.carbs_per_100g,
      parsedPayload.fat_per_100g,
    ];
    if (values.some((v) => Number.isNaN(v) || v < 0)) {
      toast.error("Kcal i makroi moraju biti brojevi >= 0");
      return;
    }

    setSaving(true);
    try {
      if (editingFood) {
        await api.updateFood(editingFood.id, parsedPayload);
        toast.success("Namirnica ažurirana");
      } else {
        await api.createFood(parsedPayload);
        toast.success("Namirnica kreirana");
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingFood(null);
      await loadFoods(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (food) => {
    if (!window.confirm(`Deaktivirati "${food.name}"?`)) return;
    try {
      await api.deleteFood(food.id);
      toast.success("Namirnica deaktivirana");
      await loadFoods(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleApplyFilters = () => {
    setQuery(queryInput.trim());
  };

  return (
    <section className="dashboard-section">
      <div className="page-header">
        <div>
          <h2>🥗 Katalog namirnica i jela</h2>
          <p className="page-subtitle">
            Admin upravlja nutritivnim bazama podataka
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Nova stavka
        </button>
      </div>

      <div className="card nutrition-admin-filters">
        <div className="form-row">
          <div className="form-group">
            <label>Pretraga</label>
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Pretraga po svim kolonama..."
            />
          </div>
          <div className="form-group">
            <label>Prikaz</label>
            <select
              value={includeInactive ? "all" : "active"}
              onChange={(e) => setIncludeInactive(e.target.value === "all")}
            >
              <option value="active">Samo aktivne</option>
              <option value="all">Aktivne + neaktivne</option>
            </select>
          </div>
          <div className="form-group">
            <label>Po strani</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleApplyFilters}
          >
            Primeni
          </button>
        </div>
      </div>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Tip</th>
              <th>Kcal/100g</th>
              <th>P/100g</th>
              <th>UH/100g</th>
              <th>M/100g</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {foods.map((food) => (
              <tr key={food.id}>
                <td>{food.name}</td>
                <td>{food.item_type === "dish" ? "Jelo" : "Namirnica"}</td>
                <td>{food.kcal_per_100g}</td>
                <td>{food.protein_per_100g}</td>
                <td>{food.carbs_per_100g}</td>
                <td>{food.fat_per_100g}</td>
                <td>{food.is_active ? "Aktivno" : "Neaktivno"}</td>
                <td>
                  <div className="nutrition-admin-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => openEdit(food)}
                    >
                      <FiEdit2 /> Izmeni
                    </button>
                    {food.is_active ? (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeactivate(food)}
                      >
                        <FiTrash2 /> Deaktiviraj
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && foods.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state-small">
                  Nema namirnica za prikaz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="dt-pagination">
          <span className="dt-pagination-info">
            Prikazano {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            od {pagination.total}
          </span>
          <div className="dt-pagination-controls">
            <button
              className="dt-page-btn"
              onClick={() => goToPage(1)}
              disabled={pagination.page === 1}
              title="Prva"
            >
              <FiChevronsLeft />
            </button>
            <button
              className="dt-page-btn"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              title="Prethodna"
            >
              <FiChevronLeft />
            </button>

            {getPageNumbers().map((page) => (
              <button
                key={page}
                className={`dt-page-btn ${page === pagination.page ? "active" : ""}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="dt-page-btn"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              title="Sledeća"
            >
              <FiChevronRight />
            </button>
            <button
              className="dt-page-btn"
              onClick={() => goToPage(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              title="Poslednja"
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFood ? "Izmena namirnice" : "Nova namirnica / jelo"}
      >
        <form className="form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Naziv</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label>Tip</label>
            <select
              value={form.item_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, item_type: e.target.value }))
              }
            >
              <option value="food">Namirnica</option>
              <option value="dish">Jelo</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kcal / 100g</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.kcal_per_100g}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    kcal_per_100g: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Proteini / 100g</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.protein_per_100g}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    protein_per_100g: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>UH / 100g</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.carbs_per_100g}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    carbs_per_100g: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Masti / 100g</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.fat_per_100g}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fat_per_100g: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={form.is_active ? "1" : "0"}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  is_active: e.target.value === "1",
                }))
              }
            >
              <option value="1">Aktivno</option>
              <option value="0">Neaktivno</option>
            </select>
          </div>

          <div className="card-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Otkaži
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Čuvanje..." : "Sačuvaj"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default FoodCatalogAdminSection;
