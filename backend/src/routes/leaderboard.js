const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboard");

router.get("/", leaderboardController.getLeaderboard);
router.get(
  "/exercise/:exerciseId",
  leaderboardController.getExerciseLeaderboard,
);
router.get("/user/:userId", leaderboardController.getUserLeaderboard);
router.get("/summary", leaderboardController.getSummary);

module.exports = router;
