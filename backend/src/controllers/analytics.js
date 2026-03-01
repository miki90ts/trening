const analyticsService = require("../services/analytics");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getProgress(req, res, next) {
  try {
    const result = await analyticsService.getProgress(req.user.id, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPeriodStats(req, res, next) {
  try {
    const result = await analyticsService.getPeriodStats(
      req.user.id,
      req.query,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getWeekly(req, res, next) {
  try {
    const result = await analyticsService.getWeekly(req.user.id, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getMonthly(req, res, next) {
  try {
    const result = await analyticsService.getMonthly(req.user.id, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getStreak(req, res, next) {
  try {
    const result = await analyticsService.getStreak(req.user.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPersonalRecords(req, res, next) {
  try {
    const result = await analyticsService.getPersonalRecords(req.user.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSummary(req, res, next) {
  try {
    const result = await analyticsService.getSummary(req.user.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getProgress,
  getPeriodStats,
  getWeekly,
  getMonthly,
  getStreak,
  getPersonalRecords,
  getSummary,
};
