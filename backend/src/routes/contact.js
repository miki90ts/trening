const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const contactController = require("../controllers/contact");

router.post("/", authenticate, contactController.sendContactMessage);

module.exports = router;
