const usersService = require("../services/users");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getUsers(req, res, next) {
  try {
    const result = await usersService.getUsers(req.user, req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getUserById(req, res, next) {
  try {
    const result = await usersService.getUserById(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createUser(req, res, next) {
  try {
    const result = await usersService.createUser(req.user, req.body, req.file);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateUser(req, res, next) {
  try {
    const result = await usersService.updateUser(
      req.params.id,
      req.user,
      req.body,
      req.file,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await usersService.deleteUser(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getUserRecords(req, res, next) {
  try {
    const result = await usersService.getUserRecords(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserRecords,
};
