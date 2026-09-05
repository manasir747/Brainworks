const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
});

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  simulatorEnabled: process.env.SIMULATOR_ENABLED === 'true',
  simulatorIntervalMs: Number(process.env.SIMULATOR_INTERVAL_MS) || 1000,
};

module.exports = config;
