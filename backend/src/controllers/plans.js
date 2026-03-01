const plansService = require("../services/plans");
const { sendWorkoutScheduleEmail } = require("../helpers/email");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getPlans(req, res, next) {
  try {
    const plans = await plansService.getPlans(req.user.id);
    res.json(plans);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getPlanById(req, res, next) {
  try {
    const plan = await plansService.getPlanById(req.params.id, req.user.id);
    res.json(plan);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createPlan(req, res, next) {
  try {
    const result = await plansService.createPlan(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updatePlan(req, res, next) {
  try {
    const result = await plansService.updatePlan(
      req.params.id,
      req.user.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deletePlan(req, res, next) {
  try {
    const result = await plansService.deletePlan(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function schedulePlan(req, res, next) {
  try {
    const result = await plansService.schedulePlan(
      req.params.id,
      req.user,
      req.body,
    );

    if (result.emailPayload && process.env.ENABLE_SCHEDULE_EMAIL === "true") {
      const adminName =
        `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() ||
        req.user.nickname ||
        "Admin";
      sendWorkoutScheduleEmail(
        result.emailPayload.targetUser,
        result.emailPayload.planName,
        result.emailPayload.planColor,
        result.emailPayload.scheduledDate,
        result.emailPayload.exercisesWithSets,
        adminName,
      );
    }

    res.status(201).json({ id: result.id, message: result.message });
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSessionsList(req, res, next) {
  try {
    const sessions = await plansService.getSessionsList(req.user.id, req.query);
    res.json(sessions);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSessionById(req, res, next) {
  try {
    const session = await plansService.getSessionById(
      req.params.sessionId,
      req.user.id,
    );
    res.json(session);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function startSession(req, res, next) {
  try {
    const result = await plansService.startSession(
      req.params.sessionId,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateSession(req, res, next) {
  try {
    const result = await plansService.updateSession(
      req.params.sessionId,
      req.user.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function completeSession(req, res, next) {
  try {
    const result = await plansService.completeSession(
      req.params.sessionId,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteSession(req, res, next) {
  try {
    const result = await plansService.deleteSession(
      req.params.sessionId,
      req.user.id,
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
