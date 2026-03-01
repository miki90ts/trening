import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../../services/api";
import Card from "../common/Card";

function DailyTasksWidget() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getDailyTasks()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="daily-tasks-widget">
        <h3 className="daily-tasks-title">📋 Današnji zadaci</h3>
        <p className="daily-tasks-loading">Učitavanje...</p>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="daily-tasks-widget">
        <h3 className="daily-tasks-title">📋 Današnji zadaci</h3>
        <p className="daily-tasks-empty">
          Nema aktivnih podsetnika. Uključi obaveštenja u{" "}
          <span
            className="daily-tasks-link"
            onClick={() => navigate("/profile")}
            role="button"
            tabIndex={0}
          >
            podešavanjima profila
          </span>
          .
        </p>
      </Card>
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progress =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Card className="daily-tasks-widget">
      <div className="daily-tasks-header">
        <h3 className="daily-tasks-title">📋 Današnji zadaci</h3>
        <span className="daily-tasks-count">
          {doneCount}/{totalCount}
        </span>
      </div>

      <div className="daily-tasks-progress-bar">
        <div
          className="daily-tasks-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="daily-tasks-list">
        {tasks.map((task, idx) => (
          <div
            key={`${task.category}-${idx}`}
            className={`daily-task-item ${task.done ? "daily-task-item--done" : ""}`}
            onClick={() => navigate(task.link)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(task.link)}
          >
            <span className="daily-task-check">{task.done ? "✅" : "⬜"}</span>
            <span className="daily-task-icon">{task.icon}</span>
            <span className="daily-task-label">{task.label}</span>
            <span className="daily-task-detail">{task.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default DailyTasksWidget;
