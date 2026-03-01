const sleepService = require("../services/sleep");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getEntries(req, res, next) {
  try {
    const result = await sleepService.getEntries(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createEntry(req, res, next) {
  try {
    const result = await sleepService.createEntry(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateEntry(req, res, next) {
  try {
    const result = await sleepService.updateEntry(
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
    const result = await sleepService.deleteEntry(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPeriodStats(req, res, next) {
  try {
    const result = await sleepService.getPeriodStats(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSummary(req, res, next) {
  try {
    const result = await sleepService.getSummary(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getRecords(req, res, next) {
  try {
    const result = await sleepService.getRecords(req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getStreak(req, res, next) {
  try {
    const result = await sleepService.getStreak(req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getGoal(req, res, next) {
  try {
    const result = await sleepService.getGoal(req.user);
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
  getStreak,
  getGoal,
};
