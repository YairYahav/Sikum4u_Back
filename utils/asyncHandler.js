// utils/asyncHandler.js
/**
 * Catch async errors and pass them to the Express error handler middleware.
 * @param {Function} fn - The Express middleware function (req, res, next).
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;