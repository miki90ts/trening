const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const hydrationController = require("../controllers/hydration");

router.get("/entries", authenticate, hydrationController.getEntries);
router.post("/entries", authenticate, hydrationController.createEntry);
router.put("/entries/:id", authenticate, hydrationController.updateEntry);
router.delete("/entries/:id", authenticate, hydrationController.deleteEntry);
router.get("/period-stats", authenticate, hydrationController.getPeriodStats);
router.get("/summary", authenticate, hydrationController.getSummary);
router.get("/records", authenticate, hydrationController.getRecords);
router.get("/streak", authenticate, hydrationController.getStreak);
router.get("/goal", authenticate, hydrationController.getGoal);

module.exports = router;
