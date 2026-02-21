import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Card from "../components/common/Card";
import Loading from "../components/common/Loading";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";

function UsersPage() {
  const { users, loading } = useApp();
  const [viewMode, setViewMode] = useState("card");
  const [visibleCount, setVisibleCount] = useState(10);

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter((user) => {
      const haystack = [
        user.first_name,
        user.last_name,
        user.nickname,
        user.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [users, query]);

  const paginated = useMemo(() => {
    const total = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const data = filteredUsers.slice(start, start + pageSize);
    return { data, total, totalPages, safePage, start };
  }, [filteredUsers, page, pageSize]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > paginated.totalPages) return;
    setPage(nextPage);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const { safePage, totalPages } = paginated;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, safePage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }

    return pages;
  };

  const handleApplySearch = () => {
    setQuery(queryInput.trim());
    setPage(1);
    setVisibleCount(10);
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👥 Učesnici</h1>
        <div className="input-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${viewMode === "card" ? "active" : ""}`}
            onClick={() => setViewMode("card")}
          >
            Card prikaz
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            Tabelarni prikaz
          </button>
        </div>
      </div>

      {viewMode === "card" ? (
        <>
          <div className="cards-grid">
            {users.slice(0, visibleCount).map((user) => (
              <Card key={user.id} className="user-card">
                <Link to={`/users/${user.id}`} className="card-link">
                  <div className="user-avatar">
                    {user.profile_image ? (
                      <img src={user.profile_image} alt={user.first_name} />
                    ) : (
                      <span className="avatar-placeholder">
                        {user.first_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="user-info">
                    <h3>
                      {user.first_name} {user.last_name || ""}
                    </h3>
                    {user.nickname && (
                      <span className="user-nickname">"{user.nickname}"</span>
                    )}
                  </div>
                </Link>
              </Card>
            ))}
            {users.length === 0 && (
              <p className="empty-state">Nema učesnika za prikaz.</p>
            )}
          </div>

          {users.length > visibleCount && (
            <div className="card-actions" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVisibleCount((prev) => prev + 10)}
              >
                Učitaj još
              </button>
            </div>
          )}
        </>
      ) : (
        <section className="dashboard-section">
          <div className="card nutrition-admin-filters">
            <div className="form-row">
              <div className="form-group">
                <label>Pretraga</label>
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ime, prezime, nadimak, email..."
                />
              </div>
              <div className="form-group">
                <label>Po strani</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
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
                onClick={handleApplySearch}
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
                  <th>Nadimak</th>
                </tr>
              </thead>
              <tbody>
                {paginated.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/users/${user.id}`}>
                        {user.first_name} {user.last_name || ""}
                      </Link>
                    </td>
                    <td>{user.email || "—"}</td>
                    <td>{user.nickname || "—"}</td>
                  </tr>
                ))}

                {paginated.data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-state-small">
                      Nema učesnika za prikaz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {paginated.totalPages > 1 && (
            <div className="dt-pagination">
              <span className="dt-pagination-info">
                Prikazano {paginated.start + 1}–
                {Math.min(paginated.start + pageSize, paginated.total)} od{" "}
                {paginated.total}
              </span>
              <div className="dt-pagination-controls">
                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(1)}
                  disabled={paginated.safePage === 1}
                >
                  <FiChevronsLeft />
                </button>
                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(paginated.safePage - 1)}
                  disabled={paginated.safePage === 1}
                >
                  <FiChevronLeft />
                </button>

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`dt-page-btn ${pageNum === paginated.safePage ? "active" : ""}`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(paginated.safePage + 1)}
                  disabled={paginated.safePage === paginated.totalPages}
                >
                  <FiChevronRight />
                </button>
                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(paginated.totalPages)}
                  disabled={paginated.safePage === paginated.totalPages}
                >
                  <FiChevronsRight />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default UsersPage;
