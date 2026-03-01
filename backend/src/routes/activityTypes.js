const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const activityTypesController = require("../controllers/activityTypes");

router.get("/", authenticate, activityTypesController.getActivityTypes);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  activityTypesController.createActivityType,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  activityTypesController.updateActivityType,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  activityTypesController.deleteActivityType,
);

module.exports = router;
