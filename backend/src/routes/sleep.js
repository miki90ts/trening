const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const sleepController = require("../controllers/sleep");

router.get("/entries", authenticate, sleepController.getEntries);
router.post("/entries", authenticate, sleepController.createEntry);
router.put("/entries/:id", authenticate, sleepController.updateEntry);
router.delete("/entries/:id", authenticate, sleepController.deleteEntry);
router.get("/period-stats", authenticate, sleepController.getPeriodStats);
router.get("/summary", authenticate, sleepController.getSummary);
router.get("/records", authenticate, sleepController.getRecords);
router.get("/streak", authenticate, sleepController.getStreak);
router.get("/goal", authenticate, sleepController.getGoal);

module.exports = router;
