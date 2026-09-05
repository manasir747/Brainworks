const logger = require('../utils/logger');
const config = require('../config/env');
const telemetryService = require('./telemetry.service');
const { ingestTelemetry, ingestObstacleTelemetry } = require('../websocket/websocket.server');

const MODES = {
  NORMAL: 'NORMAL',
  FOG: 'FOG',
  DANGER: 'DANGER',
};

const MODE_TARGETS = {
  NORMAL: {
    visibility: 88,
    truckSpeed: 22,
    excavatorSpeed: 4,
    loaderSpeed: 10,
  },
  FOG: {
    visibility: 28,
    truckSpeed: 16,
    excavatorSpeed: 3,
    loaderSpeed: 8,
  },
  DANGER: {
    visibility: 20,
    truckSpeed: 58,
    excavatorSpeed: 6,
    loaderSpeed: 14,
  },
};

const BOUNDS = {
  minLat: 18.5158,
  maxLat: 18.5242,
  minLng: 73.8508,
  maxLng: 73.8598,
};

const NUDGE = {
  speed: 4,
  visibility: 8,
  heading: 8,
};

const OBSTACLE_MODES = {
  NO_OBSTACLE: 'NO_OBSTACLE',
  OBSTACLE: 'OBSTACLE',
  APPROACHING: 'APPROACHING',
  CLEAR: 'CLEAR',
};

const APPROACHING_DISTANCES = [10, 8, 6, 4, 2, 1];
const DEMO_VEHICLE_ID = 'TRUCK-01';
const DEMO_OBSTACLE_TYPE = 'ROCK';

const fleet = [];
let mode = MODES.NORMAL;
let obstacleMode = OBSTACLE_MODES.NO_OBSTACLE;
let approachingIndex = 0;
let timer = null;
let intervalMs = config.simulatorIntervalMs;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapHeading(heading) {
  return ((heading % 360) + 360) % 360;
}

function nudge(current, target, maxDelta) {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) {
    return target;
  }
  return current + Math.sign(delta) * maxDelta;
}

function speedForVehicle(vehicle, targets) {
  if (vehicle.type === 'EXCAVATOR') {
    return targets.excavatorSpeed;
  }
  if (vehicle.type === 'LOADER') {
    return targets.loaderSpeed;
  }
  return targets.truckSpeed;
}

function distanceMeters(a, b) {
  const latM = (a.latitude - b.latitude) * 111320;
  const lngM = (a.longitude - b.longitude) * 111320 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(latM * latM + lngM * lngM);
}

function moveForward(vehicle, interval) {
  const meters = (vehicle.speed / 3.6) * (interval / 1000);
  const headingRad = (vehicle.heading * Math.PI) / 180;
  const latPerMeter = 1 / 111320;
  const lngPerMeter = 1 / (111320 * Math.cos((vehicle.latitude * Math.PI) / 180));

  vehicle.latitude += meters * Math.cos(headingRad) * latPerMeter;
  vehicle.longitude += meters * Math.sin(headingRad) * lngPerMeter;
}

function moveToward(vehicle, target, interval, maxStepMeters) {
  const meters = maxStepMeters || (vehicle.speed / 3.6) * (interval / 1000);
  const dist = distanceMeters(vehicle, target);

  if (dist <= 12) {
    return;
  }

  const ratio = Math.min(1, meters / dist);
  vehicle.latitude += (target.latitude - vehicle.latitude) * ratio;
  vehicle.longitude += (target.longitude - vehicle.longitude) * ratio;
  vehicle.heading = wrapHeading(
    (Math.atan2(target.longitude - vehicle.longitude, target.latitude - vehicle.latitude) * 180) / Math.PI
  );
}

function keepInBounds(vehicle) {
  vehicle.latitude = clamp(vehicle.latitude, BOUNDS.minLat, BOUNDS.maxLat);
  vehicle.longitude = clamp(vehicle.longitude, BOUNDS.minLng, BOUNDS.maxLng);
}

function ensureFleet() {
  if (fleet.length > 0) {
    return;
  }

  for (const vehicle of telemetryService.getAllVehicleStates()) {
    fleet.push({
      id: vehicle.id,
      type: vehicle.type,
      homeLat: vehicle.latitude,
      homeLng: vehicle.longitude,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      speed: Number(vehicle.speed) || 0,
      heading: Number(vehicle.heading) || 0,
      visibility: Number(vehicle.visibility) || 80,
    });
  }
}

