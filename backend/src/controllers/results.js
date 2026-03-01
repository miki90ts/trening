const resultsService = require("../services/results");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getResults(req, res, next) {
  try {
    const result = await resultsService.getResults(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getResultById(req, res, next) {
  try {
    const result = await resultsService.getResultById(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createResult(req, res, next) {
  try {
    const result = await resultsService.createResult(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateResult(req, res, next) {
  try {
    const result = await resultsService.updateResult(
      req.params.id,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteResult(req, res, next) {
  try {
    const result = await resultsService.deleteResult(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult,
};
