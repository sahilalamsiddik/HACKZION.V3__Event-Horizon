const express = require('express');
const router = express.Router();
const SensorReading = require('../models/SensorReading');

// POST /api/sensor-data
// Called by ESP8266 every 10 seconds
router.post('/', async (req, res) => {
  try {
    const reading = new SensorReading({
      device_id:             req.body.device_id || 'plant-esp-01',
      temperature:           req.body.temperature,
      humidity:              req.body.humidity,
      soil_moisture_raw:     req.body.soil_moisture_raw,
      soil_moisture_percent: req.body.soil_moisture_percent,
      pump_on:               req.body.pump_on || false,
      servo_angle:           req.body.servo_angle || 0,
      manual_mode:           req.body.manual_mode || false,
    });

    await reading.save();

    // Push to all connected frontends via Socket.IO immediately
    const io = req.app.get('io');
    io.emit('sensor_update', reading);

    res.json({ status: 'saved', id: reading._id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data/latest
// Frontend calls this on page load to get current state
router.get('/latest', async (req, res) => {
  try {
    const reading = await SensorReading.findOne().sort({ timestamp: -1 });
    if (!reading) return res.status(404).json({ error: 'No data yet' });
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data/history?hours=24&limit=100
// Frontend calls this for chart data
router.get('/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const limit = parseInt(req.query.limit) || 200;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await SensorReading
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(limit);

    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
