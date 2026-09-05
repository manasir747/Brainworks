const obstacleService = require('./src/services/obstacle.service');
const telemetryService = require('./src/services/telemetry.service');
const alertService = require('./src/services/alert.service');
const { calculateRisk } = require('./src/services/risk.service');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function reset() {
  telemetryService.initialize();
  obstacleService.resetObstacleState();
  alertService.resetAlertState();
}

function run() {
  reset();

  const none = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 25,
    obstacleType: 'ROCK',
  });
  console.log('TEST 1 NO OBSTACLE:', none);
  assert(none.ok === true, 'Safe distance should be accepted');
  assert(none.event === null, 'No obstacle warning should be emitted');
  assert(obstacleService.getObstacleState('TRUCK-01').obstacleDetected === false, 'State should stay clear');

  const detected = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 10,
    obstacleType: 'ROCK',
  });
  console.log('TEST 2 DETECTED:', detected);
  assert(detected.event === 'OBSTACLE_DETECTED', '10m should emit OBSTACLE_DETECTED');
  assert(detected.data.severity === 'DETECTED', '10m severity should be DETECTED');
  assert(detected.data.obstacleType === 'ROCK', 'Obstacle type should pass through');

  const warning = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 5,
    obstacleType: 'ROCK',
  });
  console.log('TEST 3 WARNING:', warning);
  assert(warning.event === 'OBSTACLE_WARNING', '5m should emit OBSTACLE_WARNING');
  assert(warning.data.severity === 'WARNING', '5m severity should be WARNING');

  const critical = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 2,
    obstacleType: 'ROCK',
  });
  console.log('TEST 4 CRITICAL:', critical);
  assert(critical.event === 'CRITICAL_OBSTACLE', '2m should emit CRITICAL_OBSTACLE');
  assert(critical.data.severity === 'CRITICAL', '2m severity should be CRITICAL');

  const closer = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 1,
    obstacleType: 'ROCK',
  });
  console.log('TEST 5 NO DUPLICATE CRITICAL:', closer);
  assert(closer.ok === true, 'Closer critical telemetry should be accepted');
  assert(closer.event === null, '1m should not emit another CRITICAL_OBSTACLE');

  const cleared = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 12,
    obstacleType: 'ROCK',
  });
  console.log('TEST 6 CLEARED:', cleared);
  assert(cleared.event === 'OBSTACLE_CLEARED', '12m should emit OBSTACLE_CLEARED');
  assert(cleared.data.vehicleId === 'TRUCK-01', 'Cleared event should include vehicleId');

  const stillClear = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 20,
    obstacleType: 'ROCK',
  });
  assert(stillClear.event === null, 'Repeated clear telemetry should not emit again');

  const firstCritical = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 2,
    obstacleType: 'ROCK',
  });
  const repeatA = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 2,
    obstacleType: 'ROCK',
  });
  const repeatB = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 2,
    obstacleType: 'ROCK',
  });
  console.log('TEST 7 REPEAT 2M:', { first: firstCritical.event, repeatA: repeatA.event, repeatB: repeatB.event });
  assert(firstCritical.event === 'CRITICAL_OBSTACLE', 'First 2m should emit critical');
  assert(repeatA.event === null && repeatB.event === null, 'Repeated 2m telemetry must not flood events');

  const unknown = obstacleService.processObstacleTelemetry({
    vehicleId: 'GHOST-99',
    distance: 4,
    obstacleType: 'ROCK',
  });
  console.log('TEST 8 UNKNOWN VEHICLE:', unknown);
  assert(unknown.ok === false, 'Unknown vehicle should fail safely');
  assert(unknown.error === 'Unknown vehicle', 'Unknown vehicle should return a safe error');

  const negative = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: -3,
    obstacleType: 'ROCK',
  });
  const missing = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    obstacleType: 'ROCK',
  });
  const nanDistance = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: Number.NaN,
    obstacleType: 'ROCK',
  });
  console.log('TEST 9 INVALID DISTANCE:', { negative, missing, nanDistance });
  assert(negative.ok === false && missing.ok === false && nanDistance.ok === false, 'Invalid distance must fail safely');

  reset();
  const truck = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-01',
    distance: 4,
    obstacleType: 'ROCK',
  });
  const loader = obstacleService.processObstacleTelemetry({
    vehicleId: 'LOAD-01',
    distance: 9,
    obstacleType: 'PERSON',
  });
  const truckState = obstacleService.getObstacleState('TRUCK-01');
  const loaderState = obstacleService.getObstacleState('LOAD-01');
  console.log('TEST 10 INDEPENDENT STATE:', { truckState, loaderState });
  assert(truck.event === 'OBSTACLE_WARNING', 'TRUCK-01 should be in warning range');
  assert(loader.event === 'OBSTACLE_DETECTED', 'LOAD-01 should be in detected range');
  assert(truckState.distance === 4 && loaderState.distance === 9, 'Each vehicle must keep its own distance');
  assert(truckState.obstacleType === 'ROCK' && loaderState.obstacleType === 'PERSON', 'Each vehicle must keep its own type');

  const unknownType = obstacleService.processObstacleTelemetry({
    vehicleId: 'TRUCK-02',
    distance: 8,
    obstacleType: 'METEOR',
  });
  assert(unknownType.ok === true, 'Unknown obstacle type should not crash');
  assert(unknownType.data.obstacleType === 'UNKNOWN', 'Unknown types should map to UNKNOWN');

  const safeVehicle = {
    id: 'TRUCK-01',
    speed: 20,
    visibility: 90,
    latitude: 18.5212,
    longitude: 73.8541,
  };
  const baseline = calculateRisk(safeVehicle, [], { id: 'ZONE-01', speedLimit: 30 });
  const withObstacle = calculateRisk(
    safeVehicle,
    [],
    { id: 'ZONE-01', speedLimit: 30 },
    { obstacleDetected: true, distance: 2, obstacleType: 'ROCK', severity: 'CRITICAL' }
  );
  console.log('RISK INTEGRATION:', { baseline: baseline.riskScore, withObstacle: withObstacle.riskScore, factors: withObstacle.factors });
  assert(baseline.riskScore === 0, 'Existing risk formula should stay unchanged without obstacle');
  assert(withObstacle.riskScore >= 50, 'Critical obstacle should raise overall risk');
  assert(withObstacle.factors.some((factor) => factor.type === 'OBSTACLE_RISK'), 'Critical obstacle should add OBSTACLE_RISK');

  const alert = alertService.evaluateRisk(safeVehicle, withObstacle);
  assert(alert.created === true, 'Critical obstacle risk should create an alert through the existing engine');
  assert(alert.alert.type === 'OBSTACLE_RISK', 'Alert type should be OBSTACLE_RISK');

  console.log('Obstacle detection tests passed');
}

run();
