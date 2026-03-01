const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const foodsController = require("../controllers/foods");

router.get("/", authenticate, foodsController.getFoods);
router.get("/:id", authenticate, foodsController.getFoodById);
router.post("/", authenticate, authorize("admin"), foodsController.createFood);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  foodsController.updateFood,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  foodsController.deleteFood,
);

module.exports = router;
