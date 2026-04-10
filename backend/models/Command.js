const mongoose = require('mongoose');

// Commands queued from the frontend for the ESP8266 to pick up
const CommandSchema = new mongoose.Schema({
  command:   { type: String, required: true },
  // e.g. 'pump_on' | 'pump_off' | 'servo' | 'manual_on' | 'manual_off'
  value:     { type: Number, default: 0 },  // e.g. servo angle
  executed:  { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  executed_at: { type: Date }
});

CommandSchema.index({ executed: 1, created_at: -1 });

module.exports = mongoose.model('Command', CommandSchema);
