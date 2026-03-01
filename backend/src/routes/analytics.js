const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const analyticsController = require("../controllers/analytics");

router.get("/progress", authenticate, analyticsController.getProgress);
router.get("/period-stats", authenticate, analyticsController.getPeriodStats);
router.get("/weekly", authenticate, analyticsController.getWeekly);
router.get("/monthly", authenticate, analyticsController.getMonthly);
router.get("/streak", authenticate, analyticsController.getStreak);
router.get(
  "/personal-records",
  authenticate,
  analyticsController.getPersonalRecords,
);
router.get("/summary", authenticate, analyticsController.getSummary);

module.exports = router;
