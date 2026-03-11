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
  } = useCalendar();

  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    loadMonth(currentMonth);
  }, []);

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
          />
          {!selectedDate && (
            <div className="calendar-sidebar-empty">
              <p>👈 Izaberi dan u kalendaru da vidiš detalje</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
