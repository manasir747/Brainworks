const obstacleService = require('../services/obstacle.service');
const vehicleService = require('../services/vehicle.service');

function getVehicleObstacle(req, res, next) {
  try {
    const vehicle = vehicleService.getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const state = obstacleService.getObstacleState(req.params.id);

    if (!state.obstacleDetected) {
      return res.status(200).json({
        success: true,
        data: {
          vehicleId: state.vehicleId,
          obstacleDetected: false,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        vehicleId: state.vehicleId,
        obstacleDetected: true,
        distance: state.distance,
        obstacleType: state.obstacleType,
        severity: state.severity,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVehicleObstacle,
};
