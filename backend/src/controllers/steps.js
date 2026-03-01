const stepsService = require("../services/steps");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getEntries(req, res, next) {
  try {
    const result = await stepsService.getEntries(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createEntry(req, res, next) {
  try {
    const result = await stepsService.createEntry(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateEntry(req, res, next) {
  try {
    const result = await stepsService.updateEntry(
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
    const result = await stepsService.deleteEntry(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPeriodStats(req, res, next) {
  try {
    const result = await stepsService.getPeriodStats(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSummary(req, res, next) {
  try {
    const result = await stepsService.getSummary(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getRecords(req, res, next) {
  try {
    const result = await stepsService.getRecords(req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getGoal(req, res, next) {
  try {
    const result = await stepsService.getGoal(req.user);
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
  getRecords,
  getGoal,
};
