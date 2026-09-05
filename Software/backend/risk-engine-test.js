const { calculateRisk, RISK_LEVELS } = require('./src/services/risk.service');

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

function assertScoreRange(result) {
  assert(Number.isInteger(result.riskScore), 'riskScore must be an integer');
  assert(result.riskScore >= 0 && result.riskScore <= 100, 'riskScore must be 0-100');
}

function assertLevelMatchesScore(result) {
  const { riskScore, riskLevel } = result;
  if (riskScore <= RISK_LEVELS.LOW.max) {
    assert(riskLevel === 'LOW', `score ${riskScore} should be LOW`);
    return;
  }
  if (riskScore <= RISK_LEVELS.MEDIUM.max) {
    assert(riskLevel === 'MEDIUM', `score ${riskScore} should be MEDIUM`);
    return;
  }
  if (riskScore <= RISK_LEVELS.HIGH.max) {
    assert(riskLevel === 'HIGH', `score ${riskScore} should be HIGH`);
    return;
  }
  assert(riskLevel === 'CRITICAL', `score ${riskScore} should be CRITICAL`);
}

function hasFactor(result, type) {
  return result.factors.some((factor) => factor.type === type);
}

function runTwice(vehicle, nearby, zone) {
  const first = calculateRisk(vehicle, nearby, zone);
  const second = calculateRisk(vehicle, nearby, zone);
  assert(JSON.stringify(first) === JSON.stringify(second), 'Risk calculation is not deterministic');
  return first;
}

function run() {
  const safe = runTwice(
    {
      id: 'TRUCK-01',
      speed: 25,
      visibility: 90,
      latitude: 18.5204,
      longitude: 73.8567,
    },
    [farVehicle],
    haulRoad
  );
  console.log('TEST 1 SAFE:', safe);
  assertScoreRange(safe);
  assertLevelMatchesScore(safe);
  assert(safe.riskLevel === 'LOW', 'TEST 1 should be LOW');
  assert(safe.factors.length === 0, 'TEST 1 should have no risk factors');

  const lowVisibility = runTwice(
    {
      id: 'TRUCK-01',
      speed: 25,
      visibility: 25,
      latitude: 18.5204,
      longitude: 73.8567,
    },
    [farVehicle],
    haulRoad
  );
  console.log('TEST 2 LOW VISIBILITY:', lowVisibility);
  assertScoreRange(lowVisibility);
  assertLevelMatchesScore(lowVisibility);
  assert(lowVisibility.riskScore > safe.riskScore, 'TEST 2 should be more elevated than SAFE');
  assert(hasFactor(lowVisibility, 'LOW_VISIBILITY'), 'TEST 2 should include LOW_VISIBILITY');
  assert(!hasFactor(lowVisibility, 'OVERSPEED'), 'TEST 2 should not include OVERSPEED');

  const overspeed = runTwice(
    {
      id: 'TRUCK-01',
      speed: 60,
      visibility: 90,
      latitude: 18.5204,
      longitude: 73.8567,
    },
    [farVehicle],
    haulRoad
  );
  console.log('TEST 3 OVERSPEED:', overspeed);
  assertScoreRange(overspeed);
  assertLevelMatchesScore(overspeed);
  assert(overspeed.riskScore >= 40, 'TEST 3 should be strongly elevated by overspeed');
  assert(hasFactor(overspeed, 'OVERSPEED'), 'TEST 3 should include OVERSPEED');

  const proximity = runTwice(
    {
      id: 'TRUCK-01',
      speed: 25,
      visibility: 90,
      latitude: 18.5204,
      longitude: 73.8567,
    },
    [closeVehicle],
    haulRoad
  );
  console.log('TEST 4 PROXIMITY:', proximity);
  assertScoreRange(proximity);
  assertLevelMatchesScore(proximity);
  assert(hasFactor(proximity, 'PROXIMITY'), 'TEST 4 should include PROXIMITY');
  assert(proximity.factors.find((factor) => factor.type === 'PROXIMITY').value < 20, 'TEST 4 should be < 20m');

  const combined = runTwice(
    {
      id: 'TRUCK-01',
      speed: 60,
      visibility: 25,
      latitude: 18.5204,
      longitude: 73.8567,
    },
    [closeVehicle],
    haulRoad
  );
  console.log('TEST 5 COMBINED:', combined);
  assertScoreRange(combined);
  assertLevelMatchesScore(combined);
  assert(combined.riskLevel === 'CRITICAL', 'TEST 5 should be CRITICAL');
  assert(hasFactor(combined, 'OVERSPEED'), 'TEST 5 should include OVERSPEED');
  assert(hasFactor(combined, 'LOW_VISIBILITY'), 'TEST 5 should include LOW_VISIBILITY');
  assert(hasFactor(combined, 'PROXIMITY'), 'TEST 5 should include PROXIMITY');

  console.log('Risk engine tests passed');
}

run();
