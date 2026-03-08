import React from "react";
import { FiGrid, FiList, FiPlus, FiSearch } from "react-icons/fi";
import Loading from "../common/Loading";
import { TABLE_PAGE_OPTIONS } from "./useSectionedCollectionPage";

function SectionedCollectionShell({
  sectionConfig,
  visibleSections,
  activeSection,
  onSectionChange,
  createPath,
  createLabel,
  onCreate,
  subtitle,
  viewMode,
  setViewMode,
  queryInput,
  setQueryInput,
  statusInput,
  setStatusInput,
  fromInput,
  setFromInput,
  toInput,
  setToInput,
  sortInput,
  setSortInput,
  orderInput,
  setOrderInput,
  sortOptions,
  tablePageSize,
  setTablePageSize,
  isSessionSection,
  handleApplyFilters,
  handleResetFilters,
  loading,
  hasItems,
  hasFiltersApplied,
  emptyActionLabel,
  children,
}) {
  return (
    <div className="page plans-page plans-page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{sectionConfig?.title}</h1>
          <p className="plans-page-subtitle">{subtitle}</p>
        </div>

        <button className="btn btn-primary" onClick={onCreate}>
          <FiPlus /> {createLabel}
        </button>
      </div>

      <div className="plans-tabs plans-route-tabs">
        {visibleSections.map((section) => (
          <button
            key={section.key}
            className={`plans-tab ${section.key === activeSection ? "active" : ""}`}
            onClick={() => onSectionChange(section.path)}
          >
            {section.icon} {section.label}
          </button>
        ))}
      </div>

      <div className="card plans-filters-card">
        <div className="plans-filters-top">
          <div className="form-group plans-search-group">
            <label>Pretraga</label>
            <div className="plans-search-input-wrap">
              <FiSearch />
              <input
                type="text"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleApplyFilters();
                  }
                }}
                placeholder={sectionConfig?.searchPlaceholder}
              />
            </div>
          </div>

          <div className="plans-view-actions">
            <div className="form-group plans-sort-group">
              <label>Sortiraj</label>
              <select
                value={sortInput}
                onChange={(event) => setSortInput(event.target.value)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group plans-order-group">
              <label>Redosled</label>
              <select
                value={orderInput}
                onChange={(event) => setOrderInput(event.target.value)}
              >
                <option value="desc">Opadajuće</option>
                <option value="asc">Rastuće</option>
              </select>
            </div>

            {viewMode === "table" && (
              <div className="form-group plans-page-size-group">
                <label>Po strani</label>
                <select
                  value={tablePageSize}
                  onChange={(event) =>
                    setTablePageSize(parseInt(event.target.value, 10))
                  }
                >
                  {TABLE_PAGE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="input-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${viewMode === "card" ? "active" : ""}`}
              onClick={() => setViewMode("card")}
            >
              <FiGrid />
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              <FiList />
            </button>
          </div>
        </div>

        {isSessionSection && (
          <div className="plans-filters-grid">
            <div className="form-group">
              <label>Status</label>
              <select
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value)}
              >
                <option value="">Svi statusi</option>
                <option value="scheduled">Zakazano</option>
                <option value="in_progress">U toku</option>
                <option value="completed">Završeno</option>
                <option value="skipped">Preskočeno</option>
              </select>
            </div>
            <div className="form-group">
              <label>Od datuma</label>
              <input
                type="date"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Do datuma</label>
              <input
                type="date"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
              />
            </div>
          </div>
        )}

        <div className="card-actions plans-filter-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyFilters}
          >
            Primeni
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleResetFilters}
          >
            Resetuj
          </button>
        </div>
      </div>

      {loading && <Loading />}

      {!loading && !hasItems && (
        <div className="empty-state">
          {sectionConfig?.icon}
          <h3>{sectionConfig?.emptyTitle}</h3>
          <p>
            {hasFiltersApplied
              ? "Nema rezultata za zadate filtere. Pokušaj sa širom pretragom."
              : sectionConfig?.emptyText}
          </p>
          {activeSection === "plans" && (
            <button className="btn btn-primary" onClick={onCreate}>
              <FiPlus /> {emptyActionLabel || createLabel}
            </button>
          )}
        </div>
      )}

      {!loading && hasItems && children}
    </div>
  );
}

export default SectionedCollectionShell;
