const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const zoneService = require('./zone.service');

const VEHICLES_PATH = path.join(__dirname, '../data/vehicles.json');
const vehicleStates = new Map();

function initialize() {
  const raw = fs.readFileSync(VEHICLES_PATH, 'utf8');
  const vehicles = JSON.parse(raw);

  vehicleStates.clear();

  for (const vehicle of vehicles) {
    vehicleStates.set(vehicle.id, withDetectedZone({ ...vehicle }));
  }

  logger.info({ count: vehicleStates.size }, 'In-memory vehicle state initialized');
}

function cloneVehicle(vehicle) {
  return { ...vehicle };
}

function withDetectedZone(vehicle) {
  try {
    const zone = zoneService.getVehicleZone(vehicle);
    return {
      ...vehicle,
      zoneId: zone ? zone.id : null,
    };
  } catch (err) {
    logger.error({ err }, 'Zone detection failed');
    return {
      ...vehicle,
      zoneId: null,
    };
  }
}

function processTelemetry(data) {
  const vehicleId = data && data.vehicleId;
  const existing = vehicleId ? vehicleStates.get(vehicleId) : null;

  if (!existing) {
    return {
      ok: false,
      error: 'Unknown vehicle',
    };
  }

  const lastUpdated = new Date().toISOString();
  const updated = withDetectedZone({
    ...existing,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    heading: data.heading,
    visibility: data.visibility,
    lastUpdated,
  });

  vehicleStates.set(vehicleId, updated);

  logger.debug({ vehicleId, lastUpdated }, 'Vehicle telemetry updated');

  return {
    ok: true,
    state: cloneVehicle(updated),
    timestamp: lastUpdated,
  };
}

function getVehicleState(vehicleId) {
  const vehicle = vehicleStates.get(vehicleId);
  return vehicle ? cloneVehicle(vehicle) : null;
}

function getAllVehicleStates() {
  return Array.from(vehicleStates.values()).map(cloneVehicle);
}

initialize();

module.exports = {
  initialize,
  processTelemetry,
  getVehicleState,
  getAllVehicleStates,
};
