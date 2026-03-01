const nutritionService = require("../services/nutrition");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getDay(req, res, next) {
  try {
    const result = await nutritionService.getDay(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getHistory(req, res, next) {
  try {
    const result = await nutritionService.getHistory(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createEntry(req, res, next) {
  try {
    const result = await nutritionService.createEntry(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteEntry(req, res, next) {
  try {
    const result = await nutritionService.deleteEntry(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getDay,
  getHistory,
  createEntry,
  deleteEntry,
};
