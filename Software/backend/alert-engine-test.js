const { calculateRisk } = require('./src/services/risk.service');
const alertService = require('./src/services/alert.service');

const haulRoad = {
  id: 'ZONE-01',
  name: 'Haul Road',
  speedLimit: 30,
  visibilityThreshold: 50,
};

const farVehicle = {
  id: 'TRUCK-02',
  latitude: 18.53,
  longitude: 73.87,
};

const closeVehicle = {
  id: 'TRUCK-02',
  latitude: 18.5204,
  longitude: 73.856842,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function evaluate(vehicle, nearby) {
  const risk = calculateRisk(vehicle, nearby, haulRoad);
  const result = alertService.evaluateRisk(vehicle, risk);
  return { risk, result };
}

function run() {
  alertService.resetAlertState();

  const safeVehicle = {
    id: 'TRUCK-01',
    speed: 25,
    visibility: 90,
    latitude: 18.5204,
    longitude: 73.8567,
  };

  const safe = evaluate(safeVehicle, [farVehicle]);
  console.log('TEST 1 SAFE:', safe.risk, safe.result);
  assert(safe.risk.riskLevel === 'LOW', 'TEST 1 should be LOW risk');
  assert(!safe.result.created, 'TEST 1 should not create an alert');
  assert(alertService.getActiveAlerts().length === 0, 'TEST 1 should have no active alerts');

  const highVehicle = {
    id: 'TRUCK-01',
    speed: 60,
    visibility: 25,
    latitude: 18.5204,
    longitude: 73.8567,
  };

  const high = evaluate(highVehicle, [farVehicle]);
  console.log('TEST 2 HIGH RISK:', high.risk, high.result.alert);
  assert(high.risk.riskLevel === 'HIGH', 'TEST 2 should be HIGH risk');
  assert(safe.result.created === false && high.result.created, 'TEST 2 should create one SAFETY_ALERT');
  assert(alertService.getActiveAlerts().length === 1, 'TEST 2 should have one active alert');

  const firstAlertId = high.result.alert.alertId;

  const repeat1 = evaluate(highVehicle, [farVehicle]);
  const repeat2 = evaluate(highVehicle, [farVehicle]);
  console.log('TEST 3 REPEATED HIGH:', {
    created: [repeat1.result.created, repeat2.result.created],
    active: alertService.getActiveAlerts().length,
  });
  assert(!repeat1.result.created && !repeat2.result.created, 'TEST 3 must not create extra alerts');
  assert(alertService.getActiveAlerts().length === 1, 'TEST 3 must keep only one active alert');
  assert(alertService.getActiveAlerts()[0].alertId === firstAlertId, 'TEST 3 must reuse the same alert');

  const critical = evaluate(highVehicle, [closeVehicle]);
  console.log('TEST 4 ESCALATION:', critical.risk, critical.result.alert);
  assert(critical.risk.riskLevel === 'CRITICAL', 'TEST 4 should escalate to CRITICAL');
  assert(!critical.result.created, 'TEST 4 must not create a duplicate alert');
  assert(critical.result.updated, 'TEST 4 should update the existing alert');
  assert(critical.result.alert.alertId === firstAlertId, 'TEST 4 should keep the same alert ID');
  assert(critical.result.alert.severity === 'CRITICAL', 'TEST 4 should update severity');

  const resolved = evaluate(safeVehicle, [farVehicle]);
  console.log('TEST 5 RESOLUTION:', resolved.result);
  assert(resolved.risk.riskLevel === 'LOW', 'TEST 5 should return to LOW');
  assert(resolved.result.resolved, 'TEST 5 should resolve the alert');
  assert(resolved.result.alert.status === 'RESOLVED', 'TEST 5 status should be RESOLVED');
  assert(alertService.getActiveAlerts().length === 0, 'TEST 5 should have no active alerts');
  assert(alertService.getAlertHistory().length === 1, 'TEST 5 should keep resolved alert in history');

  const again = evaluate(highVehicle, [farVehicle]);
  console.log('TEST 6 NEW DANGER:', again.result.alert);
  assert(again.result.created, 'TEST 6 should create a new alert');
  assert(again.result.alert.alertId !== firstAlertId, 'TEST 6 should use a new alert ID');
  assert(alertService.getActiveAlerts().length === 1, 'TEST 6 should have one new active alert');
  assert(alertService.getAlertHistory().length === 2, 'TEST 6 should keep previous resolved alert');

  console.log('Alert engine tests passed');
}

run();
