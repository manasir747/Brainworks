const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
});

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
