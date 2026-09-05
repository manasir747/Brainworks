const express = require('express');
const simulatorController = require('../controllers/simulator.controller');

const router = express.Router();

router.get('/simulator/status', simulatorController.getStatus);
router.post('/simulator/start', simulatorController.start);
router.post('/simulator/stop', simulatorController.stop);
router.post('/simulator/mode', simulatorController.setMode);
router.post('/simulator/obstacle-mode', simulatorController.setObstacleMode);

module.exports = router;
