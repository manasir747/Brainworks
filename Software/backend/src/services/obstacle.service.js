const logger = require('../utils/logger');
const telemetryService = require('./telemetry.service');

const OBSTACLE_TYPES = new Set(['ROCK', 'VEHICLE', 'PERSON', 'DEBRIS', 'UNKNOWN']);

const DISTANCE_THRESHOLDS = {
  CLEAR: 10,
  WARNING: 5,
  CRITICAL: 2,
};

const obstacleStates = new Map();

function cloneState(state) {
  return state ? { ...state } : null;
}

function classifyDistance(distance) {
  if (distance > DISTANCE_THRESHOLDS.CLEAR) {
    return { severity: 'SAFE', eventType: null };
  }

  if (distance > DISTANCE_THRESHOLDS.WARNING) {
    return { severity: 'DETECTED', eventType: 'OBSTACLE_DETECTED' };
  }

  if (distance > DISTANCE_THRESHOLDS.CRITICAL) {
    return { severity: 'WARNING', eventType: 'OBSTACLE_WARNING' };
  }

  return { severity: 'CRITICAL', eventType: 'CRITICAL_OBSTACLE' };
}

function emptyState(vehicleId) {
  return {
    vehicleId,
    obstacleDetected: false,
    distance: null,
    obstacleType: null,
    severity: 'SAFE',
  };
}

function processObstacleTelemetry(data) {
  try {
    const vehicleId = data && data.vehicleId;
    const vehicle = vehicleId ? telemetryService.getVehicleState(vehicleId) : null;

    if (!vehicleId || !vehicle) {
      return {
        ok: false,
        error: 'Unknown vehicle',
      };
    }

    const distance = Number(data.distance);
    if (!Number.isFinite(distance) || distance < 0) {
      return {
        ok: false,
        error: 'Invalid obstacle data',
      };
    }

    const rawType = data.obstacleType ? String(data.obstacleType).toUpperCase() : 'UNKNOWN';
    const obstacleType = OBSTACLE_TYPES.has(rawType) ? rawType : 'UNKNOWN';
    const classification = classifyDistance(distance);
    const previous = obstacleStates.get(vehicleId) || emptyState(vehicleId);

    if (classification.severity === 'SAFE') {
      const next = emptyState(vehicleId);
      obstacleStates.set(vehicleId, next);

      if (previous.obstacleDetected) {
        return {
          ok: true,
          event: 'OBSTACLE_CLEARED',
          data: { vehicleId },
          state: cloneState(next),
        };
      }

      return {
        ok: true,
        event: null,
        state: cloneState(next),
      };
    }

    const next = {
      vehicleId,
      obstacleDetected: true,
      distance,
      obstacleType,
      severity: classification.severity,
    };

    obstacleStates.set(vehicleId, next);

    if (previous.severity === classification.severity && previous.obstacleDetected) {
      return {
        ok: true,
        event: null,
        state: cloneState(next),
      };
    }

    return {
      ok: true,
      event: classification.eventType,
      data: {
        vehicleId,
        distance,
        obstacleType,
        severity: classification.severity,
      },
      state: cloneState(next),
    };
  } catch (err) {
    logger.error({ err }, 'Obstacle processing failed');
    return {
      ok: false,
      error: 'Obstacle processing failed',
    };
  }
}

function getObstacleState(vehicleId) {
  return cloneState(obstacleStates.get(vehicleId) || emptyState(vehicleId));
}

function resetObstacleState() {
  obstacleStates.clear();
}

module.exports = {
  processObstacleTelemetry,
  getObstacleState,
  resetObstacleState,
  DISTANCE_THRESHOLDS,
};
