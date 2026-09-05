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

async function getJson(path) {
  const response = await fetch(`${HTTP_URL}${path}`);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function run() {
  const zones = await getJson('/api/zones');
  const haul = await getJson('/api/zones/ZONE-01');
  const missing = await getJson('/api/zones/ZONE-99');
  const inside = await getJson('/api/zones/location?latitude=18.5212&longitude=73.8541');
  const outside = await getJson('/api/zones/location?latitude=18.5&longitude=73.8');

  console.log('GET /api/zones:', zones.status, zones.body.data.map((zone) => zone.id));
  console.log('GET /api/zones/ZONE-01:', haul.status, haul.body.data && haul.body.data.name);
  console.log('GET missing zone:', missing.status, missing.body);
  console.log('GET location inside:', inside.status, inside.body.data && inside.body.data.id);
  console.log('GET location outside:', outside.status, outside.body);

  if (zones.status !== 200 || zones.body.data.length !== 3) {
    throw new Error('GET /api/zones should return 3 zones');
  }
  if (haul.status !== 200 || haul.body.data.id !== 'ZONE-01') {
    throw new Error('GET /api/zones/ZONE-01 failed');
  }
  if (missing.status !== 404) {
    throw new Error('Unknown zone should return 404');
  }
  if (inside.status !== 200 || inside.body.data.id !== 'ZONE-01') {
    throw new Error('Location lookup should return ZONE-01');
  }
  if (outside.status !== 404 || outside.body.error !== 'No zone found for this location') {
    throw new Error('Outside location should return 404');
  }

  const ws = await connect();
  await waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');

  ws.send(JSON.stringify({
    type: 'VEHICLE_TELEMETRY',
    data: {
      vehicleId: 'TRUCK-01',
      vehicleType: 'DUMP_TRUCK',
      latitude: 18.5212,
      longitude: 73.8541,
      speed: 28,
      heading: 118,
      visibility: 80,
    },
  }));

  const update = await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-01');
  console.log('VEHICLE_UPDATE zoneId:', update.data.zoneId);
  if (update.data.zoneId !== 'ZONE-01') {
    throw new Error('VEHICLE_UPDATE should include ZONE-01');
  }

  const restVehicle = await getJson('/api/vehicles/TRUCK-01');
  if (restVehicle.body.data.zoneId !== 'ZONE-01') {
    throw new Error('REST vehicle state should include ZONE-01');
  }

  await new Promise((resolve) => {
    ws.once('close', resolve);
    ws.close();
  });

  console.log('Zone pipeline tests passed');
}

run().catch((err) => {
  console.error('Zone pipeline tests failed:', err.message);
  process.exit(1);
});
