const { WebSocketServer, WebSocket } = require('ws');
const logger = require('../utils/logger');
const telemetryService = require('../services/telemetry.service');

const clients = new Set();

function createEvent(type, data) {
  return {
    type,
    timestamp: new Date().toISOString(),
    data: data || {},
  };
}

function sendTo(ws, type, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    ws.send(JSON.stringify(createEvent(type, data)));
  } catch (err) {
    logger.warn({ err }, 'Failed to send WebSocket message');
    removeClient(ws);
  }
}

function removeClient(ws) {
  if (!clients.has(ws)) {
    return;
  }

  clients.delete(ws);

  try {
    ws.terminate();
  } catch (err) {
    logger.debug({ err }, 'Error terminating WebSocket client');
  }
}

function broadcast(type, data) {
  const payload = JSON.stringify(createEvent(type, data));

  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) {
      removeClient(client);
      continue;
    }

    try {
      client.send(payload);
    } catch (err) {
      logger.warn({ err }, 'Failed to broadcast to WebSocket client');
      removeClient(client);
    }
  }
}

function getConnectedClientCount() {
  return clients.size;
}

function toVehicleUpdateData(state) {
  return {
    vehicleId: state.id,
    vehicleType: state.type,
    latitude: state.latitude,
    longitude: state.longitude,
    speed: state.speed,
    heading: state.heading,
    visibility: state.visibility,
  };
}

function handleVehicleTelemetry(ws, data) {
  try {
    const result = telemetryService.processTelemetry(data || {});

    if (!result.ok) {
      sendTo(ws, 'ERROR', { message: result.error || 'Unknown vehicle' });
      return;
    }

    broadcast('VEHICLE_UPDATE', toVehicleUpdateData(result.state));
  } catch (err) {
    logger.error({ err }, 'Telemetry processing failed');
    sendTo(ws, 'ERROR', { message: 'Telemetry processing failed' });
  }
}

function handleIncomingMessage(ws, raw) {
  let parsed;

  try {
    parsed = JSON.parse(raw.toString());
  } catch (err) {
    sendTo(ws, 'ERROR', { message: 'Invalid JSON message' });
    return;
  }

  if (!parsed || typeof parsed.type !== 'string') {
    sendTo(ws, 'ERROR', { message: 'Invalid JSON message' });
    return;
  }

  if (parsed.type === 'PING') {
    sendTo(ws, 'SYSTEM_STATUS', { status: 'pong' });
    return;
  }

  if (parsed.type === 'VEHICLE_TELEMETRY') {
    handleVehicleTelemetry(ws, parsed.data);
    return;
  }

  logger.debug({ type: parsed.type }, 'Ignored unknown WebSocket message type');
}

function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  wss.on('connection', (ws) => {
    clients.add(ws);

    logger.info({ clients: clients.size }, 'WebSocket client connected');

    sendTo(ws, 'SYSTEM_STATUS', {
      status: 'connected',
      service: 'mine-safety-backend',
    });

    broadcast('SYSTEM_STATUS', {
      status: 'clients',
      count: clients.size,
    });

    ws.on('message', (raw) => {
      try {
        handleIncomingMessage(ws, raw);
      } catch (err) {
        logger.error({ err }, 'Unhandled WebSocket message error');
        sendTo(ws, 'ERROR', { message: 'Message handling failed' });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info({ clients: clients.size }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket client error');
      removeClient(ws);
    });
  });

  wss.on('error', (err) => {
    logger.error({ err }, 'WebSocket server error');
  });

  logger.info({ path: '/ws' }, 'WebSocket server attached to HTTP server');

  return wss;
}

module.exports = {
  attachWebSocket,
  broadcast,
  getConnectedClientCount,
};
