const activitiesService = require("../services/activities");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getActivities(req, res, next) {
  try {
    const result = await activitiesService.getActivities(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getActivityById(req, res, next) {
  try {
    const result = await activitiesService.getActivityById(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function exportActivityData(req, res, next) {
  try {
    const result = await activitiesService.exportActivityData(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createActivity(req, res, next) {
  try {
    const result = await activitiesService.createActivity(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateActivity(req, res, next) {
  try {
    const result = await activitiesService.updateActivity(
      req.params.id,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteActivity(req, res, next) {
  try {
    const result = await activitiesService.deleteActivity(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function importActivities(req, res, next) {
  try {
    const result = await activitiesService.importActivities(
      req.user,
      req.files,
      req.body,
    );
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getActivities,
  getActivityById,
  exportActivityData,
  createActivity,
  updateActivity,
  deleteActivity,
  importActivities,
};
