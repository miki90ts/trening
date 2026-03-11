const activityPlansService = require("../services/activityPlans");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getPlans(req, res, next) {
  try {
    const result = await activityPlansService.getPlans(req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPlanById(req, res, next) {
  try {
    const result = await activityPlansService.getPlanById(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createPlan(req, res, next) {
  try {
    const result = await activityPlansService.createPlan(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updatePlan(req, res, next) {
  try {
    const result = await activityPlansService.updatePlan(
      req.params.id,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deletePlan(req, res, next) {
  try {
    const result = await activityPlansService.deletePlan(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function schedulePlan(req, res, next) {
  try {
    const result = await activityPlansService.schedulePlan(
      req.params.id,
      req.user,
      req.body,
    );
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSessionsList(req, res, next) {
  try {
    const result = await activityPlansService.getSessionsList(
      req.user,
      req.query,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSessionById(req, res, next) {
  try {
    const result = await activityPlansService.getSessionById(
      req.params.sessionId,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function startSession(req, res, next) {
  try {
    const result = await activityPlansService.startSession(
      req.params.sessionId,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateSession(req, res, next) {
  try {
    const result = await activityPlansService.updateSession(
      req.params.sessionId,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function completeSession(req, res, next) {
  try {
    const result = await activityPlansService.completeSession(
      req.params.sessionId,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteSession(req, res, next) {
  try {
    const result = await activityPlansService.deleteSession(
      req.params.sessionId,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  schedulePlan,
  getSessionsList,
  getSessionById,
  startSession,
  updateSession,
  completeSession,
  deleteSession,
};
