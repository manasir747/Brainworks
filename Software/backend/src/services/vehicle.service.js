const telemetryService = require('./telemetry.service');

function getAllVehicles() {
  return telemetryService.getAllVehicleStates();
}

function getVehicleById(id) {
  return telemetryService.getVehicleState(id);
}

module.exports = {
  getAllVehicles,
  getVehicleById,
};
