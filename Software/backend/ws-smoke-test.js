const { WebSocket } = require('ws');

const HTTP_URL = process.env.HTTP_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';

function waitFor(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs);

    function onMessage(raw) {
      const event = JSON.parse(raw.toString());
      if (predicate(event)) {
        cleanup();
        resolve(event);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
    }

    ws.on('message', onMessage);
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function getVehicle(id) {
  const response = await fetch(`${HTTP_URL}/api/vehicles/${id}`);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function run() {
  const clientA = await connect();
  const welcomeA = await waitFor(clientA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');
  console.log('client A connected:', welcomeA);

  clientA.send(JSON.stringify({ type: 'PING', data: {} }));
  const pong = await waitFor(clientA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'pong');
  console.log('PING response:', pong);

  clientA.send('not-json');
  const errorEvent = await waitFor(clientA, (event) => event.type === 'ERROR' && event.data.message === 'Invalid JSON message');
  console.log('invalid JSON response:', errorEvent);

  const telemetry = {
    type: 'VEHICLE_TELEMETRY',
    data: {
      vehicleId: 'TRUCK-01',
      vehicleType: 'DUMP_TRUCK',
      latitude: 18.521,
      longitude: 73.857,
      speed: 42,
      heading: 125,
      visibility: 45,
    },
  };

  clientA.send(JSON.stringify(telemetry));
  const vehicleUpdate = await waitFor(clientA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-01');
  console.log('VEHICLE_UPDATE:', vehicleUpdate);

  if (vehicleUpdate.data.speed !== 42 || vehicleUpdate.data.visibility !== 45) {
    throw new Error('VEHICLE_UPDATE did not contain the latest telemetry');
  }

  if (!vehicleUpdate.timestamp) {
    throw new Error('VEHICLE_UPDATE is missing a server timestamp');
  }

  const restAfterUpdate = await getVehicle('TRUCK-01');
  console.log('GET /api/vehicles/TRUCK-01 after telemetry:', restAfterUpdate);

  if (restAfterUpdate.status !== 200 || restAfterUpdate.body.data.speed !== 42 || restAfterUpdate.body.data.visibility !== 45) {
    throw new Error('REST API did not return the updated in-memory vehicle state');
  }

  clientA.send(JSON.stringify({
    type: 'VEHICLE_TELEMETRY',
    data: {
      vehicleId: 'UNKNOWN-999',
      vehicleType: 'DUMP_TRUCK',
      latitude: 18.5,
      longitude: 73.8,
      speed: 10,
      heading: 90,
      visibility: 20,
    },
  }));

  const unknownError = await waitFor(clientA, (event) => event.type === 'ERROR' && event.data.message === 'Unknown vehicle');
  console.log('unknown vehicle ERROR:', unknownError);

  const unknownVehicle = await getVehicle('UNKNOWN-999');
  if (unknownVehicle.status !== 404) {
    throw new Error('Unknown vehicle was created in current state');
  }

  const clientB = await connect();
  const welcomeB = await waitFor(clientB, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');
  console.log('client B connected:', welcomeB);

  const broadcastToA = await waitFor(clientA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'clients');
  console.log('broadcast to client A:', broadcastToA);

  await new Promise((resolve) => {
    clientB.once('close', resolve);
    clientB.close();
  });
  console.log('client B disconnected');

  await new Promise((resolve) => {
    clientA.once('close', resolve);
    clientA.close();
  });
  console.log('client A disconnected');

  console.log('WebSocket smoke test passed');
}

run().catch((err) => {
  console.error('WebSocket smoke test failed:', err.message);
  process.exit(1);
});
