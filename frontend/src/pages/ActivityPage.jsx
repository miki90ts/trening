import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import { useActivity } from "../context/ActivityContext";
import { exportActivityCsv } from "../components/activity/export/exportActivityCsv";
import ActivityResultsTable from "../components/activity/ActivityResultsTable";
import ActivityFiltersCard from "../components/activity/ActivityFiltersCard";

function ActivityPage() {
  const navigate = useNavigate();

  const {
    activities,
    pagination,
    activityTypes,
    loadingActivities,
    loadingTypes,
    loadActivityTypes,
    loadActivities,
    removeActivity,
  } = useActivity();

  const [filters, setFilters] = useState({
    q: "",
    activity_type_id: "",
    start_date: "",
    end_date: "",
    distance_min: "",
    distance_max: "",
    duration_min: "",
    duration_max: "",
    pace_min: "",
    pace_max: "",
    hr_min: "",
    hr_max: "",
    sort: "newest",
    page: 1,
    pageSize: 10,
  });

  useEffect(() => {
    const loadInitial = async () => {
      try {
        await loadActivityTypes();
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    const loadTable = async () => {
      try {
        await loadActivities(filters);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    };
    loadTable();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleDelete = async (activityId) => {
    const confirmed = window.confirm("Obrisati ovu aktivnost?");
    if (!confirmed) return;

    try {
      await removeActivity(activityId);
      toast.success("Aktivnost je obrisana.");
      await loadActivities(filters);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏃 Activity</h1>
          <p className="page-subtitle">
            Evidencija aktivnosti sa filtrima i periodnom analitikom
          </p>
        </div>
        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/activity/stats")}
          >
            Stats
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => exportActivityCsv(activities)}
          >
            Export liste (CSV)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/activity/new")}
          >
            + Dodaj activity
          </button>
        </div>
      </div>

      <ActivityFiltersCard
        filters={filters}
        activityTypes={activityTypes}
        loadingTypes={loadingTypes}
        onFilterChange={handleFilterChange}
        onPageSizeChange={(pageSize) =>
          setFilters((prev) => ({
            ...prev,
            pageSize,
            page: 1,
          }))
        }
      />

      <Card>
        <h3>Lista aktivnosti</h3>
        <ActivityResultsTable
          activities={activities}
          pagination={pagination}
          loading={loadingActivities}
          onView={(id) => navigate(`/activity/${id}`)}
          onEdit={(id) => navigate(`/activity/${id}/edit`)}
          onDelete={handleDelete}
          onPageChange={handlePageChange}
        />
      </Card>

      {loadingTypes && (
        <p className="empty-state-small">Učitavanje activity podataka...</p>
      )}
    </div>
  );
}

export default ActivityPage;
