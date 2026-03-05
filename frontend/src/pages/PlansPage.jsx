import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/common/Loading";
import PlanDetailModal from "../components/plans/PlanDetailModal";
import {
  FiPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiPlay,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiClipboard,
  FiList,
  FiCopy,
  FiUser,
} from "react-icons/fi";

function PlansPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailPlanId, setDetailPlanId] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [scheduleUserId, setScheduleUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("plans"); // 'plans' | 'sessions' | 'sent'

  const getSessionType = (session) => {
    if (session?.session_type) return session.session_type;
    const currentUserId = user?.id;
    if (!currentUserId) return "other";

    const assignedUserId = parseInt(
      session?.assigned_user_id ?? session?.user_id,
      10,
    );
    const scheduledBy = parseInt(session?.scheduled_by, 10);

    if (
      Number.isInteger(scheduledBy) &&
      scheduledBy === currentUserId &&
      assignedUserId !== currentUserId
    ) {
      return "sent_to_other";
    }

    if (assignedUserId === currentUserId) {
      if (Number.isInteger(scheduledBy) && scheduledBy !== currentUserId) {
        return "sent_to_me";
      }
      return "my_plan";
    }

    return "other";
  };

  const sessionsTabItems = sessions.filter((session) => {
    const type = getSessionType(session);
    return type === "my_plan" || type === "sent_to_me";
  });

  const sentSessions = isAdmin
    ? sessions.filter((session) => getSessionType(session) === "sent_to_other")
    : [];

  const loadData = useCallback(async () => {
    try {
      const promises = [api.getPlans(), api.getSessions()];
      if (isAdmin) promises.push(api.getUsers());
      const results = await Promise.all(promises);
      setPlans(results[0]);
      setSessions(results[1]);
      if (isAdmin && results[2]) setUsers(results[2]);
    } catch (err) {
      toast.error("Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Obriši ovaj plan?")) return;
    try {
      await api.deletePlan(id);
      toast.success("Plan obrisan");
      loadData();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSchedule = async () => {
    if (!scheduleId || !scheduleDate) return;
    if (isAdmin && !scheduleUserId) {
      toast.warn("Izaberi korisnika za koga zakazuješ trening.");
      return;
    }
    try {
      const data = { scheduled_date: scheduleDate };
      if (isAdmin && scheduleUserId) {
        data.user_id = parseInt(scheduleUserId, 10);
      }
      const result = await api.schedulePlan(scheduleId, data);
      toast.success(result.message || "Trening zakazan! 📅");
      setScheduleId(null);
      setScheduleUserId("");
      loadData();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await api.startSession(sessionId);
      navigate(`/plans/session/${sessionId}`);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Otkaži ovu sesiju?")) return;
    try {
      await api.deleteSession(id);
      toast.success("Sesija otkazana");
      loadData();
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
    const s = map[status] || map.scheduled;
    return (
      <span className={`session-status-badge ${s.cls}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("sr-Latn-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="page plans-page">
      <div className="page-header">
        <h1 className="page-title">📋 Planovi treninga</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/plans/new")}
        >
          <FiPlus /> Novi plan
        </button>
      </div>

      {/* Tabs */}
      <div className="plans-tabs">
        <button
          className={`plans-tab ${tab === "plans" ? "active" : ""}`}
          onClick={() => setTab("plans")}
        >
          <FiClipboard /> Moji planovi ({plans.length})
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

      {/* PLANS TAB */}
      {tab === "plans" && (
        <div className="plans-grid">
          {plans.length === 0 ? (
            <div className="empty-state">
              <FiClipboard size={48} />
              <h3>Nema planova</h3>
              <p>Kreiraj prvi plan treninga!</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/plans/new")}
              >
                <FiPlus /> Kreiraj plan
              </button>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="plan-card"
                style={{ borderTopColor: plan.color || "#6366f1" }}
              >
                <div className="plan-card-header">
                  <div
                    className="plan-card-color"
                    style={{ background: plan.color || "#6366f1" }}
                  />
                  <div className="plan-card-title">
                    <h3>{plan.name}</h3>
                    {plan.description && <p>{plan.description}</p>}
                  </div>
                </div>
                <div className="plan-card-meta">
                  <span>{plan.exercise_count} vežbi</span>
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
                    onClick={() => navigate(`/plans/${plan.id}/edit`)}
                    title="Izmeni"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => navigate(`/plans/new?copyFrom=${plan.id}`)}
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

                {/* Schedule popover */}
                {scheduleId === plan.id && (
                  <div className="plan-schedule-popover">
                    {isAdmin && (
                      <div className="form-group">
                        <label className="form-label">
                          <FiUser size={13} /> Korisnik
                        </label>
                        <select
                          value={scheduleUserId}
                          onChange={(e) => setScheduleUserId(e.target.value)}
                          className="form-control"
                        >
                          <option value="">— Izaberi korisnika —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nickname ||
                                `${u.first_name} ${u.last_name || ""}`.trim()}
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
                        onChange={(e) => setScheduleDate(e.target.value)}
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
            ))
          )}
        </div>
      )}

      {/* SESSIONS TAB */}
      {tab === "sessions" && (
        <div className="sessions-list">
          {sessionsTabItems.length === 0 ? (
            <div className="empty-state">
              <FiCalendar size={48} />
              <h3>Nema sesija</h3>
              <p>Zakaži plan da bi kreirao sesiju.</p>
            </div>
          ) : (
            sessionsTabItems.map((s) => (
              <div key={s.id} className="session-card">
                <div className="session-card-left">
                  {getStatusBadge(s.status)}
                  <div className="session-card-info">
                    <strong>{s.plan_name}</strong>
                    <span className="session-card-date">
                      <FiCalendar size={12} /> {formatDate(s.scheduled_date)}
                    </span>
                    <span className="session-card-exercises">
                      {s.exercise_count} vežbi
                      {s.status === "in_progress" &&
                        ` · ${s.completed_exercises || 0}/${s.total_exercises} završeno`}
                    </span>
                  </div>
                </div>
                <div className="session-card-actions">
                  {s.status === "scheduled" && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleStartSession(s.id)}
                    >
                      <FiPlay /> Započni
                    </button>
                  )}
                  {s.status === "in_progress" && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/plans/session/${s.id}`)}
                    >
                      <FiPlay /> Nastavi
                    </button>
                  )}
                  {s.status === "completed" && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => navigate(`/plans/session/${s.id}/detail`)}
                    >
                      <FiEye /> Detalji
                    </button>
                  )}
                  {s.status !== "completed" && (
                    <button
                      className="btn btn-sm btn-ghost btn-danger-ghost"
                      onClick={() => handleDeleteSession(s.id)}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SENT SESSIONS TAB (ADMIN) */}
      {isAdmin && tab === "sent" && (
        <div className="sessions-list">
          {sentSessions.length === 0 ? (
            <div className="empty-state">
              <FiCalendar size={48} />
              <h3>Nema poslatih sesija</h3>
              <p>
                Ovde će se prikazati sesije koje si poslao/la drugim
                korisnicima.
              </p>
            </div>
          ) : (
            sentSessions.map((s) => {
              const assigneeName =
                s.assigned_nickname ||
                [s.assigned_first_name, s.assigned_last_name]
                  .filter(Boolean)
                  .join(" ") ||
                "Korisnik";

              return (
                <div key={s.id} className="session-card">
                  <div className="session-card-left">
                    {getStatusBadge(s.status)}
                    <div className="session-card-info">
                      <strong>{s.plan_name}</strong>
                      <span className="session-card-date">
                        <FiCalendar size={12} /> {formatDate(s.scheduled_date)}
                      </span>
                      <span className="session-card-exercises">
                        <FiUser size={12} /> {assigneeName} · {s.exercise_count}{" "}
                        vežbi
                        {s.status === "in_progress" &&
                          ` · ${s.completed_exercises || 0}/${s.total_exercises} završeno`}
                        {s.status === "completed" &&
                          ` · ${s.completed_exercises || 0}/${s.total_exercises} završeno`}
                      </span>
                    </div>
                  </div>
                  <div className="session-card-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => navigate(`/plans/session/${s.id}/detail`)}
                    >
                      <FiEye /> Pregled
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Detail modal */}
      <PlanDetailModal
        isOpen={!!detailPlanId}
        onClose={() => setDetailPlanId(null)}
        planId={detailPlanId}
      />
    </div>
  );
}

export default PlansPage;
