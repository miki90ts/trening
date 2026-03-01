const contactService = require("../services/contact");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function sendContactMessage(req, res, next) {
  try {
    const result = await contactService.sendContactMessage(req.user, req.body);
    res.json(result);
  } catch (err) {
    if (!err.status) {
      console.error("Greška pri slanju kontakt poruke:", err);
    }
    handleError(err, next, res);
  }
}

module.exports = {
  sendContactMessage,
};
