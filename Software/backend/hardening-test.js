const { WebSocket } = require('ws');
const { calculateRisk } = require('./src/services/risk.service');
const zoneService = require('./src/services/zone.service');

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

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    function onMessage(raw) {
      const event = JSON.parse(raw.toString());
      if (event.type === 'SYSTEM_STATUS' && event.data.status === 'connected') {
        ws.off('message', onMessage);
        resolve(ws);
      }
    }

    ws.on('message', onMessage);
    ws.once('error', reject);
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

function sendTelemetry(ws, data) {
  ws.send(JSON.stringify({
    type: 'VEHICLE_TELEMETRY',
    data,
  }));
}

async function run() {
  await json('POST', '/api/simulator/stop');
  await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });

  const health = await json('GET', '/api/health');
  if (health.status !== 200 || health.body.success !== true || health.body.data.status !== 'ok') {
    throw new Error('Health check failed');
  }
  if (JSON.stringify(health.body).includes('SIMULATOR') || JSON.stringify(health.body).toLowerCase().includes('secret')) {
    throw new Error('Health endpoint exposed sensitive data');
  }

  const vehicles = await json('GET', '/api/vehicles');
  const known = await json('GET', '/api/vehicles/TRUCK-01');
  const missingVehicle = await json('GET', '/api/vehicles/DOES-NOT-EXIST');
  if (vehicles.status !== 200 || !Array.isArray(vehicles.body.data) || vehicles.body.data.length < 1) {
    throw new Error('GET /api/vehicles failed');
  }
  if (known.status !== 200 || known.body.data.id !== 'TRUCK-01') {
    throw new Error('GET valid vehicle failed');
  }
  if (missingVehicle.status !== 404 || missingVehicle.body.success !== false) {
    throw new Error('Unknown vehicle should return 404');
  }

  const zones = await json('GET', '/api/zones');
  const zone = await json('GET', '/api/zones/ZONE-01');
  const inside = await json('GET', '/api/zones/location?latitude=18.5212&longitude=73.8541');
  const outside = await json('GET', '/api/zones/location?latitude=18.5&longitude=73.8');
  const invalidZone = await json('GET', '/api/zones/location?latitude=abc&longitude=');
  const missingCoords = await json('GET', '/api/zones/location');
  if (zones.status !== 200 || zone.body.data.id !== 'ZONE-01' || inside.body.data.id !== 'ZONE-01') {
    throw new Error('Zone lookup failed');
  }
  if (outside.status !== 404 || outside.body.error !== 'No zone found for this location') {
    throw new Error('Outside-zone lookup should not invent a zone');
  }
  if (invalidZone.status !== 400 || missingCoords.status !== 400) {
    throw new Error('Invalid zone coordinates should return 400');
  }

  const alerts = await json('GET', '/api/alerts');
  const active = await json('GET', '/api/alerts/active');
  const missingAlert = await json('GET', '/api/alerts/DOES-NOT-EXIST');
  const vehicleAlerts = await json('GET', '/api/vehicles/TRUCK-03/alerts');
  const missingVehicleAlerts = await json('GET', '/api/vehicles/DOES-NOT-EXIST/alerts');
  if (alerts.status !== 200 || active.status !== 200 || vehicleAlerts.status !== 200) {
    throw new Error('Alert list endpoints failed');
  }
  if (missingAlert.status !== 404 || missingVehicleAlerts.status !== 404) {
    throw new Error('Missing alert/vehicle alert lookup should 404');
  }

  const haulRoad = zoneService.getZoneById('ZONE-01');
  const far = [{ id: 'TRUCK-02', latitude: 18.53, longitude: 73.87 }];
  const close = [{ id: 'TRUCK-02', latitude: 18.5204, longitude: 73.856842 }];
  const safeRisk = calculateRisk({ id: 'TRUCK-01', speed: 20, visibility: 90, latitude: 18.5212, longitude: 73.8541 }, far, haulRoad);
  const overspeed = calculateRisk({ id: 'TRUCK-01', speed: 60, visibility: 90, latitude: 18.5212, longitude: 73.8541 }, far, haulRoad);
  const fog = calculateRisk({ id: 'TRUCK-01', speed: 20, visibility: 25, latitude: 18.5212, longitude: 73.8541 }, far, haulRoad);
  const proximity = calculateRisk({ id: 'TRUCK-01', speed: 20, visibility: 90, latitude: 18.5204, longitude: 73.8567 }, close, haulRoad);
  const combined = calculateRisk({ id: 'TRUCK-01', speed: 60, visibility: 25, latitude: 18.5204, longitude: 73.8567 }, close, haulRoad);
  if (safeRisk.riskLevel !== 'LOW' || safeRisk.factors.length !== 0) {
    throw new Error('Safe conditions should be LOW with no factors');
  }
  if (!overspeed.factors.some((factor) => factor.type === 'OVERSPEED') || overspeed.riskScore <= safeRisk.riskScore) {
    throw new Error('Overspeed did not increase speed risk');
  }
  if (!fog.factors.some((factor) => factor.type === 'LOW_VISIBILITY') || fog.riskScore <= safeRisk.riskScore) {
    throw new Error('Low visibility did not increase visibility risk');
  }
  if (!proximity.factors.some((factor) => factor.type === 'PROXIMITY') || proximity.riskScore <= safeRisk.riskScore) {
    throw new Error('Proximity did not increase proximity risk');
  }
  if (!['HIGH', 'CRITICAL'].includes(combined.riskLevel) || combined.factors.length < 2) {
    throw new Error('Combined danger should be HIGH/CRITICAL and explainable');
  }

  const wsA = await connect();
  const wsB = await connect();

  wsA.send(JSON.stringify({ type: 'PING', data: {} }));
  const pong = await waitFor(wsA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'pong');
  if (!pong.timestamp) {
    throw new Error('PING response missing timestamp');
  }

  wsA.send('not-json');
  await waitFor(wsA, (event) => event.type === 'ERROR' && event.data.message === 'Invalid JSON message');
  wsA.send('');
  await waitFor(wsA, (event) => event.type === 'ERROR');
  wsA.send(JSON.stringify({ data: {} }));
  await waitFor(wsA, (event) => event.type === 'ERROR');
  wsA.send(JSON.stringify({ type: 'UNKNOWN_EVENT', data: {} }));
  sendTelemetry(wsA, { vehicleId: 'TRUCK-01' });
  await waitFor(wsA, (event) => event.type === 'ERROR' && event.data.message === 'Invalid telemetry data');

  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    vehicleType: 'DUMP_TRUCK',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 24,
    heading: 110,
    visibility: 88,
  });
  const updateA = await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-01');
  const updateB = await waitFor(wsB, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-01');
  const restAfter = await json('GET', '/api/vehicles/TRUCK-01');
  if (restAfter.body.data.speed !== 24 || restAfter.body.data.visibility !== 88) {
    throw new Error('REST vehicle state does not match telemetry');
  }
  if (updateA.data.speed !== restAfter.body.data.speed || updateB.data.latitude !== restAfter.body.data.latitude) {
    throw new Error('WebSocket clients did not receive the same current state');
  }
  if (restAfter.body.data.zoneId !== 'ZONE-01') {
    throw new Error('Inside-zone telemetry should set ZONE-01');
  }

  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    latitude: 18.5,
    longitude: 73.8,
    speed: 20,
    heading: 90,
    visibility: 90,
  });
  await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.zoneId === null);
  const outsideVehicle = await json('GET', '/api/vehicles/TRUCK-01');
  if (outsideVehicle.body.data.zoneId !== null) {
    throw new Error('Outside-zone vehicle should have null zoneId');
  }

  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    latitude: 18.5198,
    longitude: 73.8533,
    speed: 18,
    heading: 200,
    visibility: 85,
  });
  const moved = await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.zoneId === 'ZONE-02');
  if (moved.data.zoneId !== 'ZONE-02') {
    throw new Error('Zone change was not applied');
  }

  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 60,
    heading: 120,
    visibility: 20,
  });
  const safetyAlert = await waitFor(wsA, (event) => event.type === 'SAFETY_ALERT' && event.data.vehicleId === 'TRUCK-01');
  const alertOnB = await waitFor(wsB, (event) => event.type === 'SAFETY_ALERT' && event.data.alertId === safetyAlert.data.alertId);
  if (!safetyAlert.data.alertId || !safetyAlert.timestamp || !['HIGH', 'CRITICAL'].includes(safetyAlert.data.severity)) {
    throw new Error('SAFETY_ALERT missing required information');
  }
  if (!alertOnB.data.factors || alertOnB.data.factors.length < 1) {
    throw new Error('Alert factors were not broadcast to all clients');
  }

  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 60,
    heading: 120,
    visibility: 20,
  });
  await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE');
  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 61,
    heading: 121,
    visibility: 19,
  });
  await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE');
  const activeDanger = await json('GET', '/api/alerts/active');
  const truckAlerts = activeDanger.body.data.filter((item) => item.vehicleId === 'TRUCK-01' && item.status === 'ACTIVE');
  if (truckAlerts.length !== 1 || truckAlerts[0].alertId !== safetyAlert.data.alertId) {
    throw new Error('Duplicate active alerts were created');
  }

  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-01',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 20,
    heading: 110,
    visibility: 90,
  });
  const resolved = await waitFor(wsA, (event) => event.type === 'ALERT_RESOLVED' && event.data.alertId === safetyAlert.data.alertId);
  if (resolved.data.status !== 'RESOLVED') {
    throw new Error('ALERT_RESOLVED was not emitted');
  }

  await json('POST', '/api/simulator/stop');
  await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });
  const start1 = await json('POST', '/api/simulator/start');
  const start2 = await json('POST', '/api/simulator/start');
  if (!start1.body.data.running || !start2.body.data.running) {
    throw new Error('Simulator start failed');
  }
  const simUpdate = await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE');
  if (!simUpdate.data.vehicleId) {
    throw new Error('Simulator did not produce VEHICLE_UPDATE');
  }

  const beforeFog = (await json('GET', '/api/vehicles/TRUCK-01')).body.data.visibility;
  await json('POST', '/api/simulator/mode', { mode: 'FOG' });
  await wait(800);
  const fogVehicle = await json('GET', '/api/vehicles/TRUCK-01');
  if (!(fogVehicle.body.data.visibility < beforeFog || fogVehicle.body.data.visibility <= 40)) {
    throw new Error('FOG mode did not reduce visibility');
  }

  await json('POST', '/api/simulator/mode', { mode: 'DANGER' });
  const simAlert = await waitFor(wsA, (event) => event.type === 'SAFETY_ALERT');
  if (!['HIGH', 'CRITICAL'].includes(simAlert.data.severity)) {
    throw new Error('DANGER simulator path did not produce SAFETY_ALERT');
  }

  await json('POST', '/api/simulator/mode', { mode: 'NORMAL' });
  await waitFor(wsA, (event) => event.type === 'ALERT_RESOLVED' && event.data.alertId === simAlert.data.alertId, 10000);

  const stopped = await json('POST', '/api/simulator/stop');
  const stoppedAgain = await json('POST', '/api/simulator/stop');
  if (stopped.body.data.running !== false || stoppedAgain.body.data.running !== false) {
    throw new Error('Simulator stop is not safe/idempotent');
  }
  const snapshot = JSON.stringify((await json('GET', '/api/vehicles')).body.data);
  await wait(300);
  const later = JSON.stringify((await json('GET', '/api/vehicles')).body.data);
  if (snapshot !== later) {
    throw new Error('Telemetry continued after simulator stop');
  }

  wsB.terminate();
  sendTelemetry(wsA, {
    vehicleId: 'TRUCK-02',
    latitude: 18.5186,
    longitude: 73.8594,
    speed: 20,
    heading: 180,
    visibility: 90,
  });
  await waitFor(wsA, (event) => event.type === 'VEHICLE_UPDATE' && event.data.vehicleId === 'TRUCK-02');

  const healthAfter = await json('GET', '/api/health');
  const finalAlerts = await json('GET', '/api/alerts');
  const finalActive = await json('GET', '/api/alerts/active');
  const finalVehicles = await json('GET', '/api/vehicles');
  const finalZones = await json('GET', '/api/zones');
  if (healthAfter.body.data.status !== 'ok' || finalVehicles.status !== 200 || finalZones.status !== 200) {
    throw new Error('Backend is not healthy after hardening tests');
  }

  await new Promise((resolve) => {
    wsA.once('close', resolve);
    wsA.close();
  });

  console.log('Hardening tests passed', {
    health: health.body.data.status,
    risk: {
      safe: safeRisk.riskLevel,
      overspeed: overspeed.riskScore,
      fog: fog.riskScore,
      proximity: proximity.riskScore,
      combined: combined.riskLevel,
    },
    alert: safetyAlert.data.alertId,
    resolved: resolved.data.alertId,
    history: finalAlerts.body.data.length,
    active: finalActive.body.data.length,
  });
}

run().catch((err) => {
  console.error('Hardening tests failed:', err.message);
  process.exit(1);
});
