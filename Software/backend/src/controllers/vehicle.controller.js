const vehicleService = require('../services/vehicle.service');

function getAllVehicles(req, res, next) {
  try {
    const vehicles = vehicleService.getAllVehicles();

    res.status(200).json({
      success: true,
      data: vehicles,
    });
  } catch (err) {
    next(err);
  }
}

function getVehicleById(req, res, next) {
  try {
    const vehicle = vehicleService.getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllVehicles,
  getVehicleById,
};
