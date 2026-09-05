const logger = require('../utils/logger');

const ALERT_LEVELS = new Set(['HIGH', 'CRITICAL']);

const ALERT_MESSAGES = {
  OVERSPEED: 'Vehicle is exceeding the zone speed limit',
  LOW_VISIBILITY: 'Visibility is dangerously low',
  PROXIMITY: 'Vehicle is dangerously close to another vehicle',
  COMBINED_RISK: 'Multiple safety risks detected',
};

const activeByVehicle = new Map();
const alertHistory = [];
let alertSequence = 0;

function nextAlertId() {
  alertSequence += 1;
  return `ALERT-${String(alertSequence).padStart(3, '0')}`;
}

function cloneAlert(alert) {
  return {
    ...alert,
    factors: Array.isArray(alert.factors) ? alert.factors.map((factor) => ({ ...factor })) : [],
  };
}

function deriveAlertType(factors) {
  const types = (factors || [])
    .map((factor) => factor && factor.type)
    .filter((type) => type === 'OVERSPEED' || type === 'LOW_VISIBILITY' || type === 'PROXIMITY');

  if (types.length > 1) {
    return 'COMBINED_RISK';
  }

  if (types.length === 1) {
    return types[0];
  }

  return 'COMBINED_RISK';
}

function buildAlertMessage(type) {
  return ALERT_MESSAGES[type] || 'Critical safety risk detected';
}

function requiresAlert(riskResult) {
  return Boolean(riskResult && ALERT_LEVELS.has(riskResult.riskLevel));
}

function createAlert(vehicleId, riskResult) {
  const type = deriveAlertType(riskResult.factors);
  const createdAt = new Date().toISOString();

  const alert = {
    alertId: nextAlertId(),
    vehicleId,
    severity: riskResult.riskLevel,
    riskScore: riskResult.riskScore,
    type,
    message: buildAlertMessage(type),
    factors: Array.isArray(riskResult.factors) ? riskResult.factors.map((factor) => ({ ...factor })) : [],
    zoneId: riskResult.zoneId || null,
    createdAt,
    status: 'ACTIVE',
  };

  activeByVehicle.set(vehicleId, alert);
  alertHistory.push(alert);

  logger.info({ alertId: alert.alertId, vehicleId, type, severity: alert.severity }, 'Safety alert created');

  return cloneAlert(alert);
}

function updateActiveAlert(alert, riskResult) {
  const type = deriveAlertType(riskResult.factors);

  alert.severity = riskResult.riskLevel;
  alert.riskScore = riskResult.riskScore;
  alert.type = type;
  alert.message = buildAlertMessage(type);
  alert.factors = Array.isArray(riskResult.factors) ? riskResult.factors.map((factor) => ({ ...factor })) : [];
  alert.zoneId = riskResult.zoneId || null;

  return cloneAlert(alert);
}

function resolveAlert(alert) {
  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date().toISOString();
  activeByVehicle.delete(alert.vehicleId);

  logger.info({ alertId: alert.alertId, vehicleId: alert.vehicleId }, 'Safety alert resolved');

  return {
    alertId: alert.alertId,
    vehicleId: alert.vehicleId,
    status: 'RESOLVED',
    resolvedAt: alert.resolvedAt,
  };
}

function evaluateRisk(vehicle, riskResult) {
  try {
    const vehicleId = vehicle && (vehicle.id || vehicle.vehicleId);

    if (!vehicleId || !riskResult) {
      return { created: false, updated: false, resolved: false, alert: null };
    }

    const existing = activeByVehicle.get(vehicleId);

    if (requiresAlert(riskResult)) {
      if (existing && existing.status === 'ACTIVE') {
        const alert = updateActiveAlert(existing, riskResult);
        return { created: false, updated: true, resolved: false, alert };
      }

      const alert = createAlert(vehicleId, riskResult);
      return { created: true, updated: false, resolved: false, alert };
    }

    if (existing && existing.status === 'ACTIVE') {
      const resolved = resolveAlert(existing);
      return { created: false, updated: false, resolved: true, alert: resolved };
    }

    return { created: false, updated: false, resolved: false, alert: null };
  } catch (err) {
    logger.error({ err }, 'Alert evaluation failed');
    return { created: false, updated: false, resolved: false, alert: null };
  }
}

function getActiveAlerts() {
  return Array.from(activeByVehicle.values()).map(cloneAlert);
}

function getAlertHistory() {
  return alertHistory.map(cloneAlert);
}

function getAlertsForVehicle(vehicleId) {
  return alertHistory
    .filter((alert) => alert.vehicleId === vehicleId)
    .map(cloneAlert);
}

function getAlertById(alertId) {
  const alert = alertHistory.find((item) => item.alertId === alertId);
  return alert ? cloneAlert(alert) : null;
}

function resetAlertState() {
  activeByVehicle.clear();
  alertHistory.length = 0;
  alertSequence = 0;
}

module.exports = {
  evaluateRisk,
  getActiveAlerts,
  getAlertHistory,
  getAlertsForVehicle,
  getAlertById,
  resetAlertState,
};
