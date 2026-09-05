const express = require('express');
const zoneController = require('../controllers/zone.controller');

const router = express.Router();

router.get('/zones/location', zoneController.getZoneByLocation);
router.get('/zones/:id', zoneController.getZoneById);
router.get('/zones', zoneController.getAllZones);

module.exports = router;
