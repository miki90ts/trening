const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const nutritionAnalyticsController = require("../controllers/nutritionAnalytics");

router.get(
  "/period-stats",
  authenticate,
  nutritionAnalyticsController.getPeriodStats,
);
router.get("/summary", authenticate, nutritionAnalyticsController.getSummary);
router.get(
  "/top-foods",
  authenticate,
  nutritionAnalyticsController.getTopFoods,
);

module.exports = router;
