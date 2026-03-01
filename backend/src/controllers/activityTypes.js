const activityTypesService = require("../services/activityTypes");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getActivityTypes(req, res, next) {
  try {
    const result = await activityTypesService.getActivityTypes(
      req.user,
      req.query,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createActivityType(req, res, next) {
  try {
    const result = await activityTypesService.createActivityType(
      req.user.id,
      req.body,
    );
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateActivityType(req, res, next) {
  try {
    const result = await activityTypesService.updateActivityType(
      req.params.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteActivityType(req, res, next) {
  try {
    const result = await activityTypesService.deleteActivityType(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getActivityTypes,
  createActivityType,
  updateActivityType,
  deleteActivityType,
};
