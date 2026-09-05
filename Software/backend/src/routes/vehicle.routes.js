const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');

const router = express.Router();

router.get('/vehicles', vehicleController.getAllVehicles);
router.get('/vehicles/:id', vehicleController.getVehicleById);

module.exports = router;
