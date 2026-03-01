function handleControllerError(err, next, res) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  return next(err);
}

module.exports = {
  handleControllerError,
};
