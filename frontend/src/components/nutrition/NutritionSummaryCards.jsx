import React from "react";
import Card from "../common/Card";

function NutritionSummaryCards({ summary }) {
  const totals = summary?.totals || {};
  const today = summary?.today || {};
  const avg7 = summary?.avg7 || {};

  return (
    <div className="nutrition-summary-grid">
      <Card className="nutrition-summary-card">
        <h4>Ukupno kalorija</h4>
        <p>{Math.round(parseFloat(totals.total_kcal || 0))} kcal</p>
        <small>Ukupno dana sa unosom: {totals.logged_days || 0}</small>
      </Card>
      <Card className="nutrition-summary-card">
        <h4>Danas</h4>
        <p>{Math.round(parseFloat(today.total_kcal || 0))} kcal</p>
        <small>
          P {Math.round(parseFloat(today.total_protein || 0))}g / UH{" "}
          {Math.round(parseFloat(today.total_carbs || 0))}g / M{" "}
          {Math.round(parseFloat(today.total_fat || 0))}g
        </small>
      </Card>
      <Card className="nutrition-summary-card">
        <h4>Prosek 7 dana</h4>
        <p>{Math.round(parseFloat(avg7.avg_kcal || 0))} kcal</p>
        <small>
          P {Math.round(parseFloat(avg7.avg_protein || 0))}g / UH{" "}
          {Math.round(parseFloat(avg7.avg_carbs || 0))}g / M{" "}
          {Math.round(parseFloat(avg7.avg_fat || 0))}g
        </small>
      </Card>
    </div>
  );
}

export default NutritionSummaryCards;
