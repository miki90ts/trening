const medicalEventsService = require("../services/medicalEvents");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getEvents(req, res, next) {
  try {
    const result = await medicalEventsService.getEvents(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createEvent(req, res, next) {
  try {
    const result = await medicalEventsService.createEvent(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateEvent(req, res, next) {
  try {
    const result = await medicalEventsService.updateEvent(
      req.params.id,
      req.user,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const result = await medicalEventsService.deleteEvent(
      req.params.id,
      req.user,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
