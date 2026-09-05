const zoneService = require('./src/services/zone.service');
const telemetryService = require('./src/services/telemetry.service');
const { calculateRisk } = require('./src/services/risk.service');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  telemetryService.initialize();

  const haulInside = zoneService.getZoneForLocation(18.5212, 73.8541);
  console.log('TEST 1 INSIDE ZONE:', haulInside && haulInside.id);
  assert(haulInside && haulInside.id === 'ZONE-01', 'TEST 1 should return ZONE-01');

  const outside = zoneService.getZoneForLocation(18.5, 73.8);
  console.log('TEST 2 OUTSIDE ZONES:', outside);
  assert(outside === null, 'TEST 2 should return null');

  const telemetry = telemetryService.processTelemetry({
    vehicleId: 'TRUCK-01',
    latitude: 18.5212,
    longitude: 73.8541,
    speed: 28,
    heading: 118,
    visibility: 80,
  });
  console.log('TEST 3 VEHICLE TELEMETRY zoneId:', telemetry.state.zoneId);
  assert(telemetry.ok, 'TEST 3 telemetry should succeed');
  assert(telemetry.state.zoneId === 'ZONE-01', 'TEST 3 should store ZONE-01 on the vehicle');

  const loadingTelemetry = telemetryService.processTelemetry({
    vehicleId: 'LOAD-01',
    latitude: 18.5198,
    longitude: 73.8533,
    speed: 25,
    heading: 310,
    visibility: 90,
  });
  const loadingZone = zoneService.getVehicleZone(loadingTelemetry.state);
  const risk = calculateRisk(loadingTelemetry.state, [], loadingZone);
  console.log('TEST 4 ZONE SPEED LIMIT:', {
    zoneId: risk.zoneId,
    speedLimit: risk.speedLimit,
    riskScore: risk.riskScore,
    factors: risk.factors.map((factor) => factor.type),
  });
  assert(loadingZone && loadingZone.id === 'ZONE-02', 'TEST 4 should detect Loading Zone');
  assert(risk.speedLimit === 15, 'TEST 4 should use ZONE-02 speed limit 15');
  assert(risk.factors.some((factor) => factor.type === 'OVERSPEED'), 'TEST 4 should flag overspeed against zone limit');

  const moved = telemetryService.processTelemetry({
    vehicleId: 'TRUCK-01',
    latitude: 18.5198,
    longitude: 73.8533,
    speed: 20,
    heading: 200,
    visibility: 80,
  });
  console.log('TEST 5 ZONE CHANGE:', moved.state.zoneId);
  assert(moved.state.zoneId === 'ZONE-02', 'TEST 5 should update TRUCK-01 to ZONE-02');

  const noZone = zoneService.getZoneForLocation('bad', 'data');
  assert(noZone === null, 'Invalid coordinates should return null');

  console.log('Zone service tests passed');
}

run();
