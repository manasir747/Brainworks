const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');
const logger = require('./utils/logger');
const healthRoutes = require('./routes/health');
const vehicleRoutes = require('./routes/vehicle.routes');
const alertRoutes = require('./routes/alert.routes');
const zoneRoutes = require('./routes/zone.routes');
const simulatorRoutes = require('./routes/simulator.routes');
const { notFoundHandler, errorHandler } = require('./utils/httpHandlers');
const { attachWebSocket } = require('./websocket/websocket.server');
const simulator = require('./services/telemetry.simulator');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', alertRoutes);
app.use('/api', zoneRoutes);
app.use('/api', simulatorRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);

attachWebSocket(httpServer);

httpServer.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'HTTP server started');

  if (config.simulatorEnabled) {
    simulator.startSimulator();
  }
});
