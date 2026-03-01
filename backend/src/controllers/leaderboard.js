const leaderboardService = require("../services/leaderboard");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getLeaderboard(req, res, next) {
  try {
    const result = await leaderboardService.getLeaderboard(req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getExerciseLeaderboard(req, res, next) {
  try {
    const result = await leaderboardService.getExerciseLeaderboard(
      req.params.exerciseId,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getUserLeaderboard(req, res, next) {
  try {
    const result = await leaderboardService.getUserLeaderboard(
      req.params.userId,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getSummary(req, res, next) {
  try {
    const result = await leaderboardService.getSummary();
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getLeaderboard,
  getExerciseLeaderboard,
  getUserLeaderboard,
  getSummary,
};
