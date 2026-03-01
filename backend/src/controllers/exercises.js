const exercisesService = require("../services/exercises");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getExercises(req, res, next) {
  try {
    const result = await exercisesService.getExercises();
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getExerciseById(req, res, next) {
  try {
    const result = await exercisesService.getExerciseById(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createExercise(req, res, next) {
  try {
    const result = await exercisesService.createExercise(req.body, req.file);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateExercise(req, res, next) {
  try {
    const result = await exercisesService.updateExercise(
      req.params.id,
      req.body,
      req.file,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteExercise(req, res, next) {
  try {
    const result = await exercisesService.deleteExercise(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
