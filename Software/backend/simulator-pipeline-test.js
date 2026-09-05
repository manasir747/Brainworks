const { WebSocket } = require('ws');

const HTTP_URL = process.env.HTTP_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';

function waitFor(ws, predicate, timeoutMs = 8000) {
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

async function json(method, path, body) {
  const response = await fetch(`${HTTP_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function run() {
  const statusBefore = await json('GET', '/api/simulator/status');
  console.log('TEST 1 STATUS BEFORE START:', statusBefore.body.data);
  if (statusBefore.body.data.running !== false) {
    throw new Error('Simulator should be stopped when not auto-enabled');
  }

  const started = await json('POST', '/api/simulator/start');
  const startedAgain = await json('POST', '/api/simulator/start');
  console.log('TEST 2 START:', started.body.data);
  if (!started.body.data.running || !startedAgain.body.data.running) {
    throw new Error('POST /start should run a single simulator');
  }

  const status = await json('GET', '/api/simulator/status');
  console.log('TEST 3 STATUS:', status.body.data);
  if (status.body.data.running !== true) {
    throw new Error('GET /status should report running true');
  }

  const ws = await connect();
  await waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');
  const vehicleUpdate = await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE');
  console.log('TEST 4 VEHICLE_UPDATE:', vehicleUpdate.data.vehicleId);

  await json('POST', '/api/simulator/mode', { mode: 'FOG' });
  const fogStatus = await json('GET', '/api/simulator/status');
  console.log('TEST 5 FOG MODE:', fogStatus.body.data.mode);
  if (fogStatus.body.data.mode !== 'FOG') {
    throw new Error('FOG mode was not set');
  }

  await json('POST', '/api/simulator/mode', { mode: 'DANGER' });
  const safetyAlert = await waitFor(ws, (event) => event.type === 'SAFETY_ALERT');
  console.log('TEST 6 SAFETY_ALERT:', safetyAlert.data);

  await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });
  const resolved = await waitFor(ws, (event) => event.type === 'ALERT_RESOLVED', 10000);
  console.log('TEST 7 ALERT_RESOLVED:', resolved.data);

  const stopped = await json('POST', '/api/simulator/stop');
  console.log('TEST 8 STOP:', stopped.body.data);
  if (stopped.body.data.running !== false) {
    throw new Error('POST /stop should set running false');
  }

  const invalid = await json('POST', '/api/simulator/mode', { mode: 'STORM' });
  if (invalid.status !== 400) {
    throw new Error('Unsupported mode should return 400');
  }

  await new Promise((resolve) => {
    ws.once('close', resolve);
    ws.close();
  });

  console.log('Simulator pipeline tests passed');
}

run().catch((err) => {
  console.error('Simulator pipeline tests failed:', err.message);
  process.exit(1);
});
