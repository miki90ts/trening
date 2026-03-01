const notificationService = require("../services/notifications");
const { handleControllerError } = require("../helpers/controllerError");

async function getNotifications(req, res, next) {
  try {
    const { limit, offset, unreadOnly } = req.query;
    const items = await notificationService.getNotifications(req.user.id, {
      limit: limit ? parseInt(limit, 10) : 30,
      offset: offset ? parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === "true" || unreadOnly === "1",
    });
    res.json(items);
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await notificationService.markAsRead(
      req.user.id,
      req.params.id,
    );
    res.json(result);
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json(result);
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

async function getPreferences(req, res, next) {
  try {
    const prefs = await notificationService.getPreferences(req.user.id);
    res.json(prefs);
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const result = await notificationService.updatePreferences(
      req.user.id,
      req.body.preferences,
    );
    res.json(result);
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

async function getDailyTasks(req, res, next) {
  try {
    const tasks = await notificationService.getDailyTasks(req.user.id);
    res.json(tasks);
  } catch (err) {
    handleControllerError(err, next, res);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  getDailyTasks,
};
