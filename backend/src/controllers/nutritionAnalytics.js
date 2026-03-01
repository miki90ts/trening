const nutritionAnalyticsService = require("../services/nutritionAnalytics");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getPeriodStats(req, res, next) {
  try {
    const result = await nutritionAnalyticsService.getPeriodStats(
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
    const result = await nutritionAnalyticsService.getSummary(req.user.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getTopFoods(req, res, next) {
  try {
    const result = await nutritionAnalyticsService.getTopFoods(
      req.user.id,
      req.query,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getPeriodStats,
  getSummary,
  getTopFoods,
};
