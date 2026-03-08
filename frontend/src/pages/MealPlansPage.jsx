import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import MealPlanDetailModal from "../components/mealPlans/MealPlanDetailModal";
import SectionedCollectionShell from "../components/plans/SectionedCollectionShell";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiClipboard,
  FiCopy,
  FiEdit2,
  FiEye,
  FiList,
  FiPlay,
  FiTrash2,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import {
  getPageNumbers,
  useSectionedCollectionPage,
} from "../components/plans/useSectionedCollectionPage";

const SECTION_ITEMS = [
  {
    key: "plans",
    path: "/meal-plans",
    label: "Moji planovi",
    title: "🍽️ Moji planovi ishrane",
    icon: <FiClipboard />,
    emptyTitle: "Nema planova ishrane",
    emptyText: "Kreiraj prvi plan ishrane ili proširi pretragu.",
    searchPlaceholder: "Naziv, opis, obroci, kategorije, status ili korisnik",
  },
  {
    key: "sessions",
    path: "/meal-plans/sessions",
    label: "Sesije",
    title: "📅 Sesije ishrane",
    icon: <FiList />,
    emptyTitle: "Nema sesija ishrane",
    emptyText: "Zakazani i poslati planovi ishrane će se prikazati ovde.",
    searchPlaceholder: "Naziv, opis, obroci, kategorije, status ili korisnik",
  },
  {
    key: "sent",
    path: "/meal-plans/sent",
    label: "Poslate sesije",
    title: "📤 Poslate sesije ishrane",
    icon: <FiCalendar />,
    emptyTitle: "Nema poslatih sesija",
    emptyText:
      "Sesije ishrane koje pošalješ drugim korisnicima biće prikazane ovde.",
    searchPlaceholder: "Naziv, opis, obroci, kategorije, status ili korisnik",
  },
];

const SORT_OPTIONS = {
  plans: [
    { value: "updated_at", label: "Poslednja izmena" },
    { value: "name", label: "Naziv" },
    { value: "meal_count", label: "Broj obroka" },
    { value: "created_at", label: "Datum kreiranja" },
  ],
  sessions: [
    { value: "scheduled_date", label: "Datum" },
    { value: "status", label: "Status" },
    { value: "plan_name", label: "Naziv plana" },
    { value: "meal_count", label: "Broj obroka" },
  ],
  sent: [
    { value: "scheduled_date", label: "Datum" },
    { value: "status", label: "Status" },
    { value: "plan_name", label: "Naziv plana" },
    { value: "meal_count", label: "Broj obroka" },
  ],
};

const DEFAULT_SORTS = {
  plans: { sort: "updated_at", order: "desc" },
  sessions: { sort: "scheduled_date", order: "desc" },
  sent: { sort: "scheduled_date", order: "desc" },
};

function MealPlansPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [detailPlanId, setDetailPlanId] = useState(null);

  const {
    activeSection,
    sectionConfig,
    visibleSections,
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
    listState,
    tablePage,
    setTablePage,
    tablePageSize,
    setTablePageSize,
    scheduleId,
    setScheduleId,
    scheduleDate,
    setScheduleDate,
    scheduleUserId,
    setScheduleUserId,
    users,
    usersLoading,
    loadMoreRef,
    refreshCurrentView,
    loadMoreCards,
    handleApplyFilters,
    handleResetFilters,
    isSessionSection,
    hasMoreCards,
    hasFiltersApplied,
    selectedScheduledItem,
  } = useSectionedCollectionPage({
    sectionItems: SECTION_ITEMS,
    defaultSectionKey: "plans",
    isAdmin,
    fetchPlans: api.getMealPlans,
    fetchSessions: api.getMealSessions,
    loadUsersRequest: api.getUsers,
    defaultSortBySection: DEFAULT_SORTS,
  });

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Obriši ovaj plan ishrane?")) {
      return;
    }

    try {
      await api.deleteMealPlan(id);
      toast.success("Plan ishrane obrisan");
      await refreshCurrentView();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSchedule = async () => {
    if (!scheduleId || !scheduleDate) {
      return;
    }

    if (isAdmin && !scheduleUserId) {
      toast.warn("Izaberi korisnika za koga zakazuješ plan ishrane.");
      return;
    }

    try {
      const data = { scheduled_date: scheduleDate };
      if (isAdmin && scheduleUserId) {
        data.user_id = parseInt(scheduleUserId, 10);
      }

      const result = await api.scheduleMealPlan(scheduleId, data);
      toast.success(result.message || "Plan ishrane zakazan");
      setScheduleId(null);
      setScheduleUserId("");
      await refreshCurrentView();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await api.startMealSession(sessionId);
      navigate(`/meal-plans/session/${sessionId}`);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Otkaži ovu sesiju ishrane?")) {
      return;
    }

    try {
      await api.deleteMealSession(id);
      toast.success("Sesija ishrane otkazana");
      await refreshCurrentView();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      scheduled: {
        label: "Zakazano",
        icon: <FiCalendar />,
        cls: "badge-scheduled",
      },
      in_progress: {
        label: "U toku",
        icon: <FiPlay />,
        cls: "badge-in-progress",
      },
      completed: {
        label: "Završeno",
        icon: <FiCheckCircle />,
        cls: "badge-completed",
      },
      skipped: {
        label: "Preskočeno",
        icon: <FiXCircle />,
        cls: "badge-skipped",
      },
    };
    const statusConfig = map[status] || map.scheduled;

    return (
      <span className={`session-status-badge ${statusConfig.cls}`}>
        {statusConfig.icon} {statusConfig.label}
      </span>
    );
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleDateString("sr-Latn-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderPlanCard = (plan) => (
    <div
      key={plan.id}
      className="plan-card"
      style={{ borderTopColor: plan.color || "#0f766e" }}
    >
      <div className="plan-card-header">
        <div
          className="plan-card-color"
          style={{ background: plan.color || "#0f766e" }}
        />
        <div className="plan-card-title">
          <h3>{plan.name}</h3>
          {plan.description && <p>{plan.description}</p>}
        </div>
      </div>
      <div className="plan-card-meta plan-card-meta-grid">
        <span>{plan.meal_count} obroka</span>
        <span>Ažurirano: {formatDate(plan.updated_at)}</span>
      </div>
      <div className="plan-card-actions">
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setDetailPlanId(plan.id)}
          title="Detalji"
        >
          <FiEye />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => navigate(`/meal-plans/${plan.id}/edit`)}
          title="Izmeni"
        >
          <FiEdit2 />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => navigate(`/meal-plans/new?copyFrom=${plan.id}`)}
          title="Kopiraj"
        >
          <FiCopy />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setScheduleId(plan.id)}
          title="Zakaži"
        >
          <FiCalendar />
        </button>
        <button
          className="btn btn-sm btn-ghost btn-danger-ghost"
          onClick={() => handleDeletePlan(plan.id)}
          title="Obriši"
        >
          <FiTrash2 />
        </button>
      </div>

      {scheduleId === plan.id && (
        <div className="plan-schedule-popover">
          {isAdmin && (
            <div className="form-group">
              <label className="form-label">
                <FiUser size={13} /> Korisnik
              </label>
              <select
                value={scheduleUserId}
                onChange={(event) => setScheduleUserId(event.target.value)}
                className="form-control"
                disabled={usersLoading}
              >
                <option value="">— Izaberi korisnika —</option>
                {users.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.nickname ||
                      `${entry.first_name} ${entry.last_name || ""}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">
              <FiCalendar size={13} /> Datum
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
              className="form-control"
            />
          </div>
          <div className="plan-schedule-inline">
            <button className="btn btn-sm btn-primary" onClick={handleSchedule}>
              Zakaži
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setScheduleId(null);
                setScheduleUserId("");
              }}
            >
              Otkaži
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSessionCard = (session) => {
    const assigneeName =
      session.assigned_nickname ||
      [session.assigned_first_name, session.assigned_last_name]
        .filter(Boolean)
        .join(" ") ||
      "Korisnik";
    const senderName =
      session.scheduled_by_nickname ||
      [session.scheduled_by_first_name, session.scheduled_by_last_name]
        .filter(Boolean)
        .join(" ") ||
      "Korisnik";

    return (
      <div key={session.id} className="session-card">
        <div className="session-card-left">
          {getStatusBadge(session.status)}
          <div className="session-card-info">
            <strong>{session.plan_name}</strong>
            <span className="session-card-date">
              <FiCalendar size={12} /> {formatDate(session.scheduled_date)}
            </span>
            <span className="session-card-exercises">
              {activeSection === "sent" ? (
                <>
                  <FiUser size={12} /> {assigneeName} · {session.meal_count}{" "}
                  obroka
                </>
              ) : session.session_type === "sent_to_me" ? (
                <>
                  <FiUser size={12} /> Poslao: {senderName} ·{" "}
                  {session.meal_count} obroka
                </>
              ) : (
                <>{session.meal_count} obroka</>
              )}
              {(session.status === "in_progress" ||
                session.status === "completed") &&
                ` · ${session.completed_meals || 0}/${session.total_meals} završeno`}
            </span>
          </div>
        </div>
        <div className="session-card-actions">
          {session.status === "scheduled" && activeSection !== "sent" && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleStartSession(session.id)}
            >
              <FiPlay /> Započni
            </button>
          )}
          {session.status === "in_progress" && activeSection !== "sent" && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => navigate(`/meal-plans/session/${session.id}`)}
            >
              <FiPlay /> Nastavi
            </button>
          )}
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => navigate(`/meal-plans/session/${session.id}/detail`)}
          >
            <FiEye /> {activeSection === "sent" ? "Pregled" : "Detalji"}
          </button>
          {activeSection !== "sent" && session.status !== "completed" && (
            <button
              className="btn btn-sm btn-ghost btn-danger-ghost"
              onClick={() => handleDeleteSession(session.id)}
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTable = () => {
    const page = listState.pagination.page || 1;
    const totalPages = listState.pagination.totalPages || 1;
    const total = listState.pagination.total || 0;
    const startIndex =
      total === 0 ? 0 : (page - 1) * listState.pagination.pageSize + 1;
    const endIndex = Math.min(page * listState.pagination.pageSize, total);

    return (
      <>
        <div className="results-table-wrapper plans-table-wrapper">
          <table className="results-table dt-table">
            <thead>
              {activeSection === "plans" ? (
                <tr>
                  <th>Naziv</th>
                  <th>Opis</th>
                  <th>Obroci</th>
                  <th>Ažurirano</th>
                  <th className="dt-actions-col">Akcije</th>
                </tr>
              ) : (
                <tr>
                  <th>Plan</th>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Napredak</th>
                  {activeSection === "sent" && <th>Korisnik</th>}
                  <th className="dt-actions-col">Akcije</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeSection === "plans"
                ? listState.items.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <div className="plans-table-name-cell">
                          <span
                            className="plan-card-color"
                            style={{ background: plan.color || "#0f766e" }}
                          />
                          <span>{plan.name}</span>
                        </div>
                      </td>
                      <td>{plan.description || "—"}</td>
                      <td>{plan.meal_count}</td>
                      <td>{formatDate(plan.updated_at)}</td>
                      <td>
                        <div className="dt-actions">
                          <button
                            className="btn-icon dt-btn dt-btn-view"
                            onClick={() => setDetailPlanId(plan.id)}
                            title="Detalji"
                          >
                            <FiEye />
                          </button>
                          <button
                            className="btn-icon dt-btn dt-btn-edit"
                            onClick={() =>
                              navigate(`/meal-plans/${plan.id}/edit`)
                            }
                            title="Izmeni"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn-icon dt-btn dt-btn-view"
                            onClick={() =>
                              navigate(`/meal-plans/new?copyFrom=${plan.id}`)
                            }
                            title="Kopiraj"
                          >
                            <FiCopy />
                          </button>
                          <button
                            className="btn-icon dt-btn dt-btn-edit"
                            onClick={() => setScheduleId(plan.id)}
                            title="Zakaži"
                          >
                            <FiCalendar />
                          </button>
                          <button
                            className="btn-icon dt-btn dt-btn-delete"
                            onClick={() => handleDeletePlan(plan.id)}
                            title="Obriši"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : listState.items.map((session) => {
                    const assigneeName =
                      session.assigned_nickname ||
                      [session.assigned_first_name, session.assigned_last_name]
                        .filter(Boolean)
                        .join(" ") ||
                      "Korisnik";

                    return (
                      <tr key={session.id}>
                        <td>{session.plan_name}</td>
                        <td>{formatDate(session.scheduled_date)}</td>
                        <td>{getStatusBadge(session.status)}</td>
                        <td>
                          {session.completed_meals || 0}/
                          {session.total_meals || session.meal_count}
                        </td>
                        {activeSection === "sent" && <td>{assigneeName}</td>}
                        <td>
                          <div className="dt-actions">
                            {session.status === "scheduled" &&
                              activeSection !== "sent" && (
                                <button
                                  className="btn-icon dt-btn dt-btn-edit"
                                  onClick={() => handleStartSession(session.id)}
                                  title="Započni"
                                >
                                  <FiPlay />
                                </button>
                              )}
                            {session.status === "in_progress" &&
                              activeSection !== "sent" && (
                                <button
                                  className="btn-icon dt-btn dt-btn-edit"
                                  onClick={() =>
                                    navigate(
                                      `/meal-plans/session/${session.id}`,
                                    )
                                  }
                                  title="Nastavi"
                                >
                                  <FiPlay />
                                </button>
                              )}
                            <button
                              className="btn-icon dt-btn dt-btn-view"
                              onClick={() =>
                                navigate(
                                  `/meal-plans/session/${session.id}/detail`,
                                )
                              }
                              title="Detalji"
                            >
                              <FiEye />
                            </button>
                            {activeSection !== "sent" &&
                              session.status !== "completed" && (
                                <button
                                  className="btn-icon dt-btn dt-btn-delete"
                                  onClick={() =>
                                    handleDeleteSession(session.id)
                                  }
                                  title="Otkaži"
                                >
                                  <FiTrash2 />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="dt-pagination">
            <span className="dt-pagination-info">
              Prikazano {startIndex}–{endIndex} od {total}
            </span>
            <div className="dt-pagination-controls">
              <button
                className="dt-page-btn"
                onClick={() => setTablePage(1)}
                disabled={page === 1}
              >
                <FiChevronsLeft />
              </button>
              <button
                className="dt-page-btn"
                onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                <FiChevronLeft />
              </button>

              {getPageNumbers(page, totalPages).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`dt-page-btn ${pageNumber === page ? "active" : ""}`}
                  onClick={() => setTablePage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                className="dt-page-btn"
                onClick={() =>
                  setTablePage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page === totalPages}
              >
                <FiChevronRight />
              </button>
              <button
                className="dt-page-btn"
                onClick={() => setTablePage(totalPages)}
                disabled={page === totalPages}
              >
                <FiChevronsRight />
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <SectionedCollectionShell
      sectionConfig={sectionConfig}
      visibleSections={visibleSections}
      activeSection={activeSection}
      onSectionChange={navigate}
      createPath="/meal-plans/new"
      createLabel="Novi plan"
      emptyActionLabel="Kreiraj plan"
      onCreate={() => navigate("/meal-plans/new")}
      subtitle="Svaka sekcija učitava samo svoje podatke i podržava card i tabelarni prikaz."
      viewMode={viewMode}
      setViewMode={setViewMode}
      queryInput={queryInput}
      setQueryInput={setQueryInput}
      statusInput={statusInput}
      setStatusInput={setStatusInput}
      fromInput={fromInput}
      setFromInput={setFromInput}
      toInput={toInput}
      setToInput={setToInput}
      sortInput={sortInput}
      setSortInput={setSortInput}
      orderInput={orderInput}
      setOrderInput={setOrderInput}
      sortOptions={SORT_OPTIONS[activeSection]}
      tablePageSize={tablePageSize}
      setTablePageSize={setTablePageSize}
      isSessionSection={isSessionSection}
      handleApplyFilters={handleApplyFilters}
      handleResetFilters={handleResetFilters}
      loading={listState.loading}
      hasItems={listState.items.length > 0}
      hasFiltersApplied={hasFiltersApplied}
    >
      {viewMode === "card" ? (
        <>
          <div
            className={
              activeSection === "plans" ? "plans-grid" : "sessions-list"
            }
          >
            {activeSection === "plans"
              ? listState.items.map((plan) => renderPlanCard(plan))
              : listState.items.map((session) => renderSessionCard(session))}
          </div>

          <div className="plans-card-footer">
            <span className="plans-card-summary">
              Prikazano {listState.items.length} od {listState.pagination.total}
            </span>
            {hasMoreCards && (
              <button
                className="btn btn-secondary"
                onClick={loadMoreCards}
                disabled={listState.loadingMore}
              >
                {listState.loadingMore ? "Učitavanje..." : "Prikaži više"}
              </button>
            )}
          </div>
          <div ref={loadMoreRef} className="plans-load-more-sentinel" />
        </>
      ) : (
        renderTable()
      )}

      {activeSection === "plans" && viewMode === "table" && scheduleId && (
        <div className="card plans-inline-scheduler">
          <div className="plans-inline-scheduler-header">
            <h3>Zakaži plan ishrane</h3>
            <span>{selectedScheduledItem?.name || "Izabrani plan"}</span>
          </div>
          {isAdmin && (
            <div className="form-group">
              <label className="form-label">
                <FiUser size={13} /> Korisnik
              </label>
              <select
                value={scheduleUserId}
                onChange={(event) => setScheduleUserId(event.target.value)}
                className="form-control"
                disabled={usersLoading}
              >
                <option value="">— Izaberi korisnika —</option>
                {users.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.nickname ||
                      `${entry.first_name} ${entry.last_name || ""}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">
              <FiCalendar size={13} /> Datum
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
              className="form-control"
            />
          </div>
          <div className="plan-schedule-inline">
            <button className="btn btn-sm btn-primary" onClick={handleSchedule}>
              Zakaži
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setScheduleId(null);
                setScheduleUserId("");
              }}
            >
              Otkaži
            </button>
          </div>
        </div>
      )}

      <MealPlanDetailModal
        isOpen={!!detailPlanId}
        onClose={() => setDetailPlanId(null)}
        planId={detailPlanId}
      />
    </SectionedCollectionShell>
  );
}

export default MealPlansPage;
