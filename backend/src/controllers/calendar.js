const calendarService = require("../services/calendar");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getCalendarMonth(req, res, next) {
  try {
    const result = await calendarService.getCalendarMonth(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getCalendarMonth,
};