function applyMode(vehicle, interval) {
  const targets = MODE_TARGETS[mode] || MODE_TARGETS.NORMAL;
  vehicle.speed = nudge(vehicle.speed, speedForVehicle(vehicle, targets), NUDGE.speed);
  vehicle.visibility = nudge(vehicle.visibility, targets.visibility, NUDGE.visibility);

  if (mode === MODES.DANGER && (vehicle.id === 'TRUCK-01' || vehicle.id === 'TRUCK-02')) {
    const other = fleet.find((item) => item.id === (vehicle.id === 'TRUCK-01' ? 'TRUCK-02' : 'TRUCK-01'));
    if (other) {
      moveToward(vehicle, other, interval, 90);
      keepInBounds(vehicle);
      return;
    }
  }

  if (mode === MODES.NORMAL) {
    const homeDist = distanceMeters(vehicle, { latitude: vehicle.homeLat, longitude: vehicle.homeLng });
    if (homeDist > 25) {
      moveToward(vehicle, { latitude: vehicle.homeLat, longitude: vehicle.homeLng }, interval);
      keepInBounds(vehicle);
      return;
    }
    vehicle.heading = wrapHeading(vehicle.heading + 2);
  } else {
    vehicle.heading = wrapHeading(vehicle.heading + (mode === MODES.FOG ? 1 : 4));
  }

  moveForward(vehicle, interval);
  keepInBounds(vehicle);
}

function emitVehicle(vehicle) {
  ingestTelemetry({
    vehicleId: vehicle.id,
    vehicleType: vehicle.type,
    latitude: Number(vehicle.latitude.toFixed(6)),
    longitude: Number(vehicle.longitude.toFixed(6)),
    speed: Math.round(vehicle.speed),
    heading: Math.round(wrapHeading(vehicle.heading)),
    visibility: Math.round(clamp(vehicle.visibility, 0, 100)),
  });
}

function emitObstacle(distance) {
  ingestObstacleTelemetry({
    vehicleId: DEMO_VEHICLE_ID,
    distance,
    obstacleType: DEMO_OBSTACLE_TYPE,
  });
}

function applyObstacleMode() {
  if (obstacleMode === OBSTACLE_MODES.NO_OBSTACLE) {
    return;
  }

  if (obstacleMode === OBSTACLE_MODES.OBSTACLE) {
    emitObstacle(10);
    return;
  }

  if (obstacleMode === OBSTACLE_MODES.APPROACHING) {
    const distance = APPROACHING_DISTANCES[Math.min(approachingIndex, APPROACHING_DISTANCES.length - 1)];
    emitObstacle(distance);
    if (approachingIndex < APPROACHING_DISTANCES.length - 1) {
      approachingIndex += 1;
    }
    return;
  }

  if (obstacleMode === OBSTACLE_MODES.CLEAR) {
    emitObstacle(12);
    obstacleMode = OBSTACLE_MODES.NO_OBSTACLE;
    approachingIndex = 0;
  }
}

function tick() {
  try {
    ensureFleet();

    for (const vehicle of fleet) {
      applyMode(vehicle, intervalMs);
      emitVehicle(vehicle);
    }

    applyObstacleMode();
  } catch (err) {
    logger.error({ err }, 'Simulator tick failed');
  }
}

function getSimulatorStatus() {
  return {
    enabled: config.simulatorEnabled,
    running: Boolean(timer),
    mode,
    obstacleMode,
    intervalMs,
  };
}

function startSimulator(requestedIntervalMs) {
  try {
    ensureFleet();

    if (timer) {
      return getSimulatorStatus();
    }

    intervalMs = Number(requestedIntervalMs) || config.simulatorIntervalMs;
    timer = setInterval(tick, intervalMs);
    logger.info({ mode, intervalMs }, 'Simulator started');
    return getSimulatorStatus();
  } catch (err) {
    logger.error({ err }, 'Failed to start simulator');
    return getSimulatorStatus();
  }
}

function stopSimulator() {
  try {
    if (!timer) {
      return getSimulatorStatus();
    }

    clearInterval(timer);
    timer = null;
    logger.info('Simulator stopped');
    return getSimulatorStatus();
  } catch (err) {
    logger.error({ err }, 'Failed to stop simulator');
    return getSimulatorStatus();
  }
}

function setSimulationMode(nextMode) {
  const normalized = String(nextMode || '').toUpperCase();

  if (!MODES[normalized]) {
    return {
      ok: false,
      error: 'Unsupported simulation mode',
      status: getSimulatorStatus(),
    };
  }

  mode = normalized;
  logger.info({ mode }, 'Simulation mode changed');

  return {
    ok: true,
    status: getSimulatorStatus(),
  };
}

function setObstacleMode(nextMode) {
  const normalized = String(nextMode || '').toUpperCase();

  if (!OBSTACLE_MODES[normalized]) {
    return {
      ok: false,
      error: 'Unsupported obstacle mode',
      status: getSimulatorStatus(),
    };
  }

  obstacleMode = normalized;

  if (obstacleMode === OBSTACLE_MODES.APPROACHING) {
    approachingIndex = 0;
  }

  if (obstacleMode === OBSTACLE_MODES.NO_OBSTACLE) {
    approachingIndex = 0;
  }

  logger.info({ obstacleMode }, 'Obstacle simulation mode changed');

  try {
    applyObstacleMode();
  } catch (err) {
    logger.error({ err }, 'Failed to apply obstacle simulation mode');
  }

  return {
    ok: true,
    status: getSimulatorStatus(),
  };
}

module.exports = {
  startSimulator,
  stopSimulator,
  getSimulatorStatus,
  setSimulationMode,
  setObstacleMode,
  MODES,
  OBSTACLE_MODES,
};
