const alertService = require('../services/alert.service');
const vehicleService = require('../services/vehicle.service');

function getAllAlerts(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: alertService.getAlertHistory(),
    });
  } catch (err) {
    next(err);
  }
}

function getActiveAlerts(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: alertService.getActiveAlerts(),
    });
  } catch (err) {
    next(err);
  }
}

function getAlertById(req, res, next) {
  try {
    const alert = alertService.getAlertById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
}

function getAlertsForVehicle(req, res, next) {
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
      data: alertService.getAlertsForVehicle(req.params.id),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllAlerts,
  getActiveAlerts,
  getAlertById,
  getAlertsForVehicle,
};
