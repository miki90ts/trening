import React from "react";

function NutritionFilters({
  filters,
  onChange,
  onApply,
  onReset,
  metric,
  onMetricChange,
}) {
  return (
    <div className="card nutrition-filters">
      <div className="form-row">
        <div className="form-group">
          <label>Od datuma</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) =>
              onChange({ ...filters, start_date: e.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label>Do datuma</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => onChange({ ...filters, end_date: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Obrok</label>
          <select
            value={filters.meal_type}
            onChange={(e) =>
              onChange({ ...filters, meal_type: e.target.value })
            }
          >
            <option value="">Svi obroci</option>
            <option value="breakfast">Doručak</option>
            <option value="lunch">Ručak</option>
            <option value="dinner">Večera</option>
            <option value="snack">Užina</option>
          </select>
        </div>
        <div className="form-group">
          <label>Pretraga hrane</label>
          <input
            type="text"
            value={filters.food_query}
            placeholder="npr. banana, sendvič..."
            onChange={(e) =>
              onChange({ ...filters, food_query: e.target.value })
            }
          />
        </div>
      </div>

      <div className="form-group">
        <label>Metrika za graf</label>
        <select value={metric} onChange={(e) => onMetricChange(e.target.value)}>
          <option value="kcal">Kalorije</option>
          <option value="protein">Proteini</option>
          <option value="carbs">Ugljeni hidrati</option>
          <option value="fat">Masti</option>
        </select>
      </div>

      <div className="card-actions">
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="btn btn-primary" onClick={onApply}>
          Primeni filtere
        </button>
      </div>
    </div>
  );
}

export default NutritionFilters;
