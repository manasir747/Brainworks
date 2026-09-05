const fs = require('fs');
const path = require('path');

const VEHICLES_PATH = path.join(__dirname, '../data/vehicles.json');

function readVehicles() {
  const raw = fs.readFileSync(VEHICLES_PATH, 'utf8');
  return JSON.parse(raw);
}

function getAllVehicles() {
  return readVehicles();
}

function getVehicleById(id) {
  const vehicles = readVehicles();
  return vehicles.find((vehicle) => vehicle.id === id) || null;
}

module.exports = {
  getAllVehicles,
  getVehicleById,
};
