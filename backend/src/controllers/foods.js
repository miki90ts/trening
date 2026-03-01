const foodsService = require("../services/foods");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getFoods(req, res, next) {
  try {
    const result = await foodsService.getFoods(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getFoodById(req, res, next) {
  try {
    const result = await foodsService.getFoodById(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createFood(req, res, next) {
  try {
    const result = await foodsService.createFood(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateFood(req, res, next) {
  try {
    const result = await foodsService.updateFood(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteFood(req, res, next) {
  try {
    const result = await foodsService.deleteFood(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood,
};
