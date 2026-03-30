import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import MedicalEventForm from "../components/medicalEvents/MedicalEventForm";
import {
  createMedicalEvent,
  deleteMedicalEvent,
  getMedicalEvents,
  updateMedicalEvent,
} from "../services/api";
import {
  formatMedicalEventDateRange,
  getMedicalEventDurationDays,
  getMedicalEventMeta,
} from "../components/medicalEvents/medicalEventUtils";

function getInitialFilters(searchParams) {
  const date = searchParams.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      event_type: "",
      start_date: date,
      end_date: date,
    };
  }

  return {
    event_type: "",
    start_date: "",
    end_date: "",
  };
}

function MedicalEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(
    () => getInitialFilters(searchParams),
    [searchParams],
  );
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const loadEvents = async (filters = appliedFilters) => {
    setLoading(true);
    try {
      const params = {
        limit: 500,
      };
      if (filters.event_type) params.event_type = filters.event_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const data = await getMedicalEvents(params);
      setEvents(data);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId || modalOpen) return;

    const matchingEvent = events.find((event) => String(event.id) === eventId);
    if (matchingEvent) {
      setEditingEvent(matchingEvent);
      setModalOpen(true);
    }
  }, [events, modalOpen, searchParams]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);

    if (searchParams.get("eventId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("eventId");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (eventItem) => {
    setEditingEvent(eventItem);
    setModalOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      event_type: "",
      start_date: "",
      end_date: "",
    };
    setDraftFilters(resetFilters);
    setAppliedFilters(resetFilters);

    if (searchParams.get("date")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("date");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingEvent) {
        await updateMedicalEvent(editingEvent.id, payload);
        toast.success("Medicinski događaj je uspešno izmenjen.");
      } else {
        await createMedicalEvent(payload);
        toast.success("Medicinski događaj je uspešno dodat.");
      }

      closeModal();
      await loadEvents(appliedFilters);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventItem) => {
    if (
      !window.confirm("Da li ste sigurni da želite da obrišete ovaj događaj?")
    ) {
      return;
    }

    try {
      await deleteMedicalEvent(eventItem.id);
      toast.success("Medicinski događaj je obrisan.");
      await loadEvents(appliedFilters);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="page medical-events-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏥 Zdravstveni događaji</h1>
          <p className="page-subtitle">
            Evidentiraj bolest, povredu ili operaciju i poveži ih sa kalendarom.
          </p>
        </div>

        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            + Novi događaj
          </button>
        </div>
      </div>

      <Card className="medical-events-filters-card">
        <div className="medical-events-filter-grid">
          <div className="form-group">
            <label className="form-label">Tip događaja</label>
            <select
              className="form-control"
              value={draftFilters.event_type}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  event_type: event.target.value,
                }))
              }
            >
              <option value="">Svi tipovi</option>
              <option value="illness">🤒 Bolest</option>
              <option value="injury">🩹 Povreda</option>
              <option value="operation">🏥 Operacija</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Od datuma</label>
            <input
              type="date"
              className="form-control"
              value={draftFilters.start_date}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  start_date: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Do datuma</label>
            <input
              type="date"
              className="form-control"
              value={draftFilters.end_date}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  end_date: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyFilters}
          >
            Primeni filtere
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleResetFilters}
          >
            Resetuj
          </button>
        </div>
      </Card>

      <Card>
        <h3>Istorija događaja</h3>

        {loading ? (
          <p className="empty-state-small">Učitavanje podataka...</p>
        ) : null}

        {!loading && events.length === 0 ? (
          <p className="empty-state-small">
            Nema medicinskih događaja za izabrane filtere.
          </p>
        ) : null}

        {!loading && events.length > 0 ? (
          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Tip</th>
                  <th>Naziv</th>
                  <th>Trajanje</th>
                  <th>Beleške</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {events.map((eventItem) => {
                  const meta = getMedicalEventMeta(eventItem.event_type);
                  const durationDays = getMedicalEventDurationDays(
                    eventItem.start_date,
                    eventItem.end_date,
                  );

                  return (
                    <tr key={eventItem.id}>
                      <td>
                        {formatMedicalEventDateRange(
                          eventItem.start_date,
                          eventItem.end_date,
                        )}
                      </td>
                      <td>
                        <span
                          className={`medical-event-badge ${meta.className}`}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td>
                        <strong>{eventItem.title}</strong>
                      </td>
                      <td>
                        {durationDays} {durationDays === 1 ? "dan" : "dana"}
                      </td>
                      <td className="medical-event-note">
                        {eventItem.notes || "-"}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleOpenEdit(eventItem)}
                            title="Izmeni"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn btn-sm btn-ghost btn-danger-ghost"
                            onClick={() => handleDelete(eventItem)}
                            title="Obriši"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          editingEvent ? "Izmeni medicinski događaj" : "Novi medicinski događaj"
        }
      >
        <MedicalEventForm
          initialData={editingEvent}
          isSubmitting={saving}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

export default MedicalEventsPage;
