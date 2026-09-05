const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');
const logger = require('./utils/logger');
const healthRoutes = require('./routes/health');
const vehicleRoutes = require('./routes/vehicle.routes');
const { notFoundHandler, errorHandler } = require('./utils/httpHandlers');
const { attachWebSocket } = require('./websocket/websocket.server');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);

attachWebSocket(httpServer);

httpServer.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'HTTP server started');
});
