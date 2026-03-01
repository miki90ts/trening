const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const metricsController = require("../controllers/metrics");

router.get("/entries", authenticate, metricsController.getEntries);
router.post("/entries", authenticate, metricsController.createEntry);
router.put("/entries/:id", authenticate, metricsController.updateEntry);
router.delete("/entries/:id", authenticate, metricsController.deleteEntry);
router.get("/period-stats", authenticate, metricsController.getPeriodStats);
router.get("/summary", authenticate, metricsController.getSummary);

module.exports = router;
