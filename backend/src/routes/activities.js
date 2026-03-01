const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const activitiesController = require("../controllers/activities");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.get("/", authenticate, activitiesController.getActivities);
router.get("/:id", authenticate, activitiesController.getActivityById);
router.get(
  "/:id/export-data",
  authenticate,
  activitiesController.exportActivityData,
);
router.post("/", authenticate, activitiesController.createActivity);
router.put("/:id", authenticate, activitiesController.updateActivity);
router.delete("/:id", authenticate, activitiesController.deleteActivity);
router.post(
  "/import-activity",
  authenticate,
  upload.array("files", 20),
  activitiesController.importActivities,
);

module.exports = router;
