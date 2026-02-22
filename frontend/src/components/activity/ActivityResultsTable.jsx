import React from "react";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";
import { formatDistanceKm, formatDuration, formatPace } from "./activityUtils";

function ActivityResultsTable({
  activities,
  pagination,
  loading,
  onView,
  onEdit,
  onDelete,
  onPageChange,
}) {
  if (loading) {
    return <p className="empty-state-small">Učitavanje aktivnosti...</p>;
  }

  if (activities.length === 0) {
    return <p className="empty-state">Nema aktivnosti za izabrane filtere.</p>;
  }

  return (
    <>
      <div className="results-table-wrapper">
        <table className="results-table dt-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th>Tip</th>
              <th>Datum</th>
              <th>Distanca</th>
              <th>Vreme</th>
              <th>Pace</th>
              <th>Ascent</th>
              <th>Splitovi</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, index) => (
              <tr key={activity.id}>
                <td>
                  {(pagination.page - 1) * pagination.pageSize + index + 1}
                </td>
                <td>{activity.name}</td>
                <td>{activity.activity_type_name}</td>
                <td>
                  {new Date(activity.performed_at).toLocaleString("sr-RS", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td>{formatDistanceKm(activity.distance_meters)} km</td>
                <td>{formatDuration(activity.duration_seconds)}</td>
                <td>{formatPace(activity.avg_pace_seconds_per_km)}</td>
                <td>{activity.ascent_meters ?? 0} m</td>
                <td>{activity.split_count}</td>
                <td className="dt-actions">
                  <button
                    type="button"
                    className="btn-icon dt-btn dt-btn-view"
                    onClick={() => onView(activity.id)}
                    title="Pregledaj"
                  >
                    <FiEye />
                  </button>
                  <button
                    type="button"
                    className="btn-icon dt-btn dt-btn-edit"
                    onClick={() => onEdit(activity.id)}
                    title="Izmeni"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    type="button"
                    className="btn-icon dt-btn dt-btn-delete"
                    onClick={() => onDelete(activity.id)}
                    title="Obriši"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="dt-pagination">
          <span className="dt-pagination-info">
            Strana {pagination.page} / {pagination.totalPages} (
            {pagination.total} ukupno)
          </span>
          <div className="dt-pagination-controls">
            <button
              type="button"
              className="dt-page-btn"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Prethodna
            </button>
            <button
              type="button"
              className="dt-page-btn"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Sledeća
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ActivityResultsTable;
