import React, { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";

function CategoriesDataTableView({
  categories,
  isAdmin,
  onEditCategory,
  onDeleteCategory,
}) {
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categories;

    return categories.filter((category) => {
      const haystack = [
        category.name,
        category.exercise_name,
        category.value_type,
        category.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [categories, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedData = filtered.slice(startIndex, startIndex + pageSize);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

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

  const handleApply = () => {
    setQuery(queryInput.trim());
    setPage(1);
  };

  return (
    <section className="dashboard-section">
      <h2>📋 Kategorije (tabelarni prikaz)</h2>

      <div className="card nutrition-admin-filters">
        <div className="form-row">
          <div className="form-group">
            <label>Pretraga kategorija</label>
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Kategorija, vežba, tip..."
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
            onClick={handleApply}
          >
            Primeni
          </button>
        </div>
      </div>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Kategorija</th>
              <th>Vežba</th>
              <th>Tip</th>
              <th>Teg</th>
              <th>Boja</th>
              <th>Opis</th>
              {isAdmin && <th>Akcije</th>}
            </tr>
          </thead>
          <tbody>
            {pagedData.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>
                  {category.exercise_icon} {category.exercise_name}
                </td>
                <td>{category.value_type}</td>
                <td>{category.has_weight ? "Da" : "Ne"}</td>
                <td>
                  <span
                    className="cat-color-dot"
                    style={{ backgroundColor: category.color || "#6366f1" }}
                  />
                  {category.color || "#6366f1"}
                </td>
                <td>{category.description || "—"}</td>
                {isAdmin && (
                  <td>
                    <div className="nutrition-admin-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onEditCategory(category)}
                      >
                        <FiEdit2 /> Izmeni
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onDeleteCategory(category)}
                      >
                        <FiTrash2 /> Obriši
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {pagedData.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="empty-state-small">
                  Nema kategorija za prikaz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="dt-pagination">
          <span className="dt-pagination-info">
            Prikazano {startIndex + 1}–{Math.min(startIndex + pageSize, total)}{" "}
            od {total}
          </span>
          <div className="dt-pagination-controls">
            <button
              className="dt-page-btn"
              onClick={() => goToPage(1)}
              disabled={safePage === 1}
            >
              <FiChevronsLeft />
            </button>
            <button
              className="dt-page-btn"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
            >
              <FiChevronLeft />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                className={`dt-page-btn ${pageNum === safePage ? "active" : ""}`}
                onClick={() => goToPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              className="dt-page-btn"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
            >
              <FiChevronRight />
            </button>
            <button
              className="dt-page-btn"
              onClick={() => goToPage(totalPages)}
              disabled={safePage === totalPages}
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CategoriesDataTableView;
