const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const plansController = require("../controllers/plans");

// ================================================
// PLAN TEMPLATES CRUD
// ================================================

router.get("/", authenticate, plansController.getPlans);
router.get("/:id", authenticate, plansController.getPlanById);
router.post("/", authenticate, plansController.createPlan);
router.put("/:id", authenticate, plansController.updatePlan);
router.delete("/:id", authenticate, plansController.deletePlan);

// ================================================
// SESSIONS (izvršenje plana)
// ================================================

router.post("/:id/schedule", authenticate, plansController.schedulePlan);
router.get("/sessions/list", authenticate, plansController.getSessionsList);
router.get(
  "/sessions/:sessionId",
  authenticate,
  plansController.getSessionById,
);
router.put(
  "/sessions/:sessionId/start",
  authenticate,
  plansController.startSession,
);
router.put("/sessions/:sessionId", authenticate, plansController.updateSession);
router.post(
  "/sessions/:sessionId/complete",
  authenticate,
  plansController.completeSession,
);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  plansController.deleteSession,
);

module.exports = router;
