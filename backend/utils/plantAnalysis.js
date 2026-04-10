/**
 * ============================================================
 * PLANT INTELLIGENCE ENGINE
 * utils/plantAnalysis.js
 * ============================================================
 *
 * This module does all the "thinking" for the frontend.
 * Call these functions from your routes and pass the results
 * to the frontend. The frontend AI can build UI around each
 * exported function name.
 *
 * FUNCTION INDEX (tell your frontend AI these exist):
 *  - analyzeConditions(reading)
 *  - classifyPlantType(reading)
 *  - getIdealRanges(plantType)
 *  - getHealthScore(reading)
 *  - getAlerts(reading)
 *  - getActuatorRecommendations(reading)
 *  - getHistoricalTrends(readings[])
 *  - getDashboardSummary(reading)
 * ============================================================
 */

// ---- PLANT TYPE DEFINITIONS ----
const PLANT_TYPES = {
  Hydrophytes: {
    label: 'Hydrophytes',
    description: 'Water-loving plants (water lilies, lotus)',
    icon: 'droplet',
    soil_moisture: { min: 80, max: 100 },
    temperature:   { min: 15, max: 30 },
    humidity:      { min: 70, max: 100 },
  },
  Mesophytes: {
    label: 'Mesophytes',
    description: 'Moderate condition plants (roses, tomatoes)',
    icon: 'leaf',
    soil_moisture: { min: 40, max: 70 },
    temperature:   { min: 15, max: 30 },
    humidity:      { min: 40, max: 70 },
  },
  Xerophytes: {
    label: 'Xerophytes',
    description: 'Drought-tolerant plants (cacti, succulents)',
    icon: 'sun',
    soil_moisture: { min: 5, max: 30 },
    temperature:   { min: 20, max: 45 },
    humidity:      { min: 10, max: 40 },
  },
  TropicalPlants: {
    label: 'Tropical Plants',
    description: 'High humidity tropical plants (monstera, ferns)',
    icon: 'tree-palm',
    soil_moisture: { min: 50, max: 80 },
    temperature:   { min: 22, max: 38 },
    humidity:      { min: 60, max: 90 },
  },
  TemperatePlants: {
    label: 'Temperate Plants',
    description: 'Cool climate plants (lavender, herbs)',
    icon: 'cloud',
    soil_moisture: { min: 30, max: 60 },
    temperature:   { min: 10, max: 25 },
    humidity:      { min: 40, max: 65 },
  },
  ArcticAlpinePlants: {
    label: 'Arctic/Alpine Plants',
    description: 'Cold climate plants (edelweiss, arctic poppy)',
    icon: 'snowflake',
    soil_moisture: { min: 20, max: 50 },
    temperature:   { min: -5, max: 15 },
    humidity:      { min: 50, max: 80 },
  },
};

// ---- HELPER ----
function inRange(value, min, max) {
  return value >= min && value <= max;
}

function scoreParam(value, min, max) {
  // Returns 0-100 score — 100 = perfect, drops off outside range
  if (inRange(value, min, max)) return 100;
  const distanceLow  = Math.max(0, min - value);
  const distanceHigh = Math.max(0, value - max);
  const distance = Math.max(distanceLow, distanceHigh);
  const range = max - min;
  return Math.max(0, 100 - (distance / range) * 100);
}

// ============================================================
// 1. analyzeConditions(reading)
// ============================================================
// Returns a full analysis object with status for each sensor.
// Frontend uses this to color-code dashboard cards.
//
// reading: { temperature, humidity, soil_moisture_percent }
//
// Returns:
// {
//   temperature:    { value, status, label, unit }
//   humidity:       { value, status, label, unit }
//   soil_moisture:  { value, status, label, unit }
// }
// status: 'optimal' | 'warning' | 'critical'
//
function analyzeConditions(reading) {
  const { temperature, humidity, soil_moisture_percent } = reading;

  function getStatus(value, optimal_min, optimal_max, warn_range = 10) {
    if (inRange(value, optimal_min, optimal_max)) return 'optimal';
    const distLow  = optimal_min - value;
    const distHigh = value - optimal_max;
    const dist = Math.max(distLow, distHigh);
    return dist <= warn_range ? 'warning' : 'critical';
  }

  return {
    temperature: {
      value: temperature,
      unit: '°C',
      status: getStatus(temperature, 18, 35, 8),
      label: temperature > 35 ? 'Too Hot' : temperature < 18 ? 'Too Cold' : 'Good',
    },
    humidity: {
      value: humidity,
      unit: '%',
      status: getStatus(humidity, 40, 80, 15),
      label: humidity > 80 ? 'Too Humid' : humidity < 40 ? 'Too Dry' : 'Good',
    },
    soil_moisture: {
      value: soil_moisture_percent,
      unit: '%',
      status: getStatus(soil_moisture_percent, 30, 80, 15),
      label: soil_moisture_percent < 20 ? 'Very Dry' : soil_moisture_percent < 30 ? 'Dry' : soil_moisture_percent > 80 ? 'Waterlogged' : 'Good',
    },
  };
}

