const pino = require('pino');
const config = require('../config/env');

const logger = pino({
  name: 'mine-safety-backend',
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
});

module.exports = logger;
