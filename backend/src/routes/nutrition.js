const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const nutritionController = require("../controllers/nutrition");

router.get("/day", authenticate, nutritionController.getDay);
router.post("/entries", authenticate, nutritionController.createEntry);
router.delete("/entries/:id", authenticate, nutritionController.deleteEntry);
router.get("/history", authenticate, nutritionController.getHistory);

module.exports = router;
