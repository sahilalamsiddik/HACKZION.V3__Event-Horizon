# Smart Plant Monitor — Complete Build Guide

---

## STEP 1: Understand Your Components

| Component | What it does |
|---|---|
| ESP8266 NodeMCU | The brain — runs WiFi, reads sensors, controls actuators |
| Capacitive Soil Sensor | Measures soil wetness (0-100%) |
| DHT22 | Measures air temperature and humidity |
| IRLZ44N MOSFET | Acts as a switch — ESP controls 5V pump safely |
| 1N4007 Diode | Protects ESP from voltage spike when pump stops |
| 1kΩ Resistor | Limits current into MOSFET gate |
| 10kΩ Resistor | Pulls MOSFET gate to GND when not active (prevents floating) |
| SG90 Servo | Opens/closes shade (0° = closed, 90° = open) |
| Water Pump | 3V–6V submersible mini pump |
| Breadboard | Where you build the circuit without soldering |

---

## STEP 2: Wire the Soil Moisture Sensor

The capacitive soil sensor has 3 pins: VCC, GND, AOUT

```
Sensor VCC  → Breadboard +rail → ESP 3V3 pin
Sensor GND  → Breadboard -rail → ESP GND pin
Sensor AOUT → ESP A0 pin
```

> WHY A0? ESP8266 only has ONE analog input, called A0.
> The sensor sends an analog voltage that changes with moisture.

---

## STEP 3: Wire the DHT22 Temperature & Humidity Sensor

The DHT22 has 3 active pins (left to right when facing the grid side):
Pin 1 = VCC, Pin 2 = DATA, Pin 4 = GND (pin 3 is not connected)

```
DHT22 Pin 1 (VCC)  → ESP 3V3
DHT22 Pin 2 (DATA) → ESP D1
DHT22 Pin 4 (GND)  → ESP GND
```

> IMPORTANT: Put a 10kΩ pull-up resistor between DATA and VCC.
> Without it, DHT22 gives random readings.

---

## STEP 4: Wire the MOSFET + Water Pump

This is the trickiest part. Read carefully.

The IRLZ44N has 3 legs when you look at it from the front (flat side):
```
Left leg  = GATE   (G) — receives signal from ESP
Middle    = DRAIN  (D) — connects to pump's negative wire
Right leg = SOURCE (S) — connects to GND
```

Wiring:
```
ESP D5 → 1kΩ resistor → MOSFET GATE
MOSFET GATE → 10kΩ resistor → GND   (pull-down)
MOSFET SOURCE → GND
5V power → Pump (+) wire
Pump (-) wire → MOSFET DRAIN
1N4007 Diode → across pump (stripe end to + wire)
```

> WHY THE DIODE? When the pump stops, it creates a voltage spike.
> The 1N4007 absorbs that spike to protect your ESP from burning.

> WHY THE 10kΩ TO GND? Without it, when ESP doesn't send signal,
> the gate "floats" and pump turns on randomly.

---

## STEP 5: Wire the SG90 Servo Motor

Servo has 3 wires:
```
Red wire    → 5V (from power supply, NOT from ESP — servo needs more current)
Brown wire  → GND
Orange wire → ESP D6 (signal)
```

> WARNING: Never power servo from ESP 3V3 or VIN directly for long.
> Use your 5V power bank or adapter.

---

## STEP 6: Power Everything

```
5V Power Bank/Adapter (+) → ESP VIN pin
5V Power Bank/Adapter (+) → Pump + wire (through MOSFET)
5V Power Bank/Adapter (+) → Servo red wire
5V Power Bank/Adapter (-) → Common GND on breadboard
ESP GND → Common GND
Servo GND → Common GND
MOSFET Source → Common GND
```

> KEY CONCEPT: All GNDs must be connected together.
> This is called a "common ground". Without this nothing works.

---

## STEP 7: Flash the ESP8266

