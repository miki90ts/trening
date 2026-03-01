const activityAnalyticsService = require("../services/activityAnalytics");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getPeriodStats(req, res, next) {
  try {
    const result = await activityAnalyticsService.getPeriodStats(
      req.user.id,
      req.query,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPeriodExport(req, res, next) {
  try {
    const result = await activityAnalyticsService.getPeriodExport(
      req.user.id,
      req.query,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSummary(req, res, next) {
  try {
    const result = await activityAnalyticsService.getSummary(req.user.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getPeriodStats,
  getPeriodExport,
  getSummary,
};
