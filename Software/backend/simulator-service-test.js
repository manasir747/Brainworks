const fs = require('fs');
const path = require('path');
const telemetryService = require('./src/services/telemetry.service');
const alertService = require('./src/services/alert.service');
const simulator = require('./src/services/telemetry.simulator');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const vehiclesFile = fs.readFileSync(path.join(__dirname, 'src/data/vehicles.json'), 'utf8');

  simulator.stopSimulator();
  alertService.resetAlertState();
  telemetryService.initialize();

  const idle = simulator.getSimulatorStatus();
  console.log('TEST 1 DISABLED STATUS:', idle);
  assert(idle.running === false, 'Simulator should not be running by default');

  const firstStart = simulator.startSimulator(50);
  const secondStart = simulator.startSimulator(50);
  console.log('TEST 2/9 START:', firstStart, secondStart);
  assert(firstStart.running === true, 'Start should set running true');
  assert(secondStart.running === true, 'Duplicate start should still report running');

  await wait(200);
  const afterNormal = telemetryService.getVehicleState('TRUCK-01');
  console.log('TEST 4 NORMAL:', { speed: afterNormal.speed, visibility: afterNormal.visibility });
  assert(afterNormal.visibility >= 40, 'NORMAL visibility should stay reasonable');

  simulator.setSimulationMode('FOG');
  await wait(400);
  const afterFog = telemetryService.getVehicleState('TRUCK-01');
  console.log('TEST 5 FOG:', { visibility: afterFog.visibility });
  assert(afterFog.visibility < afterNormal.visibility || afterFog.visibility <= 40, 'FOG should reduce visibility');

  simulator.setSimulationMode('DANGER');
  await wait(700);
  const truck1 = telemetryService.getVehicleState('TRUCK-01');
  const truck2 = telemetryService.getVehicleState('TRUCK-02');
  const active = alertService.getActiveAlerts();
  console.log('TEST 6 DANGER:', {
    truck1: { speed: truck1.speed, visibility: truck1.visibility },
    truck2: { speed: truck2.speed, visibility: truck2.visibility },
    alerts: active.map((alert) => ({ id: alert.alertId, severity: alert.severity, type: alert.type })),
  });
  assert(truck1.speed > 30 || truck2.speed > 30, 'DANGER should produce overspeed');
  assert(truck1.visibility <= 35, 'DANGER should produce low visibility');
  assert(active.length >= 1, 'Existing alert engine should create SAFETY_ALERT state');

  simulator.setSimulationMode('NORMAL');
  await wait(900);
  const afterRecovery = alertService.getActiveAlerts();
  console.log('TEST 7 RECOVERY active alerts:', afterRecovery.length);
  assert(afterRecovery.length === 0, 'Returning to NORMAL should resolve alerts');

  const stopped = simulator.stopSimulator();
  const stoppedAgain = simulator.stopSimulator();
  console.log('TEST 8 STOP:', stopped, stoppedAgain);
  assert(stopped.running === false, 'Stop should set running false');
  assert(stoppedAgain.running === false, 'Stopping twice should be safe');

  const afterStop = JSON.stringify(telemetryService.getAllVehicleStates());
  await wait(200);
  const later = JSON.stringify(telemetryService.getAllVehicleStates());
  assert(afterStop === later, 'No telemetry should be generated after stop');

  const vehiclesFileAfter = fs.readFileSync(path.join(__dirname, 'src/data/vehicles.json'), 'utf8');
  assert(vehiclesFile === vehiclesFileAfter, 'vehicles.json must not be mutated');

  console.log('Simulator service tests passed');
}

run().catch((err) => {
  simulator.stopSimulator();
  console.error('Simulator service tests failed:', err.message);
  process.exit(1);
});
