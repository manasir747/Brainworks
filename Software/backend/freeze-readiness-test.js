const { spawn } = require('child_process');
const path = require('path');
const { WebSocket } = require('ws');

const PORT = process.env.FREEZE_TEST_PORT || '3020';
const HTTP_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) {
    throw new Error(`${name}: ${detail || 'failed'}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(ws, predicate, timeoutMs = 10000) {
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

function collect(ws) {
  const events = [];
  ws.on('message', (raw) => {
    events.push(JSON.parse(raw.toString()));
  });
  return events;
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('Timed out connecting to WebSocket'));
    }, 5000);

    function onMessage(raw) {
      const event = JSON.parse(raw.toString());
      if (event.type === 'SYSTEM_STATUS' && event.data.status === 'connected') {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(ws);
      }
    }

    ws.on('message', onMessage);
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function json(method, pathname, body) {
  const response = await fetch(`${HTTP_URL}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let parsed = null;
  try {
    parsed = await response.json();
  } catch (err) {
    parsed = null;
  }

  return {
    status: response.status,
    body: parsed,
    rawHeaders: Object.fromEntries(response.headers.entries()),
  };
}

function send(ws, type, data) {
  ws.send(JSON.stringify({ type, data }));
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const health = await json('GET', '/api/health');
      if (health.status === 200 && health.body && health.body.success === true) {
        return;
      }
    } catch (err) {
      // still starting
    }
    await wait(150);
  }
  throw new Error('Server did not become healthy');
}

