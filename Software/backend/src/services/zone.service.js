const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const ZONES_PATH = path.join(__dirname, '../data/zones.json');
const zones = [];

function cloneZone(zone) {
  return {
    ...zone,
    polygon: Array.isArray(zone.polygon)
      ? zone.polygon.map((point) => ({ ...point }))
      : [],
  };
}

function loadZones() {
  const raw = fs.readFileSync(ZONES_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  zones.length = 0;

  for (const zone of parsed) {
    zones.push(cloneZone(zone));
  }

  logger.info({ count: zones.length }, 'Zone data loaded');
}

function isValidCoordinate(value) {
  return Number.isFinite(Number(value));
}

function pointInPolygon(latitude, longitude, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];

    if (
      !current ||
      !previous ||
      !isValidCoordinate(current.latitude) ||
      !isValidCoordinate(current.longitude) ||
      !isValidCoordinate(previous.latitude) ||
      !isValidCoordinate(previous.longitude)
    ) {
      continue;
    }

    const yi = Number(current.latitude);
    const xi = Number(current.longitude);
    const yj = Number(previous.latitude);
    const xj = Number(previous.longitude);
    const intersects =
      (yi > latitude) !== (yj > latitude) &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getAllZones() {
  return zones.map(cloneZone);
}

function getZoneById(id) {
  const zone = zones.find((item) => item.id === id);
  return zone ? cloneZone(zone) : null;
}

function getZoneForLocation(latitude, longitude) {
  if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  for (const zone of zones) {
    if (pointInPolygon(lat, lng, zone.polygon)) {
      return cloneZone(zone);
    }
  }

  return null;
}

function getVehicleZone(vehicle) {
  if (!vehicle) {
    return null;
  }

  return getZoneForLocation(vehicle.latitude, vehicle.longitude);
}

loadZones();

module.exports = {
  getAllZones,
  getZoneById,
  getZoneForLocation,
  getVehicleZone,
};
