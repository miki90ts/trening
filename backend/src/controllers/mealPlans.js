const mealPlansService = require("../services/mealPlans");
const { sendMealScheduleEmail } = require("../helpers/email");

function handleError(err, next, res) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  return next(err);
}

async function getMealPlans(req, res, next) {
  try {
    const plans = await mealPlansService.getMealPlans(req.user.id);
    res.json(plans);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getMealPlanById(req, res, next) {
  try {
    const plan = await mealPlansService.getMealPlanById(
      req.params.id,
      req.user.id,
    );
    res.json(plan);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createMealPlan(req, res, next) {
  try {
    const result = await mealPlansService.createMealPlan(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateMealPlan(req, res, next) {
  try {
    const result = await mealPlansService.updateMealPlan(
      req.params.id,
      req.user.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteMealPlan(req, res, next) {
  try {
    const result = await mealPlansService.deleteMealPlan(
      req.params.id,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function scheduleMealPlan(req, res, next) {
  try {
    const result = await mealPlansService.scheduleMealPlan(
      req.params.id,
      req.user,
      req.body,
    );

    if (result.emailPayload && process.env.ENABLE_SCHEDULE_EMAIL === "true") {
      const adminName =
        `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() ||
        req.user.nickname ||
        "Admin";
      sendMealScheduleEmail(
        result.emailPayload.targetUser,
        result.emailPayload.planName,
        result.emailPayload.planColor,
        result.emailPayload.scheduledDate,
        result.emailPayload.mealsWithItems,
        adminName,
      );
    }

    res.status(201).json({ id: result.id, message: result.message });
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getMealSessionsList(req, res, next) {
  try {
    const sessions = await mealPlansService.getMealSessionsList(
      req.user.id,
      req.query,
    );
    res.json(sessions);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getMealSessionById(req, res, next) {
  try {
    const session = await mealPlansService.getMealSessionById(
      req.params.sessionId,
      req.user.id,
    );
    res.json(session);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function startMealSession(req, res, next) {
  try {
    const result = await mealPlansService.startMealSession(
      req.params.sessionId,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateMealSession(req, res, next) {
  try {
    const result = await mealPlansService.updateMealSession(
      req.params.sessionId,
      req.user.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function completeMealSession(req, res, next) {
  try {
    const result = await mealPlansService.completeMealSession(
      req.params.sessionId,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteMealSession(req, res, next) {
  try {
    const result = await mealPlansService.deleteMealSession(
      req.params.sessionId,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getPlans: getMealPlans,
  getPlanById: getMealPlanById,
  createPlan: createMealPlan,
  updatePlan: updateMealPlan,
  deletePlan: deleteMealPlan,
  schedulePlan: scheduleMealPlan,
  getSessionsList: getMealSessionsList,
  getSessionById: getMealSessionById,
  startSession: startMealSession,
  updateSession: updateMealSession,
  completeSession: completeMealSession,
  deleteSession: deleteMealSession,
  getMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  scheduleMealPlan,
  getMealSessionsList,
  getMealSessionById,
  startMealSession,
  updateMealSession,
  completeMealSession,
  deleteMealSession,
};
