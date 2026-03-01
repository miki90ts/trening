const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const stepsController = require("../controllers/steps");

router.get("/entries", authenticate, stepsController.getEntries);
router.post("/entries", authenticate, stepsController.createEntry);
router.put("/entries/:id", authenticate, stepsController.updateEntry);
router.delete("/entries/:id", authenticate, stepsController.deleteEntry);
router.get("/period-stats", authenticate, stepsController.getPeriodStats);
router.get("/summary", authenticate, stepsController.getSummary);
router.get("/records", authenticate, stepsController.getRecords);
router.get("/goal", authenticate, stepsController.getGoal);

module.exports = router;
