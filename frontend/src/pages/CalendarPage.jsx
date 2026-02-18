import React, { useEffect } from "react";
import { useCalendar } from "../context/CalendarContext";
import { useNotifications } from "../context/NotificationContext";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarGrid from "../components/calendar/CalendarGrid";
import CalendarDayDetail from "../components/calendar/CalendarDayDetail";
import Loading from "../components/common/Loading";
import { toast } from "react-toastify";

function CalendarPage() {
  const {
    currentMonth,
    calendarData,
    selectedDate,
    loading,
    loadMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    selectDate,
    addScheduledWorkout,
    editScheduledWorkout,
    removeScheduledWorkout,
    markComplete,
  } = useCalendar();

  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    loadMonth(currentMonth);
  }, []);

  const handleAddScheduled = async (data) => {
    try {
      await addScheduledWorkout(data);
      toast.success("Trening zakazan!");
      refreshNotifications();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEditScheduled = async (id, data) => {
    try {
      await editScheduledWorkout(id, data);
      toast.success("Zakazani trening ažuriran!");
      refreshNotifications();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteScheduled = async (id) => {
    try {
      await removeScheduledWorkout(id);
      toast.success("Zakazani trening obrisan!");
      refreshNotifications();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleCompleteScheduled = async (id) => {
    try {
      await markComplete(id);
      toast.success("Trening označen kao završen! 💪");
      refreshNotifications();
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page calendar-page">
      <div className="page-header">
        <h1 className="page-title">📅 Kalendar treninga</h1>
      </div>

      <div className="calendar-layout">
        <div className="calendar-main">
          <CalendarHeader
            currentMonth={currentMonth}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            onToday={goToToday}
          />
          <CalendarGrid
            currentMonth={currentMonth}
            calendarData={calendarData}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
          />
        </div>

        <div className="calendar-sidebar">
          <CalendarDayDetail
            selectedDate={selectedDate}
            calendarData={calendarData}
            onAddScheduled={handleAddScheduled}
            onEditScheduled={handleEditScheduled}
            onDeleteScheduled={handleDeleteScheduled}
            onCompleteScheduled={handleCompleteScheduled}
          />
          {!selectedDate && (
            <div className="calendar-sidebar-empty">
              <p>
                👈 Izaberi dan u kalendaru da vidiš detalje ili zakažeš trening
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
