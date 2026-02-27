const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const mealPlansController = require("../controllers/mealPlans");

// ================================================
// PLAN TEMPLATES CRUD
// ================================================

router.get("/", authenticate, mealPlansController.getPlans);
router.get("/:id", authenticate, mealPlansController.getPlanById);
router.post("/", authenticate, mealPlansController.createPlan);
router.put("/:id", authenticate, mealPlansController.updatePlan);
router.delete("/:id", authenticate, mealPlansController.deletePlan);

// ================================================
// SESSIONS (zakazivanje i praćenje)
// ================================================

router.post("/:id/schedule", authenticate, mealPlansController.schedulePlan);
router.get("/sessions/list", authenticate, mealPlansController.getSessionsList);
router.get(
  "/sessions/:sessionId",
  authenticate,
  mealPlansController.getSessionById,
);
router.put(
  "/sessions/:sessionId/start",
  authenticate,
  mealPlansController.startSession,
);
router.put(
  "/sessions/:sessionId",
  authenticate,
  mealPlansController.updateSession,
);
router.post(
  "/sessions/:sessionId/complete",
  authenticate,
  mealPlansController.completeSession,
);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  mealPlansController.deleteSession,
);

module.exports = router;
