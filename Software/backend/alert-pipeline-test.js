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

function sendTelemetry(ws, data) {
  ws.send(JSON.stringify({
    type: 'VEHICLE_TELEMETRY',
    data,
  }));
}

async function getJson(path) {
  const response = await fetch(`${HTTP_URL}${path}`);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function run() {
  const ws = await connect();
  await waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');

  sendTelemetry(ws, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 25,
    heading: 118,
    visibility: 90,
  });
  await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-01');

  const afterSafe = await getJson('/api/alerts/active');
  if (afterSafe.body.data.length !== 0) {
    throw new Error('SAFE telemetry created an unexpected alert');
  }

  sendTelemetry(ws, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 60,
    heading: 125,
    visibility: 25,
  });

  const safetyAlert = await waitFor(ws, (event) => event.type === 'SAFETY_ALERT');
  console.log('SAFETY_ALERT:', safetyAlert);
  if (safetyAlert.data.severity !== 'HIGH' && safetyAlert.data.severity !== 'CRITICAL') {
    throw new Error('Expected HIGH or CRITICAL SAFETY_ALERT');
  }

  sendTelemetry(ws, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 60,
    heading: 125,
    visibility: 25,
  });
  await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE');

  const activeAfterRepeat = await getJson('/api/alerts/active');
  if (activeAfterRepeat.body.data.length !== 1) {
    throw new Error('Repeated HIGH telemetry created alert spam');
  }

  sendTelemetry(ws, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5186,
    longitude: 73.859542,
    speed: 60,
    heading: 125,
    visibility: 25,
  });
  await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE');

  const afterEscalation = await getJson('/api/alerts/active');
  if (afterEscalation.body.data.length !== 1) {
    throw new Error('Escalation created a duplicate alert');
  }
  if (afterEscalation.body.data[0].severity !== 'CRITICAL') {
    throw new Error('Active alert did not escalate to CRITICAL');
  }

  sendTelemetry(ws, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 25,
    heading: 118,
    visibility: 90,
  });

  const resolved = await waitFor(ws, (event) => event.type === 'ALERT_RESOLVED');
  console.log('ALERT_RESOLVED:', resolved);

  const history = await getJson('/api/alerts');
  const active = await getJson('/api/alerts/active');
  const byId = await getJson(`/api/alerts/${safetyAlert.data.alertId}`);
  const forVehicle = await getJson('/api/vehicles/TRUCK-01/alerts');
  const missing = await getJson('/api/alerts/DOES-NOT-EXIST');

  console.log('GET /api/alerts:', history.status, history.body.data.length);
  console.log('GET /api/alerts/active:', active.status, active.body.data.length);
  console.log('GET /api/alerts/:id:', byId.status, byId.body.data && byId.body.data.status);
  console.log('GET /api/vehicles/TRUCK-01/alerts:', forVehicle.status, forVehicle.body.data.length);
  console.log('GET missing alert:', missing.status, missing.body);

  if (active.body.data.length !== 0) {
    throw new Error('Active alerts were not cleared after resolution');
  }
  if (byId.status !== 200 || byId.body.data.status !== 'RESOLVED') {
    throw new Error('Resolved alert was not kept in history');
  }
  if (missing.status !== 404) {
    throw new Error('Missing alert should return 404');
  }

  sendTelemetry(ws, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 60,
    heading: 125,
    visibility: 25,
  });

  const secondAlert = await waitFor(ws, (event) => event.type === 'SAFETY_ALERT');
  if (secondAlert.data.alertId === safetyAlert.data.alertId) {
    throw new Error('New danger after resolution reused the old alert ID');
  }

  await new Promise((resolve) => {
    ws.once('close', resolve);
    ws.close();
  });

  console.log('Alert pipeline tests passed');
}

run().catch((err) => {
  console.error('Alert pipeline tests failed:', err.message);
  process.exit(1);
});
