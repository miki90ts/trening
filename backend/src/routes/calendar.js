const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const calendarController = require("../controllers/calendar");

router.get("/month", authenticate, calendarController.getCalendarMonth);

module.exports = router;
