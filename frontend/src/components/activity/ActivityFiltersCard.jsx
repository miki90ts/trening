import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import Card from "../common/Card";

function ActivityFiltersCard({
  filters,
  activityTypes,
  loadingTypes,
  onFilterChange,
  onPageSizeChange,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Card>
      <div className="section-header-row">
        <h3>Filteri</h3>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setAdvancedOpen((prev) => !prev)}
        >
          Napredna pretraga {advancedOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      <div className="form-grid three-cols">
        <div className="form-group">
          <label>Pretraga</label>
          <input
            type="text"
            value={filters.q}
            onChange={(event) => onFilterChange("q", event.target.value)}
            placeholder="Naziv ili opis"
          />
        </div>
        <div className="form-group">
          <label>Tip aktivnosti</label>
          <select
            value={filters.activity_type_id}
            onChange={(event) =>
              onFilterChange("activity_type_id", event.target.value)
            }
            disabled={loadingTypes}
          >
            <option value="">Svi tipovi</option>
            {activityTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Sortiranje</label>
          <select
            value={filters.sort}
            onChange={(event) => onFilterChange("sort", event.target.value)}
          >
            <option value="newest">Najnovije</option>
            <option value="duration">Najduže vreme</option>
            <option value="distance">Najveća distanca</option>
            <option value="pace">Najbrži pace</option>
          </select>
        </div>
      </div>

      {advancedOpen && (
        <div className="form-grid three-cols">
          <div className="form-group">
            <label>Od datuma</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(event) =>
                onFilterChange("start_date", event.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Do datuma</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(event) =>
                onFilterChange("end_date", event.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Po strani</label>
            <select
              value={filters.pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="form-group">
            <label>Distance min (m)</label>
            <input
              type="number"
              min="0"
              value={filters.distance_min}
              onChange={(event) =>
                onFilterChange("distance_min", event.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Distance max (m)</label>
            <input
              type="number"
              min="0"
              value={filters.distance_max}
              onChange={(event) =>
                onFilterChange("distance_max", event.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Duration min (sek)</label>
            <input
              type="number"
              min="0"
              value={filters.duration_min}
              onChange={(event) =>
                onFilterChange("duration_min", event.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Duration max (sek)</label>
            <input
              type="number"
              min="0"
              value={filters.duration_max}
              onChange={(event) =>
                onFilterChange("duration_max", event.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Pace min (sec/km)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.pace_min}
              onChange={(event) =>
                onFilterChange("pace_min", event.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Pace max (sec/km)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.pace_max}
              onChange={(event) =>
                onFilterChange("pace_max", event.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Avg HR min</label>
            <input
              type="number"
              min="0"
              value={filters.hr_min}
              onChange={(event) => onFilterChange("hr_min", event.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Avg HR max</label>
            <input
              type="number"
              min="0"
              value={filters.hr_max}
              onChange={(event) => onFilterChange("hr_max", event.target.value)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export default ActivityFiltersCard;
