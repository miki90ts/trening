import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

function CalendarHeader({ currentMonth, onPrev, onNext, onToday }) {
  const [year, monthNum] = currentMonth.split("-").map(Number);
  const monthName = MONTH_NAMES[monthNum - 1];

  return (
    <div className="calendar-header">
      <div className="calendar-nav">
        <button
          className="btn btn-icon-round"
          onClick={onPrev}
          title="Prethodni mesec"
        >
          <FiChevronLeft />
        </button>
        <h2 className="calendar-title">
          {monthName} {year}
        </h2>
        <button
          className="btn btn-icon-round"
          onClick={onNext}
          title="Sledeći mesec"
        >
          <FiChevronRight />
        </button>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={onToday}>
        Danas
      </button>
    </div>
  );
}

export default CalendarHeader;
