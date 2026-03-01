const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const categoriesController = require("../controllers/categories");

router.get("/", categoriesController.getCategories);
router.get("/:id", categoriesController.getCategoryById);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  categoriesController.createCategory,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  categoriesController.updateCategory,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  categoriesController.deleteCategory,
);

module.exports = router;
