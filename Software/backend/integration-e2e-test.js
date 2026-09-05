const { WebSocket } = require('ws');

const HTTP_URL = process.env.HTTP_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';

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
  const health = await json('GET', '/api/health');
  if (health.status !== 200 || health.body.success !== true || health.body.data.status !== 'ok') {
    throw new Error('Health endpoint is not consistent');
  }

  const unknown = await json('GET', '/api/does-not-exist');
  if (unknown.status !== 404 || unknown.body.success !== false) {
    throw new Error('Unknown API routes should return success:false');
  }

  const ws = await connect();
  await waitFor(ws, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');

  await json('POST', '/api/simulator/stop');
  await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });
  const before = await json('GET', '/api/simulator/status');
  if (before.body.data.running !== false) {
    throw new Error('Simulator should start disabled');
  }

  await json('POST', '/api/simulator/start');
  const started = await json('GET', '/api/simulator/status');
  if (started.body.data.running !== true) {
    throw new Error('Simulator did not start');
  }

  const update = await waitFor(ws, (event) => event.type === 'VEHICLE_UPDATE');
  if (!update.data.vehicleId || !update.timestamp) {
    throw new Error('VEHICLE_UPDATE missing required fields');
  }

  const restVehicle = await json('GET', `/api/vehicles/${update.data.vehicleId}`);
  if (restVehicle.status !== 200 || restVehicle.body.data.id !== update.data.vehicleId) {
    throw new Error('REST vehicle state does not match WebSocket vehicle');
  }
  if (restVehicle.body.data.latitude !== update.data.latitude || restVehicle.body.data.speed !== update.data.speed) {
    throw new Error('REST and WebSocket vehicle state are out of sync');
  }

  const beforeFog = restVehicle.body.data.visibility;
  await json('POST', '/api/simulator/mode', { mode: 'FOG' });
  await wait(500);
  const afterFog = await json('GET', `/api/vehicles/${update.data.vehicleId}`);
  if (!(afterFog.body.data.visibility < beforeFog || afterFog.body.data.visibility <= 40)) {
    throw new Error('FOG mode did not reduce visibility');
  }

  await json('POST', '/api/simulator/mode', { mode: 'DANGER' });
  const alert = await waitFor(ws, (event) => event.type === 'SAFETY_ALERT');
  if (!['HIGH', 'CRITICAL'].includes(alert.data.severity)) {
    throw new Error('DANGER mode did not produce HIGH/CRITICAL SAFETY_ALERT');
  }

  const activeFirst = await json('GET', '/api/alerts/active');
  await wait(400);
  const activeSecond = await json('GET', '/api/alerts/active');
  const firstIds = activeFirst.body.data.map((item) => item.alertId).sort().join(',');
  const laterSameVehicle = activeSecond.body.data.filter((item) => item.vehicleId === alert.data.vehicleId);
  if (laterSameVehicle.filter((item) => item.alertId === alert.data.alertId).length !== 1) {
    throw new Error('Duplicate active alerts were created for the same vehicle');
  }

  await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });
  const resolved = await waitFor(
    ws,
    (event) => event.type === 'ALERT_RESOLVED' && event.data.alertId === alert.data.alertId,
    10000
  );
  if (resolved.data.status !== 'RESOLVED') {
    throw new Error('ALERT_RESOLVED was not generated');
  }

  const alerts = await json('GET', '/api/alerts');
  const active = await json('GET', '/api/alerts/active');
  const byId = await json('GET', `/api/alerts/${alert.data.alertId}`);
  const vehicleAlerts = await json('GET', `/api/vehicles/${alert.data.vehicleId}/alerts`);
  const zones = await json('GET', '/api/zones');
  const zoneById = await json('GET', '/api/zones/ZONE-01');
  const zoneLocation = await json('GET', '/api/zones/location?latitude=18.5212&longitude=73.8541');
  const vehicles = await json('GET', '/api/vehicles');

  if (alerts.status !== 200 || !Array.isArray(alerts.body.data)) {
    throw new Error('GET /api/alerts failed');
  }
  if (active.body.data.some((item) => item.alertId === alert.data.alertId)) {
    throw new Error('Resolved alert is still active');
  }
  if (byId.status !== 200 || byId.body.data.status !== 'RESOLVED') {
    throw new Error('Resolved alert was not kept in history');
  }
  if (vehicleAlerts.status !== 200) {
    throw new Error('GET /api/vehicles/:id/alerts failed');
  }
  if (zones.status !== 200 || zones.body.data.length !== 3 || zoneById.body.data.id !== 'ZONE-01') {
    throw new Error('Zone REST endpoints failed');
  }
  if (zoneLocation.status !== 200 || zoneLocation.body.data.id !== 'ZONE-01') {
    throw new Error('Zone location lookup failed');
  }
  if (vehicles.status !== 200 || vehicles.body.data.length < 1) {
    throw new Error('GET /api/vehicles failed');
  }

  const stopped = await json('POST', '/api/simulator/stop');
  if (stopped.body.data.running !== false) {
    throw new Error('Simulator did not stop');
  }

  const snapshot = JSON.stringify((await json('GET', '/api/vehicles')).body.data);
  await wait(300);
  const later = JSON.stringify((await json('GET', '/api/vehicles')).body.data);
  if (snapshot !== later) {
    throw new Error('Telemetry continued after simulator stop');
  }

  await new Promise((resolve) => {
    ws.once('close', resolve);
    ws.close();
  });

  console.log('Integration e2e tests passed', {
    health: health.body.data.status,
    vehicleUpdate: update.data.vehicleId,
    fogVisibility: afterFog.body.data.visibility,
    alert: alert.data.alertId,
    duplicateCheck: firstIds,
    resolved: resolved.data.alertId,
  });
}

run().catch((err) => {
  console.error('Integration e2e tests failed:', err.message);
  process.exit(1);
});
