const { WebSocketServer, WebSocket } = require('ws');
const logger = require('../utils/logger');

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

function handleIncomingMessage(ws, raw) {
  let parsed;

  try {
    parsed = JSON.parse(raw.toString());
  } catch (err) {
    sendTo(ws, 'ERROR', { message: 'Invalid JSON message' });
    return;
  }

  if (parsed && parsed.type === 'PING') {
    sendTo(ws, 'SYSTEM_STATUS', { status: 'pong' });
    return;
  }
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
      handleIncomingMessage(ws, raw);
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
