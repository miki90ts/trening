import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/common/Loading";
import ActivityPlanDetailModal from "../components/activityPlans/ActivityPlanDetailModal";
import * as api from "../services/api";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiCopy,
  FiEdit2,
  FiEye,
  FiList,
  FiPlay,
  FiPlus,
  FiTrash2,
  FiUser,
  FiXCircle,
} from "react-icons/fi";

function ActivityPlansPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleId, setScheduleId] = useState(null);
  const [detailPlanId, setDetailPlanId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [scheduleUserId, setScheduleUserId] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const promises = [api.getActivityPlans(), api.getActivityPlanSessions()];
      if (isAdmin) {
        promises.push(api.getUsers());
      }
      const [plansResult, sessionsResult, usersResult] =
        await Promise.all(promises);
      setPlans(plansResult || []);
      setSessions(sessionsResult || []);
      if (usersResult) {
        setUsers(usersResult || []);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.message ||
          "Greška pri učitavanju planova aktivnosti",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sessionsTabItems = useMemo(
    () =>
      sessions.filter((session) => session.session_type !== "sent_to_other"),
    [sessions],
  );
  const sentSessions = useMemo(
    () =>
      sessions.filter((session) => session.session_type === "sent_to_other"),
    [sessions],
  );

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
    const current = map[status] || map.scheduled;
    return (
      <span className={`session-status-badge ${current.cls}`}>
        {current.icon} {current.label}
      </span>
    );
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Obriši ovaj plan aktivnosti?")) return;
    try {
      await api.deleteActivityPlan(planId);
      toast.success("Plan aktivnosti obrisan");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleId || !scheduleDate) return;
    if (isAdmin && !scheduleUserId) {
      toast.warn("Izaberi korisnika za koga zakazuješ plan aktivnosti.");
      return;
    }

    try {
      const payload = { scheduled_date: scheduleDate };
      if (isAdmin && scheduleUserId) {
        payload.user_id = parseInt(scheduleUserId, 10);
      }
      await api.scheduleActivityPlan(scheduleId, payload);
      toast.success("Plan aktivnosti zakazan");
      setScheduleId(null);
      setScheduleUserId("");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await api.startActivityPlanSession(sessionId);
      navigate(`/activity-plans/session/${sessionId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Obriši ovu activity sesiju?")) return;
    try {
      await api.deleteActivityPlanSession(sessionId);
      toast.success("Activity sesija obrisana");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("sr-Latn-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderSessionCard = (session, sentView = false) => {
    const assignedName =
      session.assigned_nickname ||
      [session.assigned_first_name, session.assigned_last_name]
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
              <FiCalendar size={12} /> {formatDate(session.scheduled_date)} ·{" "}
              {session.activity_type_name}
            </span>
            <span className="session-card-exercises">
              {sentView && (
                <>
                  <FiUser size={12} /> {assignedName} ·{" "}
                </>
              )}
              {session.segment_count || 0} segmenata ·{" "}
              {session.completed_segments || 0}/{session.segment_count || 0}{" "}
              završeno
            </span>
          </div>
        </div>
        <div className="session-card-actions">
          {sentView ? (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() =>
                navigate(
                  session.activity_id
                    ? `/activity/${session.activity_id}`
                    : `/activity-plans/session/${session.id}`,
                )
              }
            >
              <FiEye /> Pregled
            </button>
          ) : (
            <>
              {session.status === "scheduled" && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleStartSession(session.id)}
                >
                  <FiPlay /> Započni
                </button>
              )}
              {session.status === "in_progress" && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() =>
                    navigate(`/activity-plans/session/${session.id}`)
                  }
                >
                  <FiPlay /> Nastavi
                </button>
              )}
              {session.status === "completed" && session.activity_id && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => navigate(`/activity/${session.activity_id}`)}
                >
                  <FiEye /> Activity
                </button>
              )}
              {session.status !== "completed" && (
                <button
                  className="btn btn-sm btn-ghost btn-danger-ghost"
                  onClick={() => handleDeleteSession(session.id)}
                >
                  <FiTrash2 />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="page plans-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏃 Plan aktivnosti</h1>
          <p className="page-subtitle">
            Strukturirani planovi trčanja, intervala i splitova
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/activity-plans/new")}
        >
          <FiPlus /> Novi plan aktivnosti
        </button>
      </div>

      <div className="plans-tabs">
        <button
          className={`plans-tab ${tab === "plans" ? "active" : ""}`}
          onClick={() => setTab("plans")}
        >
          <FiActivity /> Planovi ({plans.length})
        </button>
        <button
          className={`plans-tab ${tab === "sessions" ? "active" : ""}`}
          onClick={() => setTab("sessions")}
        >
          <FiList /> Sesije ({sessionsTabItems.length})
        </button>
        {isAdmin && (
          <button
            className={`plans-tab ${tab === "sent" ? "active" : ""}`}
            onClick={() => setTab("sent")}
          >
            <FiCalendar /> Poslate sesije ({sentSessions.length})
          </button>
        )}
      </div>

      {tab === "plans" && (
        <div className="plans-grid">
          {plans.length === 0 ? (
            <div className="empty-state">
              <FiActivity size={48} />
              <h3>Nema planova aktivnosti</h3>
              <p>Kreiraj prvi strukturirani plan trčanja.</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="plan-card"
                style={{ borderTopColor: plan.color || "#3b82f6" }}
              >
                <div className="plan-card-header">
                  <div
                    className="plan-card-color"
                    style={{ background: plan.color || "#3b82f6" }}
                  />
                  <div className="plan-card-title">
                    <h3>{plan.name}</h3>
                    {plan.description && <p>{plan.description}</p>}
                  </div>
                </div>
                <div className="plan-card-meta plan-card-meta-grid">
                  <span>{plan.activity_type_name}</span>
                  <span>{plan.segment_count || 0} segmenata</span>
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
                    onClick={() => navigate(`/activity-plans/${plan.id}/edit`)}
                    title="Izmeni"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() =>
                      navigate(`/activity-plans/new?copyFrom=${plan.id}`)
                    }
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
                          onChange={(event) =>
                            setScheduleUserId(event.target.value)
                          }
                          className="form-control"
                        >
                          <option value="">— Izaberi korisnika —</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.nickname ||
                                `${user.first_name} ${user.last_name || ""}`.trim()}
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
                        onChange={(event) =>
                          setScheduleDate(event.target.value)
                        }
                        className="form-control"
                      />
                    </div>
                    <div className="plan-schedule-inline">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={handleSchedule}
                      >
                        Zakaži
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setScheduleId(null)}
                      >
                        Otkaži
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="sessions-list">
          {sessionsTabItems.map((session) => renderSessionCard(session))}
        </div>
      )}
      {isAdmin && tab === "sent" && (
        <div className="sessions-list">
          {sentSessions.map((session) => renderSessionCard(session, true))}
        </div>
      )}

      <ActivityPlanDetailModal
        isOpen={Boolean(detailPlanId)}
        onClose={() => setDetailPlanId(null)}
        planId={detailPlanId}
      />
    </div>
  );
}

export default ActivityPlansPage;
