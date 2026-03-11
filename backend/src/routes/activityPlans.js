const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const activityPlansController = require("../controllers/activityPlans");

router.get("/", authenticate, activityPlansController.getPlans);
router.get(
  "/sessions/list",
  authenticate,
  activityPlansController.getSessionsList,
);
router.get(
  "/sessions/:sessionId",
  authenticate,
  activityPlansController.getSessionById,
);
router.put(
  "/sessions/:sessionId/start",
  authenticate,
  activityPlansController.startSession,
);
router.put(
  "/sessions/:sessionId",
  authenticate,
  activityPlansController.updateSession,
);
router.post(
  "/sessions/:sessionId/complete",
  authenticate,
  activityPlansController.completeSession,
);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  activityPlansController.deleteSession,
);
router.get("/:id", authenticate, activityPlansController.getPlanById);
router.post("/", authenticate, activityPlansController.createPlan);
router.put("/:id", authenticate, activityPlansController.updatePlan);
router.delete("/:id", authenticate, activityPlansController.deletePlan);
router.post(
  "/:id/schedule",
  authenticate,
  activityPlansController.schedulePlan,
);

module.exports = router;
