const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const activityAnalyticsController = require("../controllers/activityAnalytics");

router.get(
  "/period-stats",
  authenticate,
  activityAnalyticsController.getPeriodStats,
);
router.get(
  "/period-export",
  authenticate,
  activityAnalyticsController.getPeriodExport,
);
router.get("/summary", authenticate, activityAnalyticsController.getSummary);

module.exports = router;
