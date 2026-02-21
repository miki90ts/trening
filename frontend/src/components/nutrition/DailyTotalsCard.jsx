import React from "react";
import Card from "../common/Card";
import { round2 } from "./nutritionUtils";

function DailyTotalsCard({ totals }) {
  const data = totals || {
    total_kcal: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    total_items: 0,
  };

  return (
    <Card className="nutrition-daily-totals">
      <h3>Dnevni zbir</h3>
      <div className="nutrition-daily-grid">
        <div>
          <span>Kalorije</span>
          <strong>{round2(data.total_kcal)} kcal</strong>
        </div>
        <div>
          <span>Proteini</span>
          <strong>{round2(data.total_protein)} g</strong>
        </div>
        <div>
          <span>Ugljeni hidrati</span>
          <strong>{round2(data.total_carbs)} g</strong>
        </div>
        <div>
          <span>Masti</span>
          <strong>{round2(data.total_fat)} g</strong>
        </div>
      </div>
      <p className="nutrition-daily-items">
        Stavki uneto: {data.total_items || 0}
      </p>
    </Card>
  );
}

export default DailyTotalsCard;
