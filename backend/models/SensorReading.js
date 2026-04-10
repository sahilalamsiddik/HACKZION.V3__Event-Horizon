// ==========================================
// models/SensorReading.js
// ==========================================
const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema({
  device_id:             { type: String, default: 'plant-esp-01' },
  temperature:           { type: Number, required: true },   // °C
  humidity:              { type: Number, required: true },   // %
  soil_moisture_raw:     { type: Number, required: true },   // 0-1023
  soil_moisture_percent: { type: Number, required: true },   // 0-100%
  pump_on:               { type: Boolean, default: false },
  servo_angle:           { type: Number, default: 0 },
  manual_mode:           { type: Boolean, default: false },
  timestamp:             { type: Date, default: Date.now }
});

// Index for efficient time-based queries
SensorReadingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);
