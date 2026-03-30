const express = require("express");

const router = express.Router();
const { authenticate } = require("../middleware/auth");
const medicalEventsController = require("../controllers/medicalEvents");

router.get("/", authenticate, medicalEventsController.getEvents);
router.post("/", authenticate, medicalEventsController.createEvent);
router.put("/:id", authenticate, medicalEventsController.updateEvent);
router.delete("/:id", authenticate, medicalEventsController.deleteEvent);

module.exports = router;