1. Install Arduino IDE from arduino.cc
2. Open Arduino IDE → File → Preferences
3. In "Additional Board Manager URLs" paste:
   `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
4. Go to Tools → Board → Board Manager → search "esp8266" → Install
5. Install these libraries via Tools → Manage Libraries:
   - DHT sensor library (by Adafruit)
   - ArduinoJson (by Benoit Blanchon)
   - ESP8266WebServer (built-in)
6. Open `esp8266/plant_monitor.ino`
7. Edit the top: put your WiFi name, password, and server IP
8. Select Tools → Board → NodeMCU 1.0 (ESP-12E)
9. Select Tools → Port → (the COM port your ESP is on)
10. Click Upload (→ button)
11. Open Serial Monitor (baud 115200) to see debug messages

---

## STEP 8: Run the Backend

Prerequisites: Node.js and MongoDB installed

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs on http://localhost:5000

---

## STEP 9: API Reference for Your Frontend Dev

### Sensor Data
| Method | URL | Purpose |
|---|---|---|
| GET | /api/sensor-data/latest | Current raw reading |
| GET | /api/sensor-data/history?hours=24 | Past readings for charts |

### Plant Intelligence
| Method | URL | Frontend use |
|---|---|---|
| GET | /api/plant/summary | Main dashboard — everything |
| GET | /api/plant/health | Health score gauge |
| GET | /api/plant/conditions | Per-sensor status cards |
| GET | /api/plant/classify | Plant category match grid |
| GET | /api/plant/alerts | Notification panel |
| GET | /api/plant/recommendations | Actuator advice |
| GET | /api/plant/trends?hours=24 | Chart data |
| GET | /api/plant/types | All plant type definitions |
| GET | /api/plant/ideal-ranges/:type | Ranges for one plant type |

### Control Commands
| Method | URL | Body | Purpose |
|---|---|---|---|
| POST | /api/commands | `{command:"pump_on"}` | Turn pump on |
| POST | /api/commands | `{command:"pump_off"}` | Turn pump off |
| POST | /api/commands | `{command:"servo", value:90}` | Move servo |
| POST | /api/commands | `{command:"manual_on"}` | Switch to manual mode |
| POST | /api/commands | `{command:"manual_off"}` | Switch to auto mode |

### Socket.IO Events (real-time)
| Event | Direction | Data |
|---|---|---|
| `sensor_update` | Server → Frontend | Latest SensorReading |
| `command_queued` | Server → Frontend | Command that was queued |
| `send_command` | Frontend → Server | {command, value} |

---

## STEP 10: Frontend Function Map

Tell your frontend AI to implement these functions that call the backend:

```
fetchDashboardSummary()     → GET /api/plant/summary
fetchHealthScore()          → GET /api/plant/health
fetchConditions()           → GET /api/plant/conditions
fetchPlantClassification()  → GET /api/plant/classify
fetchAlerts()               → GET /api/plant/alerts
fetchRecommendations()      → GET /api/plant/recommendations
fetchTrends(hours)          → GET /api/plant/trends?hours={hours}
fetchPlantTypes()           → GET /api/plant/types

sendPumpOn()                → POST /api/commands {command:"pump_on"}
sendPumpOff()               → POST /api/commands {command:"pump_off"}
sendServoAngle(angle)       → POST /api/commands {command:"servo", value:angle}
enableManualMode()          → POST /api/commands {command:"manual_on"}
enableAutoMode()            → POST /api/commands {command:"manual_off"}

subscribeToLiveData(cb)     → Socket.IO listen 'sensor_update'
subscribeToCommands(cb)     → Socket.IO listen 'command_queued'
```

---

## File Structure

```
plant-monitor/
├── esp8266/
│   └── plant_monitor.ino       ← Flash this to ESP8266
│
└── backend/
    ├── server.js               ← Entry point
    ├── package.json
    ├── .env.example
    ├── models/
    │   ├── SensorReading.js    ← MongoDB schema for sensor data
    │   └── Command.js          ← MongoDB schema for commands
    ├── routes/
    │   ├── sensor.js           ← /api/sensor-data/*
    │   ├── commands.js         ← /api/commands/*
    │   └── plant.js            ← /api/plant/*
    └── utils/
        └── plantAnalysis.js    ← ALL intelligence logic lives here
```





----how to run----


open one terminal and paste it



cd plant-monitor/backend



npm run dev



open another terminal and paste it



cd frontend
npm install
npm run dev




doneeee
