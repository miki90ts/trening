const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const resultsController = require("../controllers/results");

router.get("/", authenticate, resultsController.getResults);
router.get("/:id", authenticate, resultsController.getResultById);
router.post("/", authenticate, resultsController.createResult);
router.put("/:id", authenticate, resultsController.updateResult);
router.delete("/:id", authenticate, resultsController.deleteResult);

module.exports = router;
