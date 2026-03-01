const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const scheduleController = require("../controllers/schedule");

router.get("/", authenticate, scheduleController.getSchedule);
router.get("/today", authenticate, scheduleController.getToday);
router.get("/:id", authenticate, scheduleController.getScheduleById);
router.post("/", authenticate, scheduleController.createSchedule);
router.put("/:id", authenticate, scheduleController.updateSchedule);
router.put("/:id/complete", authenticate, scheduleController.completeSchedule);
router.delete("/:id", authenticate, scheduleController.deleteSchedule);

module.exports = router;
