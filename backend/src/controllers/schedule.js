const scheduleService = require("../services/schedule");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getSchedule(req, res, next) {
  try {
    const result = await scheduleService.getSchedule(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getToday(req, res, next) {
  try {
    const result = await scheduleService.getToday(req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getScheduleById(req, res, next) {
  try {
    const result = await scheduleService.getScheduleById(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createSchedule(req, res, next) {
  try {
    const result = await scheduleService.createSchedule(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const result = await scheduleService.updateSchedule(
      req.params.id,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function completeSchedule(req, res, next) {
  try {
    const result = await scheduleService.completeSchedule(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const result = await scheduleService.deleteSchedule(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getSchedule,
  getToday,
  getScheduleById,
  createSchedule,
  updateSchedule,
  completeSchedule,
  deleteSchedule,
};