function startServer() {
  return spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname),
    env: {
      ...process.env,
      PORT,
      SIMULATOR_ENABLED: 'false',
      SIMULATOR_INTERVAL_MS: '200',
      CORS_ORIGIN: '*',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function assertSafeError(body, label) {
  const text = JSON.stringify(body);
  if (!body || body.success !== false || !body.error) {
    throw new Error(`${label} did not return a safe error envelope`);
  }
  if (text.includes('stack') || text.includes(__dirname) || text.includes('node_modules')) {
    throw new Error(`${label} leaked internal details`);
  }
}

async function run() {
  const child = startServer();
  let crashed = false;
  child.on('exit', (code) => {
    if (code && code !== null) {
      crashed = true;
    }
  });

  try {
    await waitForHealth();
    record('Clean start', true, `port ${PORT}`);

    const health = await json('GET', '/api/health');
    record('GET /api/health', health.status === 200 && health.body.data.status === 'ok');
    if (JSON.stringify(health.body).toLowerCase().includes('secret') || JSON.stringify(health.body).includes('SIMULATOR_ENABLED')) {
      throw new Error('Health leaked configuration');
    }

    const vehicles = await json('GET', '/api/vehicles');
    record('GET /api/vehicles', vehicles.status === 200 && Array.isArray(vehicles.body.data) && vehicles.body.data.length >= 2);

    const truck = await json('GET', '/api/vehicles/TRUCK-01');
    record('GET /api/vehicles/:id', truck.status === 200 && truck.body.data.id === 'TRUCK-01' && truck.body.data.zoneId !== undefined);

    const missingVehicle = await json('GET', '/api/vehicles/NOPE-99');
    assertSafeError(missingVehicle.body, 'unknown vehicle');
    record('GET unknown vehicle 404', missingVehicle.status === 404);

    const zones = await json('GET', '/api/zones');
    record('GET /api/zones', zones.status === 200 && zones.body.data.length >= 1);

    const zone = await json('GET', '/api/zones/ZONE-01');
    record('GET /api/zones/:id', zone.status === 200 && zone.body.data.id === 'ZONE-01' && Number(zone.body.data.speedLimit) > 0);

    const missingZone = await json('GET', '/api/zones/ZONE-99');
    assertSafeError(missingZone.body, 'unknown zone');
    record('GET unknown zone 404', missingZone.status === 404);

    const alerts = await json('GET', '/api/alerts');
    const active = await json('GET', '/api/alerts/active');
    record('GET /api/alerts', alerts.status === 200 && Array.isArray(alerts.body.data));
    record('GET /api/alerts/active', active.status === 200 && Array.isArray(active.body.data) && active.body.data.length === 0);

    const missingAlert = await json('GET', '/api/alerts/ALERT-999');
    record('GET unknown alert 404', missingAlert.status === 404);

    const vehicleAlerts = await json('GET', '/api/vehicles/TRUCK-01/alerts');
    record('GET /api/vehicles/:id/alerts', vehicleAlerts.status === 200 && Array.isArray(vehicleAlerts.body.data));

    const obstacle = await json('GET', '/api/vehicles/TRUCK-01/obstacle');
    record('GET /api/vehicles/:id/obstacle', obstacle.status === 200 && obstacle.body.data.obstacleDetected === false);

    const simStatus = await json('GET', '/api/simulator/status');
    record(
      'GET /api/simulator/status',
      simStatus.status === 200 &&
        simStatus.body.data.running === false &&
        simStatus.body.data.mode === 'NORMAL'
    );

    const notFound = await json('GET', '/api/does-not-exist');
    assertSafeError(notFound.body, 'not found');
    record('Unknown REST route 404', notFound.status === 404 && notFound.body.error === 'Not found');

    const badJson = await fetch(`${HTTP_URL}/api/simulator/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    const badJsonBody = await badJson.json();
    if (JSON.stringify(badJsonBody).includes('stack') || JSON.stringify(badJsonBody).includes('node_modules')) {
      throw new Error('Invalid JSON leaked internals');
    }
    record('Invalid REST JSON stays safe', badJson.status >= 400 && badJsonBody.success === false);

    const ws = await connect();
    const events = collect(ws);
    record('WebSocket SYSTEM_STATUS', true);

    send(ws, 'PING');
    await waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'pong');
    record('Incoming PING', true);

    const started = await json('POST', '/api/simulator/start');
    record('Simulator start', started.status === 200 && started.body.data.running === true);

    const startedAgain = await json('POST', '/api/simulator/start');
    record('No duplicate simulator interval', startedAgain.body.data.running === true);

    const vehicleUpdate = await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE');
    record(
      'Scenario 1 VEHICLE_UPDATE',
      Boolean(vehicleUpdate.data.vehicleId && vehicleUpdate.timestamp && vehicleUpdate.data.zoneId !== undefined)
    );

    await wait(700);
    const afterNormal = await json('GET', '/api/vehicles/TRUCK-01');
    const afterNormalAlerts = await json('GET', '/api/alerts/active');
    record(
      'Scenario 1 NORMAL state',
      afterNormal.body.data.lastUpdated != null &&
        afterNormalAlerts.body.data.length === 0 &&
        afterNormal.body.data.visibility >= 40
    );

    const beforeFogVis = afterNormal.body.data.visibility;
    await json('POST', '/api/simulator/mode', { mode: 'FOG' });
    const fogMode = await json('GET', '/api/simulator/status');
    record('Scenario 2 FOG mode set', fogMode.body.data.mode === 'FOG' && fogMode.body.data.running === true);

    await wait(900);
    const afterFog = await json('GET', '/api/vehicles/TRUCK-01');
    const fogUpdates = events.filter((event) => event.type === 'VEHICLE_UPDATE').length;
    record(
      'Scenario 2 visibility decreased',
      afterFog.body.data.visibility < beforeFogVis || afterFog.body.data.visibility <= 36
    );
    record('Scenario 2 WebSocket stable', fogUpdates >= 2 && ws.readyState === WebSocket.OPEN);

    await json('POST', '/api/simulator/mode', { mode: 'DANGER' });
    const dangerAlertWait = waitFor(ws, (event) => event.type === 'SAFETY_ALERT', 8000);
    const dangerAlert = await dangerAlertWait;
    record(
      'Scenario 3 SAFETY_ALERT',
      dangerAlert.data.vehicleId &&
        (dangerAlert.data.severity === 'HIGH' || dangerAlert.data.severity === 'CRITICAL') &&
        Number(dangerAlert.data.riskScore) >= 50
    );

    await wait(800);
    const safetyAlerts = events.filter((event) => event.type === 'SAFETY_ALERT');
    const alertsPerVehicle = safetyAlerts.reduce((counts, event) => {
      const vehicleId = event.data.vehicleId;
      counts[vehicleId] = (counts[vehicleId] || 0) + 1;
      return counts;
    }, {});
    const floodedVehicle = Object.entries(alertsPerVehicle).find(([, count]) => count > 1);
    const activeDanger = await json('GET', '/api/alerts/active');
    const uniqueVehicles = new Set(activeDanger.body.data.map((alert) => alert.vehicleId));
    record(
      'Scenario 3 no alert flood',
      !floodedVehicle && uniqueVehicles.size === activeDanger.body.data.length,
      floodedVehicle ? `${floodedVehicle[0]} emitted ${floodedVehicle[1]} SAFETY_ALERT events` : `${activeDanger.body.data.length} active vehicle alerts`
    );

    await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });
    await json('POST', '/api/simulator/stop');

    const clientA = await connect();
    const clientB = await connect();
    const clientC = await connect();
    const eventsA = collect(clientA);
    const eventsB = collect(clientB);
    const eventsC = collect(clientC);

    const detectedA = waitFor(clientA, (event) => event.type === 'OBSTACLE_DETECTED');
    const detectedB = waitFor(clientB, (event) => event.type === 'OBSTACLE_DETECTED');
    const detectedC = waitFor(clientC, (event) => event.type === 'OBSTACLE_DETECTED');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 25, obstacleType: 'ROCK' });
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 10, obstacleType: 'ROCK' });
    await Promise.all([detectedA, detectedB, detectedC]);
    record('Scenario 4 10m DETECTED', true, 'all clients received OBSTACLE_DETECTED');

    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 8, obstacleType: 'ROCK' });
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 6, obstacleType: 'ROCK' });
    const warningA = waitFor(clientA, (event) => event.type === 'OBSTACLE_WARNING');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 5, obstacleType: 'ROCK' });
    await warningA;
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 4, obstacleType: 'ROCK' });
    record('Scenario 4 5m WARNING', true);

    const criticalA = waitFor(clientA, (event) => event.type === 'CRITICAL_OBSTACLE');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 2, obstacleType: 'ROCK' });
    await criticalA;
    const beforeCritical = eventsA.filter((event) => event.type === 'CRITICAL_OBSTACLE').length;
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 1, obstacleType: 'ROCK' });
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 1, obstacleType: 'ROCK' });
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 2, obstacleType: 'ROCK' });
    await wait(250);
    const afterCritical = eventsA.filter((event) => event.type === 'CRITICAL_OBSTACLE').length;
    record('Scenario 4 no duplicate CRITICAL', beforeCritical === afterCritical && beforeCritical === 1);

    const restCritical = await json('GET', '/api/vehicles/TRUCK-01/obstacle');
    record(
      'REST critical obstacle state',
      restCritical.body.data.obstacleDetected === true && restCritical.body.data.severity === 'CRITICAL'
    );

    const clearedA = waitFor(clientA, (event) => event.type === 'OBSTACLE_CLEARED');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 12, obstacleType: 'ROCK' });
    await clearedA;
    const beforeCleared = eventsA.filter((event) => event.type === 'OBSTACLE_CLEARED').length;
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 20, obstacleType: 'ROCK' });
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 30, obstacleType: 'ROCK' });
    await wait(200);
    const afterCleared = eventsA.filter((event) => event.type === 'OBSTACLE_CLEARED').length;
    record('Scenario 5 CLEARED once', beforeCleared === 1 && afterCleared === 1);

    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 4, obstacleType: 'ROCK' });
    await waitFor(clientA, (event) => event.type === 'OBSTACLE_WARNING' && event.data.vehicleId === 'TRUCK-01');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'LOAD-01', distance: 9, obstacleType: 'PERSON' });
    await waitFor(clientA, (event) => event.type === 'OBSTACLE_DETECTED' && event.data.vehicleId === 'LOAD-01');

    const truckObstacle = await json('GET', '/api/vehicles/TRUCK-01/obstacle');
    const loaderObstacle = await json('GET', '/api/vehicles/LOAD-01/obstacle');
    const truckAlerts = await json('GET', '/api/vehicles/TRUCK-01/alerts');
    const loaderAlerts = await json('GET', '/api/vehicles/LOAD-01/alerts');
    const loaderHasTruckAlert = loaderAlerts.body.data.some((alert) => alert.vehicleId === 'TRUCK-01');
    record(
      'Scenario 6 independent vehicles',
      truckObstacle.body.data.distance === 4 &&
        loaderObstacle.body.data.distance === 9 &&
        truckObstacle.body.data.severity === 'WARNING' &&
        loaderObstacle.body.data.severity === 'DETECTED' &&
        loaderHasTruckAlert === false &&
        truckAlerts.body.data.every((alert) => alert.vehicleId === 'TRUCK-01')
    );

    const updateA = waitFor(clientA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-02');
    const updateB = waitFor(clientB, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-02');
    send(ws, 'VEHICLE_TELEMETRY', {
      vehicleId: 'TRUCK-02',
      latitude: 18.5186,
      longitude: 73.8594,
      speed: 20,
      heading: 200,
      visibility: 80,
    });
    await Promise.all([updateA, updateB]);
    record('Scenario 7 all clients receive telemetry', true);

    clientC.close();
    await wait(200);
    const afterDisconnect = waitFor(clientA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'EXCV-01');
    send(ws, 'VEHICLE_TELEMETRY', {
      vehicleId: 'EXCV-01',
      latitude: 18.5169,
      longitude: 73.8518,
      speed: 4,
      heading: 75,
      visibility: 88,
    });
    await afterDisconnect;
    record('Scenario 7 remaining clients survive disconnect', clientA.readyState === WebSocket.OPEN && clientB.readyState === WebSocket.OPEN);

    const errorWait = waitFor(ws, (event) => event.type === 'ERROR' && event.data.message === 'Invalid JSON message');
    ws.send('not-json');
    await errorWait;

    const unknownVehicleWait = waitFor(ws, (event) => event.type === 'ERROR' && event.data.message === 'Unknown vehicle');
    send(ws, 'VEHICLE_TELEMETRY', { vehicleId: 'GHOST', latitude: 1, longitude: 1, speed: 1, heading: 1, visibility: 1 });
    await unknownVehicleWait;

    const invalidTelemetryWait = waitFor(ws, (event) => event.type === 'ERROR' && event.data.message === 'Invalid telemetry data');
    send(ws, 'VEHICLE_TELEMETRY', { vehicleId: 'TRUCK-01', latitude: 'NaN', longitude: 73.85, speed: 10, heading: 10, visibility: 80 });
    await invalidTelemetryWait;

    const invalidObstacleWait = waitFor(ws, (event) => event.type === 'ERROR' && event.data.message === 'Invalid obstacle data');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: -4, obstacleType: 'ROCK' });
    await invalidObstacleWait;

    send(ws, 'NOT_A_REAL_EVENT', { hello: 'world' });
    await wait(150);

    record('Scenario 8 invalid data stays safe', ws.readyState === WebSocket.OPEN && !crashed);

    const resolvedWait = waitFor(clientA, (event) => event.type === 'ALERT_RESOLVED');
    send(ws, 'OBSTACLE_TELEMETRY', { vehicleId: 'TRUCK-01', distance: 25, obstacleType: 'ROCK' });
    send(ws, 'VEHICLE_TELEMETRY', {
      vehicleId: 'TRUCK-01',
      latitude: 18.5212,
      longitude: 73.8541,
      speed: 20,
      heading: 118,
      visibility: 90,
    });
    try {
      await Promise.race([resolvedWait, wait(800)]);
    } catch (err) {
      // ALERT_RESOLVED is optional if no HIGH alert remains
    }

    const pingAfterErrors = waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'pong');
    send(ws, 'PING');
    await pingAfterErrors;
    record('Backend alive after malformed input', true);

    clientA.close();
    clientB.close();
    ws.close();

    record('Process stayed up', !crashed);
    console.log(`Freeze readiness tests passed (${results.length})`);
  } finally {
    child.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Freeze readiness tests failed:', err.message);
  console.error(results.filter((item) => !item.passed));
  process.exit(1);
});
