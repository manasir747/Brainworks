const express = require('express');
const simulatorController = require('../controllers/simulator.controller');

const router = express.Router();

router.get('/simulator/status', simulatorController.getStatus);
router.post('/simulator/start', simulatorController.start);
router.post('/simulator/stop', simulatorController.stop);
router.post('/simulator/mode', simulatorController.setMode);

module.exports = router;
