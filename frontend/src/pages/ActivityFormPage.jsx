import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiTrash2 } from "react-icons/fi";
import Card from "../components/common/Card";
import { useActivity } from "../context/ActivityContext";
import {
  buildActivityPayload,
  emptySplit,
  formatPace,
  initialActivityForm,
  mapDetailSplits,
  mapDetailToForm,
} from "../components/activity/activityUtils";

const toDurationParts = (secondsValue) => {
  const total = Number.parseInt(secondsValue, 10);
  if (!Number.isFinite(total) || total <= 0) {
    return { hours: "", minutes: "", seconds: "" };
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return {
    hours: String(hours),
    minutes: String(minutes),
    seconds: String(seconds),
  };
};

const toDistanceParts = (metersValue) => {
  const total = Number.parseInt(metersValue, 10);
  if (!Number.isFinite(total) || total <= 0) {
    return { kilometers: "", meters: "" };
  }

  const kilometers = Math.floor(total / 1000);
  const meters = total % 1000;

  return {
    kilometers: String(kilometers),
    meters: String(meters),
  };
};

const toSplitDurationParts = (secondsValue) => {
  const total = Number.parseInt(secondsValue, 10);
  if (!Number.isFinite(total) || total <= 0) {
    return { hours: "", minutes: "", seconds: "" };
  }

  return {
    hours: String(Math.floor(total / 3600)),
    minutes: String(Math.floor((total % 3600) / 60)),
    seconds: String(total % 60),
  };
};

const toSplitDistanceParts = (metersValue) => {
  const total = Number.parseInt(metersValue, 10);
  if (!Number.isFinite(total) || total <= 0) {
    return { kilometers: "", meters: "" };
  }

  return {
    kilometers: String(Math.floor(total / 1000)),
    meters: String(total % 1000),
  };
};

function ActivityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const {
    activityTypes,
    loadingTypes,
    loadActivityTypes,
    loadActivityDetail,
    addActivity,
    editActivity,
  } = useActivity();

  const [formData, setFormData] = useState(initialActivityForm);
  const [durationParts, setDurationParts] = useState({
    hours: "",
    minutes: "",
    seconds: "",
  });
  const [distanceParts, setDistanceParts] = useState({
    kilometers: "",
    meters: "",
  });
  const [splits, setSplits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadActivityTypes();
        if (isEdit) {
          const detail = await loadActivityDetail(id);
          const mappedForm = mapDetailToForm(detail);
          setFormData(mappedForm);
          setDurationParts(toDurationParts(mappedForm.duration_seconds));
          setDistanceParts(toDistanceParts(mappedForm.distance_meters));
          setSplits(mapDetailSplits(detail));
        }
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
        navigate("/activity");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [id]);

  const computedFormPace = useMemo(() => {
    const distance = parseInt(formData.distance_meters, 10);
    const duration = parseInt(formData.duration_seconds, 10);
    if (
      !Number.isFinite(distance) ||
      distance <= 0 ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return "-";
    }
    return formatPace((duration * 1000) / distance);
  }, [formData.distance_meters, formData.duration_seconds]);

  const addSplitRow = () => {
    setSplits((prev) => [...prev, { ...emptySplit }]);
  };

  const updateSplitRow = (index, key, value) => {
    setSplits((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  };

  const removeSplitRow = (index) => {
    setSplits((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSplitDistancePartChange = (index, key, rawValue) => {
    const normalized =
      rawValue === ""
        ? ""
        : String(Math.max(0, Number.parseInt(rawValue, 10) || 0));

    setSplits((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const parts = toSplitDistanceParts(row.distance_meters);
        const nextParts = { ...parts, [key]: normalized };

        const kilometers =
          Number.parseInt(nextParts.kilometers || "0", 10) || 0;
        const metersRaw = Number.parseInt(nextParts.meters || "0", 10) || 0;
        const meters = Math.min(999, Math.max(0, metersRaw));

        const totalMeters = kilometers * 1000 + meters;
        return {
          ...row,
          distance_meters: totalMeters > 0 ? String(totalMeters) : "",
        };
      }),
    );
  };

  const handleSplitDurationPartChange = (index, key, rawValue) => {
    const normalized =
      rawValue === ""
        ? ""
        : String(Math.max(0, Number.parseInt(rawValue, 10) || 0));

    setSplits((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const parts = toSplitDurationParts(row.duration_seconds);
        const nextParts = { ...parts, [key]: normalized };

        const hours = Number.parseInt(nextParts.hours || "0", 10) || 0;
        const minutesRaw = Number.parseInt(nextParts.minutes || "0", 10) || 0;
        const secondsRaw = Number.parseInt(nextParts.seconds || "0", 10) || 0;

        const minutes = Math.min(59, Math.max(0, minutesRaw));
        const seconds = Math.min(59, Math.max(0, secondsRaw));
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        return {
          ...row,
          duration_seconds: totalSeconds > 0 ? String(totalSeconds) : "",
        };
      }),
    );
  };

  const handleDurationPartChange = (key, rawValue) => {
    const normalized =
      rawValue === ""
        ? ""
        : String(Math.max(0, Number.parseInt(rawValue, 10) || 0));

    setDurationParts((prev) => {
      const next = { ...prev, [key]: normalized };

      const hours = Number.parseInt(next.hours || "0", 10) || 0;
      const minutesRaw = Number.parseInt(next.minutes || "0", 10) || 0;
      const secondsRaw = Number.parseInt(next.seconds || "0", 10) || 0;

      const minutes = Math.min(59, Math.max(0, minutesRaw));
      const seconds = Math.min(59, Math.max(0, secondsRaw));

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      setFormData((prevForm) => ({
        ...prevForm,
        duration_seconds: totalSeconds > 0 ? String(totalSeconds) : "",
      }));

      return {
        ...next,
        minutes: next.minutes === "" ? "" : String(minutes),
        seconds: next.seconds === "" ? "" : String(seconds),
      };
    });
  };

  const handleDistancePartChange = (key, rawValue) => {
    const normalized =
      rawValue === ""
        ? ""
        : String(Math.max(0, Number.parseInt(rawValue, 10) || 0));

    setDistanceParts((prev) => {
      const next = { ...prev, [key]: normalized };

      const kilometers = Number.parseInt(next.kilometers || "0", 10) || 0;
      const metersRaw = Number.parseInt(next.meters || "0", 10) || 0;
      const meters = Math.min(999, Math.max(0, metersRaw));

      const totalMeters = kilometers * 1000 + meters;

      setFormData((prevForm) => ({
        ...prevForm,
        distance_meters: totalMeters > 0 ? String(totalMeters) : "",
      }));

      return {
        ...next,
        meters: next.meters === "" ? "" : String(meters),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const totalDistance = Number.parseInt(formData.distance_meters, 10);
      const totalDuration = Number.parseInt(formData.duration_seconds, 10);

      if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
        toast.error("Unesi validnu distancu (km i/ili m). ");
        return;
      }

      if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        toast.error("Unesi validno vreme (h/min/sec). ");
        return;
      }

      const payload = buildActivityPayload(formData, splits);
      if (isEdit) {
        await editActivity(id, payload);
        toast.success("Activity je uspešno izmenjen.");
      } else {
        await addActivity(payload);
        toast.success("Activity je uspešno dodat.");
      }
      navigate("/activity");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p className="empty-state-small">Učitavanje aktivnosti...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? "✏️ Izmeni activity" : "➕ Dodaj activity"}
          </h1>
          <p className="page-subtitle">
            Unos osnovnih i naprednih metrika aktivnosti sa splitovima.
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="form-grid two-cols">
            <div className="form-group">
              <label>Naziv *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Tip aktivnosti *</label>
              <select
                value={formData.activity_type_id}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    activity_type_id: event.target.value,
                  }))
                }
                required
                disabled={loadingTypes}
              >
                <option value="">Izaberi tip</option>
                {activityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Datum i vreme *</label>
              <input
                type="datetime-local"
                value={formData.performed_at}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    performed_at: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div
              className="activity-main-metrics"
              style={{ gridColumn: "1 / -1" }}
            >
              <div className="form-group activity-main-metric-card">
                <label>Distanca *</label>
                <div className="activity-composite-row activity-composite-row-two">
                  <div className="form-group">
                    <label>km</label>
                    <input
                      type="number"
                      min="0"
                      value={distanceParts.kilometers}
                      onChange={(event) =>
                        handleDistancePartChange(
                          "kilometers",
                          event.target.value,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>m</label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={distanceParts.meters}
                      onChange={(event) =>
                        handleDistancePartChange("meters", event.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group activity-main-metric-card">
                <label>Vreme *</label>
                <div className="activity-composite-row activity-composite-row-three">
                  <div className="form-group">
                    <label>h</label>
                    <input
                      type="number"
                      min="0"
                      value={durationParts.hours}
                      onChange={(event) =>
                        handleDurationPartChange("hours", event.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>min</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationParts.minutes}
                      onChange={(event) =>
                        handleDurationPartChange("minutes", event.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>sec</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationParts.seconds}
                      onChange={(event) =>
                        handleDurationPartChange("seconds", event.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div
                className="form-group activity-main-metric-card"
                style={{ alignSelf: "end" }}
              >
                <label>Avg pace (auto)</label>
                <input type="text" value={computedFormPace} readOnly />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Opis</label>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Avg HR</label>
              <input
                type="number"
                min="0"
                value={formData.avg_heart_rate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    avg_heart_rate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Min HR</label>
              <input
                type="number"
                min="0"
                value={formData.min_heart_rate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_heart_rate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Max HR</label>
              <input
                type="number"
                min="0"
                value={formData.max_heart_rate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_heart_rate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Ascent (m)</label>
              <input
                type="number"
                min="0"
                value={formData.ascent_meters}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    ascent_meters: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Descent (m)</label>
              <input
                type="number"
                min="0"
                value={formData.descent_meters}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    descent_meters: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Min elevacija (m)</label>
              <input
                type="number"
                min="0"
                value={formData.min_elevation_meters}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_elevation_meters: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Max elevacija (m)</label>
              <input
                type="number"
                min="0"
                value={formData.max_elevation_meters}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_elevation_meters: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Kalorije</label>
              <input
                type="number"
                min="0"
                value={formData.calories}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    calories: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Kadenca avg</label>
              <input
                type="number"
                min="0"
                value={formData.running_cadence_avg}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    running_cadence_avg: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Kadenca min</label>
              <input
                type="number"
                min="0"
                value={formData.running_cadence_min}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    running_cadence_min: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Kadenca max</label>
              <input
                type="number"
                min="0"
                value={formData.running_cadence_max}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    running_cadence_max: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Avg speed km/h</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.avg_speed_kmh}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    avg_speed_kmh: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Max speed km/h</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.max_speed_kmh}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_speed_kmh: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Moving time (sek)</label>
              <input
                type="number"
                min="0"
                value={formData.moving_time_seconds}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    moving_time_seconds: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div className="section-header" style={{ marginBottom: "0.75rem" }}>
              <h3>Splitovi</h3>
              <button
                type="button"
                className="btn btn-outline"
                onClick={addSplitRow}
              >
                + Dodaj split
              </button>
            </div>
            {splits.length === 0 ? (
              <p className="empty-state-small">Nema splitova.</p>
            ) : (
              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Label</th>
                      <th>Distanca</th>
                      <th>Vreme</th>
                      <th>Avg pace</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((split, index) => {
                      const splitDistanceParts = toSplitDistanceParts(
                        split.distance_meters,
                      );
                      const splitDurationParts = toSplitDurationParts(
                        split.duration_seconds,
                      );

                      const pace =
                        split.distance_meters && split.duration_seconds
                          ? formatPace(
                              (Number(split.duration_seconds) * 1000) /
                                Number(split.distance_meters),
                            )
                          : "-";

                      return (
                        <tr key={`split-${index + 1}`}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="form-group split-inline-group">
                              <label>Naziv</label>
                              <input
                                type="text"
                                value={split.label}
                                onChange={(event) =>
                                  updateSplitRow(
                                    index,
                                    "label",
                                    event.target.value,
                                  )
                                }
                                placeholder="npr. Warm up, Run, Cool down..."
                              />
                            </div>
                          </td>
                          <td>
                            <div className="split-multi-inputs split-multi-inputs-two">
                              <div className="form-group split-inline-group">
                                <label>km</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={splitDistanceParts.kilometers}
                                  onChange={(event) =>
                                    handleSplitDistancePartChange(
                                      index,
                                      "kilometers",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="form-group split-inline-group">
                                <label>m</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={splitDistanceParts.meters}
                                  onChange={(event) =>
                                    handleSplitDistancePartChange(
                                      index,
                                      "meters",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="split-multi-inputs split-multi-inputs-three">
                              <div className="form-group split-inline-group">
                                <label>h</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={splitDurationParts.hours}
                                  onChange={(event) =>
                                    handleSplitDurationPartChange(
                                      index,
                                      "hours",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="form-group split-inline-group">
                                <label>min</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={splitDurationParts.minutes}
                                  onChange={(event) =>
                                    handleSplitDurationPartChange(
                                      index,
                                      "minutes",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="form-group split-inline-group">
                                <label>sec</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={splitDurationParts.seconds}
                                  onChange={(event) =>
                                    handleSplitDurationPartChange(
                                      index,
                                      "seconds",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </td>
                          <td>{pace}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon dt-btn dt-btn-delete"
                              onClick={() => removeSplitRow(index)}
                              title="Obriši split"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="metrics-form-actions" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate("/activity")}
            >
              Nazad
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? "Čuvanje..."
                : isEdit
                  ? "Sačuvaj izmene"
                  : "Sačuvaj activity"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ActivityFormPage;
