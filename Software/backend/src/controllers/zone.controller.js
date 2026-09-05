const zoneService = require('../services/zone.service');

function getAllZones(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: zoneService.getAllZones(),
    });
  } catch (err) {
    next(err);
  }
}

function getZoneById(req, res, next) {
  try {
    const zone = zoneService.getZoneById(req.params.id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'Zone not found',
      });
    }

    res.status(200).json({
      success: true,
      data: zone,
    });
  } catch (err) {
    next(err);
  }
}

function getZoneByLocation(req, res, next) {
  try {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;

    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === '' ||
      longitude === '' ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
      });
    }

    const zone = zoneService.getZoneForLocation(latitude, longitude);

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'No zone found for this location',
      });
    }

    res.status(200).json({
      success: true,
      data: zone,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllZones,
  getZoneById,
  getZoneByLocation,
};
