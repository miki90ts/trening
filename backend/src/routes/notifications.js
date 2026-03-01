const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/notifications");

// Sve rute zahtevaju autentifikaciju
router.use(authenticate);

// Notifikacije
router.get("/", ctrl.getNotifications);
router.get("/unread-count", ctrl.getUnreadCount);
router.put("/read-all", ctrl.markAllAsRead);
router.put("/:id/read", ctrl.markAsRead);

// Daily tasks (dashboard widget)
router.get("/daily-tasks", ctrl.getDailyTasks);

// Preference
router.get("/preferences", ctrl.getPreferences);
router.put("/preferences", ctrl.updatePreferences);

module.exports = router;