// ============================================================
// 2. classifyPlantType(reading)
// ============================================================
// Looks at current sensor data and ranks which plant category
// fits best. Returns a sorted list with scores.
// Frontend shows a category card grid with match percentages.
//
// Returns:
// [
//   { type, label, description, icon, score, is_best_match, ranges },
//   ...
// ]
//
function classifyPlantType(reading) {
  const { temperature, humidity, soil_moisture_percent } = reading;

  const results = Object.entries(PLANT_TYPES).map(([key, def]) => {
    const tempScore  = scoreParam(temperature,          def.temperature.min,   def.temperature.max);
    const humScore   = scoreParam(humidity,             def.humidity.min,      def.humidity.max);
    const soilScore  = scoreParam(soil_moisture_percent, def.soil_moisture.min, def.soil_moisture.max);

    const score = Math.round((tempScore * 0.35 + humScore * 0.3 + soilScore * 0.35));

    return {
      type:         key,
      label:        def.label,
      description:  def.description,
      icon:         def.icon,
      score,
      ranges: {
        temperature: def.temperature,
        humidity:    def.humidity,
        soil_moisture: def.soil_moisture,
      }
    };
  });

  results.sort((a, b) => b.score - a.score);
  results[0].is_best_match = true;
  for (let i = 1; i < results.length; i++) results[i].is_best_match = false;

  return results;
}

// ============================================================
// 3. getIdealRanges(plantType)
// ============================================================
// Given a plant type key, returns its ideal sensor ranges.
// Frontend can show these as reference bands on charts.
//
// plantType: 'Mesophytes' | 'Hydrophytes' | etc.
//
// Returns: { soil_moisture, temperature, humidity }
//
function getIdealRanges(plantType) {
  return PLANT_TYPES[plantType] || PLANT_TYPES['Mesophytes'];
}

// ============================================================
// 4. getHealthScore(reading)
// ============================================================
// Single 0-100 overall plant health score.
// Frontend: big gauge/circle on the main dashboard.
//
// Returns:
// {
//   score: 0-100,
//   grade: 'A' | 'B' | 'C' | 'D' | 'F',
//   label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical',
//   color: 'green' | 'yellow' | 'orange' | 'red',
// }
//
function getHealthScore(reading) {
  const conditions = analyzeConditions(reading);
  const statusScore = { optimal: 100, warning: 60, critical: 20 };

  const tempScore  = statusScore[conditions.temperature.status];
  const humScore   = statusScore[conditions.humidity.status];
  const soilScore  = statusScore[conditions.soil_moisture.status];

  const score = Math.round(tempScore * 0.35 + humScore * 0.3 + soilScore * 0.35);

  let grade, label, color;
  if (score >= 85) { grade = 'A'; label = 'Excellent'; color = 'green'; }
  else if (score >= 70) { grade = 'B'; label = 'Good';     color = 'yellow'; }
  else if (score >= 50) { grade = 'C'; label = 'Fair';     color = 'orange'; }
  else if (score >= 30) { grade = 'D'; label = 'Poor';     color = 'orange'; }
  else                  { grade = 'F'; label = 'Critical'; color = 'red'; }

  return { score, grade, label, color };
}

// ============================================================
// 5. getAlerts(reading)
// ============================================================
// Returns list of active alerts to show as notifications.
//
// Returns:
// [
//   { id, severity, title, message, sensor, value, timestamp }
// ]
// severity: 'info' | 'warning' | 'critical'
//
function getAlerts(reading) {
  const alerts = [];
  const { temperature, humidity, soil_moisture_percent, pump_on } = reading;
  const now = new Date().toISOString();

  if (soil_moisture_percent < 20) {
    alerts.push({
      id: 'soil-critical', severity: 'critical',
      title: 'Soil Critically Dry',
      message: `Soil moisture is only ${soil_moisture_percent}%. Plants need water immediately!`,
      sensor: 'soil_moisture', value: soil_moisture_percent, timestamp: now,
    });
  } else if (soil_moisture_percent < 30) {
    alerts.push({
      id: 'soil-warning', severity: 'warning',
      title: 'Soil Getting Dry',
      message: `Soil moisture is ${soil_moisture_percent}%. Consider watering soon.`,
      sensor: 'soil_moisture', value: soil_moisture_percent, timestamp: now,
    });
  }

  if (soil_moisture_percent > 85) {
    alerts.push({
      id: 'soil-wet', severity: 'warning',
      title: 'Soil Waterlogged',
      message: `Soil moisture is ${soil_moisture_percent}%. Risk of root rot.`,
      sensor: 'soil_moisture', value: soil_moisture_percent, timestamp: now,
    });
  }

  if (temperature > 38) {
    alerts.push({
      id: 'temp-critical', severity: 'critical',
      title: 'Temperature Too High',
      message: `Temperature is ${temperature}°C. Open shade to protect plants!`,
      sensor: 'temperature', value: temperature, timestamp: now,
    });
  } else if (temperature > 35) {
    alerts.push({
      id: 'temp-warning', severity: 'warning',
      title: 'Temperature Rising',
      message: `Temperature is ${temperature}°C. Consider opening shade.`,
      sensor: 'temperature', value: temperature, timestamp: now,
    });
  }

  if (temperature < 10) {
    alerts.push({
      id: 'temp-cold', severity: 'warning',
      title: 'Temperature Too Low',
      message: `Temperature is ${temperature}°C. Protect plants from cold.`,
      sensor: 'temperature', value: temperature, timestamp: now,
    });
  }

  if (humidity < 30) {
    alerts.push({
      id: 'hum-low', severity: 'warning',
      title: 'Low Humidity',
      message: `Humidity is ${humidity}%. Tropical plants may struggle.`,
      sensor: 'humidity', value: humidity, timestamp: now,
    });
  }

  if (pump_on) {
    alerts.push({
      id: 'pump-active', severity: 'info',
      title: 'Water Pump Active',
      message: 'The water pump is currently running.',
      sensor: 'pump', value: 1, timestamp: now,
    });
  }

  return alerts;
}

