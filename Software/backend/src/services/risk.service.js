const RISK_WEIGHTS = {
  SPEED: 0.4,
  VISIBILITY: 0.35,
  PROXIMITY: 0.25,
};

// Used only when Zone Service returns no zone. Not a guessed mine zone.
const DEFAULT_SPEED_LIMIT = 30;

const RISK_LEVELS = {
  LOW: { min: 0, max: 24, label: 'LOW' },
  MEDIUM: { min: 25, max: 49, label: 'MEDIUM' },
  HIGH: { min: 50, max: 74, label: 'HIGH' },
  CRITICAL: { min: 75, max: 100, label: 'CRITICAL' },
};

const VISIBILITY_BANDS = {
  EXCELLENT: 80,
  GOOD: 60,
  MODERATE: 40,
  POOR: 20,
};

const PROXIMITY_METERS = {
  SAFE: 100,
  MODERATE: 50,
  HIGH: 20,
};

const EARTH_RADIUS_METERS = 6371000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(x, x1, x2, y1, y2) {
  if (x2 === x1) {
    return y1;
  }

  const t = (x - x1) / (x2 - x1);
  return y1 + (y2 - y1) * t;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

function getSpeedLimit(zone) {
  const limit = zone && Number(zone.speedLimit);
  return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_SPEED_LIMIT;
}

function getVehicleId(vehicle) {
  return vehicle && (vehicle.id || vehicle.vehicleId);
}

function hasCoordinates(vehicle) {
  return (
    vehicle &&
    Number.isFinite(Number(vehicle.latitude)) &&
    Number.isFinite(Number(vehicle.longitude))
  );
}

function calculateSpeedRisk(speed, speedLimit) {
  const currentSpeed = Number(speed) || 0;

  if (currentSpeed <= speedLimit) {
    return 0;
  }

  const overspeedRatio = (currentSpeed - speedLimit) / speedLimit;
  return clamp(overspeedRatio * 100, 0, 100);
}

function calculateVisibilityRisk(visibility) {
  const vis = clamp(Number(visibility), 0, 100);

  if (!Number.isFinite(Number(visibility))) {
    return 0;
  }

  if (vis >= VISIBILITY_BANDS.EXCELLENT) {
    return 0;
  }

  if (vis >= VISIBILITY_BANDS.GOOD) {
    return lerp(vis, 60, 79, 30, 5);
  }

  if (vis >= VISIBILITY_BANDS.MODERATE) {
    return lerp(vis, 40, 59, 55, 31);
  }

  if (vis >= VISIBILITY_BANDS.POOR) {
    return lerp(vis, 20, 39, 80, 56);
  }

  return lerp(vis, 0, 19, 100, 81);
}

function getClosestDistanceMeters(vehicle, nearbyVehicles) {
  let closest = Infinity;
  const vehicleId = getVehicleId(vehicle);

  for (const other of nearbyVehicles || []) {
    if (getVehicleId(other) && vehicleId && getVehicleId(other) === vehicleId) {
      continue;
    }

    if (!hasCoordinates(vehicle) || !hasCoordinates(other)) {
      continue;
    }

    const distance = haversineMeters(
      Number(vehicle.latitude),
      Number(vehicle.longitude),
      Number(other.latitude),
      Number(other.longitude)
    );

    if (distance < closest) {
      closest = distance;
    }
  }

  return closest;
}

function calculateProximityRisk(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters > PROXIMITY_METERS.SAFE) {
    return 0;
  }

  if (distanceMeters >= PROXIMITY_METERS.MODERATE) {
    return lerp(distanceMeters, 50, 100, 40, 5);
  }

  if (distanceMeters >= PROXIMITY_METERS.HIGH) {
    return lerp(distanceMeters, 20, 50, 75, 41);
  }

  return lerp(distanceMeters, 0, 20, 100, 80);
}

function toRiskLevel(riskScore) {
  if (riskScore >= RISK_LEVELS.CRITICAL.min) {
    return RISK_LEVELS.CRITICAL.label;
  }

  if (riskScore >= RISK_LEVELS.HIGH.min) {
    return RISK_LEVELS.HIGH.label;
  }

  if (riskScore >= RISK_LEVELS.MEDIUM.min) {
    return RISK_LEVELS.MEDIUM.label;
  }

  return RISK_LEVELS.LOW.label;
}

function calculateObstacleRisk(obstacle) {
  if (!obstacle || !obstacle.obstacleDetected) {
    return 0;
  }

  if (obstacle.severity === 'CRITICAL') {
    return 55;
  }

  if (obstacle.severity === 'WARNING') {
    return 25;
  }

  if (obstacle.severity === 'DETECTED') {
    return 10;
  }

  return 0;
}

function buildFactors(speedRisk, visibilityRisk, proximityRisk, obstacleRisk, speed, speedLimit, visibility, closestDistance, obstacle) {
  const factors = [];

  if (speedRisk > 0) {
    factors.push({
      type: 'OVERSPEED',
      value: Number(speed),
      message: 'Vehicle is exceeding the zone speed limit',
    });
  }

  if (visibilityRisk > 0) {
    factors.push({
      type: 'LOW_VISIBILITY',
      value: Number(visibility),
      message: visibility < VISIBILITY_BANDS.MODERATE
        ? 'Visibility is critically low'
        : 'Visibility is reduced',
    });
  }

  if (proximityRisk > 0) {
    factors.push({
      type: 'PROXIMITY',
      value: Math.round(closestDistance),
      message: closestDistance < PROXIMITY_METERS.HIGH
        ? 'Another vehicle is dangerously close'
        : 'Another vehicle is nearby',
    });
  }

  if (obstacleRisk > 0) {
    factors.push({
      type: 'OBSTACLE_RISK',
      value: obstacle && obstacle.distance != null ? Number(obstacle.distance) : obstacleRisk,
      message: obstacle && obstacle.severity === 'CRITICAL'
        ? 'Immediate collision risk from a nearby obstacle'
        : 'Obstacle detected ahead of the vehicle',
    });
  }

  return factors;
}

function calculateRisk(vehicle, nearbyVehicles, zone, obstacle) {
  const current = vehicle || {};
  const speedLimit = getSpeedLimit(zone);
  const speed = Number(current.speed) || 0;
  const visibility = Number(current.visibility);
  const closestDistance = getClosestDistanceMeters(current, nearbyVehicles);

  const speedRisk = calculateSpeedRisk(speed, speedLimit);
  const visibilityRisk = calculateVisibilityRisk(visibility);
  const proximityRisk = calculateProximityRisk(closestDistance);
  const obstacleRisk = calculateObstacleRisk(obstacle);

  const riskScore = clamp(
    Math.round(
      speedRisk * RISK_WEIGHTS.SPEED +
        visibilityRisk * RISK_WEIGHTS.VISIBILITY +
        proximityRisk * RISK_WEIGHTS.PROXIMITY +
        obstacleRisk
    ),
    0,
    100
  );

  return {
    riskScore,
    riskLevel: toRiskLevel(riskScore),
    zoneId: zone && zone.id ? zone.id : null,
    speedLimit,
    factors: buildFactors(
      speedRisk,
      visibilityRisk,
      proximityRisk,
      obstacleRisk,
      speed,
      speedLimit,
      visibility,
      closestDistance,
      obstacle
    ),
  };
}

module.exports = {
  calculateRisk,
  RISK_WEIGHTS,
  DEFAULT_SPEED_LIMIT,
  RISK_LEVELS,
  VISIBILITY_BANDS,
  PROXIMITY_METERS,
};
