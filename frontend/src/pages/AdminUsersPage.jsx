import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import * as api from "../services/api";
import Card from "../components/common/Card";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";

function AdminUsersPage() {
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    password: "",
    role: "user",
    show_in_users_list: true,
  });

  const loadPending = async () => {
    try {
      const data = await api.getPendingUsers();
      setPending(data);
    } catch (err) {
      toast.error("Greška pri učitavanju.");
    } finally {
      setLoadingPending(false);
    }
  };

  const loadUsers = async (page = 1) => {
    setLoadingUsers(true);
    try {
      const data = await api.getUsersPaginated({
        page,
        pageSize,
        q: query || undefined,
        role: roleFilter,
      });
      setUsers(data.data || []);
      setPagination(
        data.pagination || {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      toast.error("Greška pri učitavanju korisnika.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [pageSize, query, roleFilter]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    loadUsers(nextPage);
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

  const handleApprove = async (id, name) => {
    try {
      await api.approveUser(id);
      toast.success(`${name} je odobren! ✅`);
      setPending((prev) => prev.filter((u) => u.id !== id));
      await loadUsers(pagination.page);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Odbiti i obrisati korisnika "${name}"?`)) return;
    try {
      await api.rejectUser(id);
      toast.success(`${name} je odbijen.`);
      setPending((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleRoleChange = async (id, currentRole, name) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!window.confirm(`Promeniti rolu za "${name}" u ${newRole}?`)) return;
    try {
      await api.changeUserRole(id, newRole);
      toast.success(`${name} je sada ${newRole}.`);
      await loadUsers(pagination.page);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleApplyFilters = () => {
    setQuery(queryInput.trim());
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      first_name: "",
      last_name: "",
      nickname: "",
      email: "",
      password: "",
      role: "user",
      show_in_users_list: true,
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      nickname: user.nickname || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
      show_in_users_list: Boolean(user.show_in_users_list),
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (!editingUser && !data.password) {
        toast.error("Lozinka je obavezna za novog korisnika.");
        return;
      }

      if (editingUser && !data.password) {
        delete data.password;
      }

      if (imageFile) data.profile_image = imageFile;

      if (editingUser) {
        await api.updateUser(editingUser.id, data);
        toast.success("Korisnik ažuriran!");
      } else {
        await api.createUser(data);
        toast.success("Korisnik dodat i odobren!");
      }

      setModalOpen(false);
      await loadUsers(1);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Obrisati korisnika "${user.first_name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success("Korisnik obrisan!");
      await loadUsers(pagination.page);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  if (loadingPending) return <Loading />;

  return (
    <div className="page">
      <h1 className="page-title">🛡️ Admin • Korisnici</h1>

      <section className="dashboard-section">
        <h2>⏳ Čekaju odobrenje ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="empty-state">Nema korisnika na čekanju.</p>
        ) : (
          <div className="cards-grid">
            {pending.map((u) => (
              <Card key={u.id} className="pending-card">
                <div className="pending-info">
                  <div className="pending-avatar">
                    <span className="avatar-placeholder">
                      {u.first_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3>
                      {u.first_name} {u.last_name || ""}
                    </h3>
                    {u.nickname && (
                      <span className="user-nickname">"{u.nickname}"</span>
                    )}
                    <p className="pending-email">{u.email}</p>
                    <p className="pending-date">
                      Registrovan:{" "}
                      {new Date(u.created_at).toLocaleDateString("sr-RS")}
                    </p>
                  </div>
                </div>
                <div className="pending-actions">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleApprove(u.id, u.first_name)}
                  >
                    <FiCheck /> Odobri
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleReject(u.id, u.first_name)}
                  >
                    <FiX /> Odbij
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>👥 Svi korisnici</h2>

        <div className="card-actions" style={{ marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={openCreate}>
            Dodaj korisnika
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
                placeholder="Ime, email, nadimak, rola..."
              />
            </div>
            <div className="form-group">
              <label>Rola</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Sve role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
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
                <th>Ime</th>
                <th>Email</th>
                <th>Rola</th>
                <th>Akcija</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.first_name} {u.last_name || ""}{" "}
                    {u.nickname ? `"${u.nickname}"` : ""}
                  </td>
                  <td>{u.email || "—"}</td>
                  <td>
                    <span
                      className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"}`}
                    >
                      {u.role === "admin" ? (
                        <>
                          <FiShield /> Admin
                        </>
                      ) : (
                        <>
                          <FiUser /> User
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className="nutrition-admin-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() =>
                          handleRoleChange(u.id, u.role, u.first_name)
                        }
                      >
                        {u.role === "admin" ? "Postavi User" : "Postavi Admin"}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEdit(u)}
                      >
                        Izmeni
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(u)}
                      >
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loadingUsers && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state-small">
                    Nema korisnika za prikaz.
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
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total,
              )}{" "}
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
      </section>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? "Izmeni korisnika" : "Dodaj korisnika"}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Ime *</label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, first_name: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>Prezime</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, last_name: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>Nadimak</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nickname: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>
              Lozinka {editingUser ? "(ostavi prazno za bez izmene)" : "*"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>Rola</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.show_in_users_list}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    show_in_users_list: e.target.checked,
                  }))
                }
              />
              <span>Prikaži korisnika na listi učesnika</span>
            </label>
          </div>
          <div className="form-group">
            <label>Profilna slika</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            {editingUser ? "Sačuvaj" : "Dodaj korisnika"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default AdminUsersPage;
