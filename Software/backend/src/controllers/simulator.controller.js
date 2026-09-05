const simulator = require('../services/telemetry.simulator');

function getStatus(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: simulator.getSimulatorStatus(),
    });
  } catch (err) {
    next(err);
  }
}

function start(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: simulator.startSimulator(),
    });
  } catch (err) {
    next(err);
  }
}

function stop(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: simulator.stopSimulator(),
    });
  } catch (err) {
    next(err);
  }
}

function setMode(req, res, next) {
  try {
    const result = simulator.setSimulationMode(req.body && req.body.mode);

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      data: result.status,
    });
  } catch (err) {
    next(err);
  }
}

function setObstacleMode(req, res, next) {
  try {
    const result = simulator.setObstacleMode(req.body && req.body.mode);

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      data: result.status,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  start,
  stop,
  setMode,
  setObstacleMode,
};
