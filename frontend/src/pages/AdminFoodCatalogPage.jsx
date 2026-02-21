import React from "react";
import FoodCatalogAdminSection from "../components/nutrition/admin/FoodCatalogAdminSection";

function AdminFoodCatalogPage() {
  return (
    <div className="page">
      <h1 className="page-title">🛡️ Admin • Katalog hrane</h1>
      <FoodCatalogAdminSection />
    </div>
  );
}

export default AdminFoodCatalogPage;
