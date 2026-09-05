const express = require('express');
const alertController = require('../controllers/alert.controller');

const router = express.Router();

router.get('/alerts/active', alertController.getActiveAlerts);
router.get('/alerts/:id', alertController.getAlertById);
router.get('/alerts', alertController.getAllAlerts);

module.exports = router;
