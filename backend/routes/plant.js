const express = require('express');
const router = express.Router();
const SensorReading = require('../models/SensorReading');
const {
  getDashboardSummary,
  analyzeConditions,
  classifyPlantType,
  getIdealRanges,
  getHealthScore,
  getAlerts,
  getActuatorRecommendations,
  getHistoricalTrends,
  PLANT_TYPES,
} = require('../utils/plantAnalysis');

// ============================================================
// GET /api/plant/summary
// Main dashboard endpoint — everything in one call
// Frontend: call on load + on each socket 'sensor_update' event
// ============================================================
router.get('/summary', async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });

    const summary = getDashboardSummary(latest.toObject());
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/health
// Just the health score — for the big gauge widget
// ============================================================
router.get('/health', async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(getHealthScore(latest.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/conditions
// Detailed condition analysis per sensor
// ============================================================
router.get('/conditions', async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(analyzeConditions(latest.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/classify
// Plant type match scores — for category cards
// ============================================================
router.get('/classify', async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(classifyPlantType(latest.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/alerts
// Active alerts — for notification bell / alert panel
// ============================================================
router.get('/alerts', async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(getAlerts(latest.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/recommendations
// Actuator recommendations — what should pump/servo do now
// ============================================================
router.get('/recommendations', async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(getActuatorRecommendations(latest.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/trends?hours=24
// Historical trends for line charts
// ============================================================
router.get('/trends', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const readings = await SensorReading
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(500);

    res.json(getHistoricalTrends(readings.map(r => r.toObject())));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/plant/ideal-ranges/:plantType
// Ideal ranges for a given plant type
// e.g. /api/plant/ideal-ranges/Mesophytes
// ============================================================
router.get('/ideal-ranges/:plantType', (req, res) => {
  const ranges = getIdealRanges(req.params.plantType);
  res.json(ranges);
});

// ============================================================
// GET /api/plant/types
// List all plant type definitions — for category selector
// ============================================================
router.get('/types', (req, res) => {
  res.json(Object.entries(PLANT_TYPES).map(([key, def]) => ({
    key,
    label:       def.label,
    description: def.description,
    icon:        def.icon,
    ranges: {
      soil_moisture: def.soil_moisture,
      temperature:   def.temperature,
      humidity:      def.humidity,
    }
  })));
});

module.exports = router;
