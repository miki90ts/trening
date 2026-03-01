const express = require("express");
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require("../middleware/auth");
const usersController = require("../controllers/users");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../../uploads/users")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", optionalAuth, usersController.getUsers);
router.get("/:id", optionalAuth, usersController.getUserById);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.single("profile_image"),
  usersController.createUser,
);
router.put(
  "/:id",
  authenticate,
  upload.single("profile_image"),
  usersController.updateUser,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  usersController.deleteUser,
);
router.get("/:id/records", usersController.getUserRecords);

module.exports = router;
