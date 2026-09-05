const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const alertController = require('../controllers/alert.controller');

const router = express.Router();

router.get('/vehicles', vehicleController.getAllVehicles);
router.get('/vehicles/:id/alerts', alertController.getAlertsForVehicle);
router.get('/vehicles/:id', vehicleController.getVehicleById);

module.exports = router;
