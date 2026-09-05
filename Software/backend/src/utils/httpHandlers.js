const logger = require('./logger');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
  });
}

function errorHandler(err, req, res, next) {
  logger.error({ err }, 'Unhandled request error');

  const statusCode = Number(err.status) || Number(err.statusCode) || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message || 'Request failed',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