// ============================================================
// 6. getActuatorRecommendations(reading)
// ============================================================
// Tells frontend what the system recommends doing right now.
// Used both for display and auto-mode decisions.
//
// Returns:
// {
//   pump:  { action: 'on'|'off'|'idle', reason: string }
//   servo: { action: 'open'|'close'|'idle', angle: 0-180, reason: string }
// }
//
function getActuatorRecommendations(reading) {
  const { temperature, soil_moisture_percent } = reading;
  const result = {
    pump:  { action: 'idle', reason: 'Soil moisture is adequate' },
    servo: { action: 'idle', angle: 0, reason: 'Temperature is normal' },
  };

  if (soil_moisture_percent < 30) {
    result.pump = {
      action: 'on',
      reason: `Soil at ${soil_moisture_percent}% — below 30% threshold`,
    };
  }

  if (temperature > 35) {
    result.servo = {
      action: 'open',
      angle: 90,
      reason: `Temperature at ${temperature}°C — opening shade to reduce heat`,
    };
  } else if (temperature < 18) {
    result.servo = {
      action: 'close',
      angle: 0,
      reason: `Temperature at ${temperature}°C — closing shade to retain warmth`,
    };
  }

  return result;
}

// ============================================================
// 7. getHistoricalTrends(readings[])
// ============================================================
// Takes an array of historical readings and returns aggregated
// stats for charts. Frontend calls this for line graphs.
//
// readings: array of SensorReading documents
//
// Returns:
// {
//   chart_data: [ { timestamp, temperature, humidity, soil_moisture } ],
//   averages:   { temperature, humidity, soil_moisture },
//   peaks:      { max_temp, min_temp, max_humidity, min_humidity },
//   pump_events: number of times pump ran in this period,
// }
//
function getHistoricalTrends(readings) {
  if (!readings || readings.length === 0) {
    return { chart_data: [], averages: {}, peaks: {}, pump_events: 0 };
  }

  const chart_data = readings.map(r => ({
    timestamp:    r.timestamp,
    temperature:  r.temperature,
    humidity:     r.humidity,
    soil_moisture: r.soil_moisture_percent,
    pump_on:      r.pump_on,
    servo_angle:  r.servo_angle,
  }));

  const temps   = readings.map(r => r.temperature);
  const hums    = readings.map(r => r.humidity);
  const soils   = readings.map(r => r.soil_moisture_percent);
  const avg     = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

  // Count pump on events (transitions from off→on)
  let pump_events = 0;
  for (let i = 1; i < readings.length; i++) {
    if (!readings[i-1].pump_on && readings[i].pump_on) pump_events++;
  }

  return {
    chart_data,
    averages: {
      temperature:  Math.round(avg(temps) * 10) / 10,
      humidity:     Math.round(avg(hums) * 10) / 10,
      soil_moisture: Math.round(avg(soils) * 10) / 10,
    },
    peaks: {
      max_temp:     Math.max(...temps),
      min_temp:     Math.min(...temps),
      max_humidity: Math.max(...hums),
      min_humidity: Math.min(...hums),
    },
    pump_events,
  };
}

// ============================================================
// 8. getDashboardSummary(reading)
// ============================================================
// The main function — returns EVERYTHING the frontend dashboard
// needs in one call. Call this from your /api/plant/summary route.
//
// Returns the full combined object:
// {
//   latest_reading,
//   health:           getHealthScore result,
//   conditions:       analyzeConditions result,
//   plant_match:      classifyPlantType result (top 6),
//   alerts:           getAlerts result,
//   recommendations:  getActuatorRecommendations result,
// }
//
function getDashboardSummary(reading) {
  return {
    latest_reading:  reading,
    health:          getHealthScore(reading),
    conditions:      analyzeConditions(reading),
    plant_match:     classifyPlantType(reading),
    alerts:          getAlerts(reading),
    recommendations: getActuatorRecommendations(reading),
    timestamp:       new Date().toISOString(),
  };
}

module.exports = {
  analyzeConditions,
  classifyPlantType,
  getIdealRanges,
  getHealthScore,
  getAlerts,
  getActuatorRecommendations,
  getHistoricalTrends,
  getDashboardSummary,
  PLANT_TYPES,
};
