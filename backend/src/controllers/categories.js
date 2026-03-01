const categoriesService = require("../services/categories");
const {
  handleControllerError: handleError,
} = require("../helpers/controllerError");

async function getCategories(req, res, next) {
  try {
    const result = await categoriesService.getCategories(req.query);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function getCategoryById(req, res, next) {
  try {
    const result = await categoriesService.getCategoryById(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function createCategory(req, res, next) {
  try {
    const result = await categoriesService.createCategory(req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function updateCategory(req, res, next) {
  try {
    const result = await categoriesService.updateCategory(
      req.params.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const result = await categoriesService.deleteCategory(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(err, next, res);
  }
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
