const metricsService = require("../services/metrics");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getEntries(req, res, next) {
  try {
    const result = await metricsService.getEntries(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createEntry(req, res, next) {
  try {
    const result = await metricsService.createEntry(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateEntry(req, res, next) {
  try {
    const result = await metricsService.updateEntry(
      req.params.id,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteEntry(req, res, next) {
  try {
    const result = await metricsService.deleteEntry(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPeriodStats(req, res, next) {
  try {
    const result = await metricsService.getPeriodStats(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSummary(req, res, next) {
  try {
    const result = await metricsService.getSummary(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getPeriodStats,
  getSummary,
};
