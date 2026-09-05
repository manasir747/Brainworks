const { spawn } = require('child_process');
const path = require('path');
const { WebSocket } = require('ws');

const PORT = process.env.OBSTACLE_TEST_PORT || '3015';
const HTTP_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function json(method, pathname, body) {
  const response = await fetch(`${HTTP_URL}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

function sendObstacle(ws, data) {
  ws.send(JSON.stringify({
    type: 'OBSTACLE_TELEMETRY',
    data,
  }));
}

function collectEvents(ws) {
  const events = [];
  ws.on('message', (raw) => {
    events.push(JSON.parse(raw.toString()));
  });
  return events;
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const health = await json('GET', '/api/health');
      if (health.status === 200 && health.body.success === true) {
        return;
      }
    } catch (err) {
      // Server is still starting.
    }
    await wait(150);
  }
  throw new Error('Server did not become healthy');
}

function startServer() {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname),
    env: {
      ...process.env,
      PORT,
      SIMULATOR_ENABLED: 'false',
      SIMULATOR_INTERVAL_MS: '200',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return child;
}

async function run() {
  const child = startServer();

  try {
    await waitForHealth();

    const ws = await connect();
    await waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');
    const events = collectEvents(ws);

    const none = await json('GET', '/api/vehicles/TRUCK-01/obstacle');
    console.log('REST CLEAR:', none.body.data);
    if (none.status !== 200 || none.body.data.obstacleDetected !== false) {
      throw new Error('Expected no obstacle on a fresh vehicle');
    }

    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 25, obstacleType: 'ROCK' });
    await wait(200);
    const afterSafe = events.filter((event) => event.type.startsWith('OBSTACLE_'));
    if (afterSafe.length !== 0) {
      throw new Error('Safe distance should not emit obstacle events');
    }

    const detectedWait = waitFor(ws, (event) => event.type === 'OBSTACLE_DETECTED');
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 10, obstacleType: 'ROCK' });
    const detected = await detectedWait;
    console.log('DEMO DETECTED:', detected);
    if (!detected.timestamp || detected.data.vehicleId !== 'TRUCK-01' || detected.data.distance !== 10) {
      throw new Error('OBSTACLE_DETECTED payload is incomplete');
    }

    const detectedState = await json('GET', '/api/vehicles/TRUCK-01/obstacle');
    if (detectedState.body.data.severity !== 'DETECTED' || detectedState.body.data.obstacleDetected !== true) {
      throw new Error('REST should report the 10m obstacle');
    }

    const warningWait = waitFor(ws, (event) => event.type === 'OBSTACLE_WARNING');
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 5, obstacleType: 'ROCK' });
    const warning = await warningWait;
    console.log('DEMO WARNING:', warning);
    if (warning.data.severity !== 'WARNING') {
      throw new Error('5m should produce OBSTACLE_WARNING');
    }

    const criticalWait = waitFor(ws, (event) => event.type === 'CRITICAL_OBSTACLE');
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 2, obstacleType: 'ROCK' });
    const critical = await criticalWait;
    console.log('DEMO CRITICAL:', critical);
    if (critical.data.severity !== 'CRITICAL') {
      throw new Error('2m should produce CRITICAL_OBSTACLE');
    }

    const beforeRepeat = events.filter((event) => event.type === 'CRITICAL_OBSTACLE').length;
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 1, obstacleType: 'ROCK' });
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 2, obstacleType: 'ROCK' });
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 2, obstacleType: 'ROCK' });
    await wait(300);
    const afterRepeat = events.filter((event) => event.type === 'CRITICAL_OBSTACLE').length;
    if (afterRepeat !== beforeRepeat) {
      throw new Error('Repeated critical telemetry flooded CRITICAL_OBSTACLE events');
    }

    const clearedWait = waitFor(ws, (event) => event.type === 'OBSTACLE_CLEARED');
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: 12, obstacleType: 'ROCK' });
    const cleared = await clearedWait;
    console.log('DEMO CLEARED:', cleared);
    if (cleared.data.vehicleId !== 'TRUCK-01') {
      throw new Error('OBSTACLE_CLEARED should include vehicleId');
    }

    const afterClear = await json('GET', '/api/vehicles/TRUCK-01/obstacle');
    if (afterClear.body.data.obstacleDetected !== false) {
      throw new Error('REST should report clear after distance > 10m');
    }

    const unknownWait = waitFor(ws, (event) => event.type === 'ERROR' && event.data.message === 'Unknown vehicle');
    sendObstacle(ws, { vehicleId: 'NOPE-99', distance: 4, obstacleType: 'ROCK' });
    const unknown = await unknownWait;
    console.log('UNKNOWN VEHICLE ERROR:', unknown.data);

    const invalidWait = waitFor(ws, (event) => event.type === 'ERROR' && event.data.message === 'Invalid obstacle data');
    sendObstacle(ws, { vehicleId: 'TRUCK-01', distance: -4, obstacleType: 'ROCK' });
    const invalid = await invalidWait;
    console.log('INVALID DISTANCE ERROR:', invalid.data);

    const missingVehicle = await json('GET', '/api/vehicles/NOPE-99/obstacle');
    if (missingVehicle.status !== 404) {
      throw new Error('Unknown vehicle REST should return 404');
    }

    const started = await json('POST', '/api/simulator/start');
    if (!started.body.data.running) {
      throw new Error('Simulator start failed');
    }

    const simDetectedWait = waitFor(ws, (event) => event.type === 'OBSTACLE_DETECTED' && event.data.vehicleId === 'TRUCK-01');
    const simWarningWait = waitFor(ws, (event) => event.type === 'OBSTACLE_WARNING' && event.data.vehicleId === 'TRUCK-01');
    const simCriticalWait = waitFor(ws, (event) => event.type === 'CRITICAL_OBSTACLE' && event.data.vehicleId === 'TRUCK-01');
    const approaching = await json('POST', '/api/simulator/obstacle-mode', { mode: 'APPROACHING' });
    console.log('SIMULATOR APPROACHING:', approaching.body.data);
    if (approaching.status !== 200 || approaching.body.success !== true) {
      throw new Error('Obstacle mode should be independent and accepted');
    }

    const simDetected = await simDetectedWait;
    const simWarning = await simWarningWait;
    const simCritical = await simCriticalWait;
    console.log('SIMULATOR SEQUENCE:', {
      detected: simDetected.data.distance,
      warning: simWarning.data.distance,
      critical: simCritical.data.distance,
    });

    const simClearedWait = waitFor(ws, (event) => event.type === 'OBSTACLE_CLEARED' && event.data.vehicleId === 'TRUCK-01');
    await json('POST', '/api/simulator/obstacle-mode', { mode: 'CLEAR' });
    const simCleared = await simClearedWait;
    console.log('SIMULATOR CLEARED:', simCleared.data);

    const status = await json('GET', '/api/simulator/status');
    if (!status.body.data.mode || status.body.data.obstacleMode == null) {
      throw new Error('Simulator status should include both visibility mode and obstacleMode');
    }

    await json('POST', '/api/simulator/stop');
    ws.close();
    console.log('Obstacle pipeline tests passed');
  } finally {
    child.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Obstacle pipeline tests failed:', err.message);
  process.exit(1);
});
