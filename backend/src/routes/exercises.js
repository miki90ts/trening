const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const exercisesController = require("../controllers/exercises");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../../uploads/exercises")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `exercise-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", exercisesController.getExercises);
router.get("/:id", exercisesController.getExerciseById);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.single("image"),
  exercisesController.createExercise,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  upload.single("image"),
  exercisesController.updateExercise,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  exercisesController.deleteExercise,
);

module.exports = router;
