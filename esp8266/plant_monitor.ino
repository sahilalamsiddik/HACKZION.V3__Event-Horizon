/*
SMART PLANT MONITOR - ESP8266 Firmware
Pins:
A0  → Soil Moisture Sensor (analog out)
D1  → DHT22 Data Pin
D5  → MOSFET Gate (Water Pump)
D6  → Servo Motor Signal
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>
#include <Servo.h>
#include <ArduinoJson.h>


const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://YOUR_SERVER_IP:5000/api/sensor-data";
const char* COMMAND_URL   = "http://YOUR_SERVER_IP:5000/api/commands/pending";


#define SOIL_PIN    A0
#define DHT_PIN     D1
#define PUMP_PIN    D5
#define SERVO_PIN   D6


#define SOIL_DRY_THRESHOLD    30    
#define TEMP_HIGH_THRESHOLD   35.0  
#define TEMP_LOW_THRESHOLD    25.0  
#define PUMP_ON_DURATION_MS   5000  


#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);


Servo shadeServo;


ESP8266WebServer server(80);


bool  manualMode    = false;
bool  pumpState     = false;
int   servoAngle    = 0;
unsigned long pumpStartTime = 0;
unsigned long lastSendTime  = 0;
const unsigned long SEND_INTERVAL = 10000; 




void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);

  shadeServo.attach(SERVO_PIN);
  shadeServo.write(0);

  dht.begin();

  connectWiFi();
  setupLocalServer();

  Serial.println("Plant Monitor Ready!");
}




void loop() {
  server.handleClient();

  
  if (pumpState && (millis() - pumpStartTime >= PUMP_ON_DURATION_MS)) {
    setPump(false);
  }

 
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    SensorData data = readSensors();
    sendToBackend(data);

    if (!manualMode) {
      runAutoLogic(data);
    }

    lastSendTime = millis();
  }

  // Poll backend for commands from web app
  pollCommands();
  delay(500);
}


// SENSOR READING

struct SensorData {
  float temperature;
  float humidity;
  int   soilMoistureRaw;
  int   soilMoisturePercent;
  bool  pumpOn;
  int   servoPos;
  bool  manualMode;
};

SensorData readSensors() {
  SensorData d;

  d.temperature = dht.readTemperature();
  d.humidity    = dht.readHumidity();

  if (isnan(d.temperature)) d.temperature = 0.0;
  if (isnan(d.humidity))    d.humidity    = 0.0;

  d.soilMoistureRaw = analogRead(SOIL_PIN); // 0-1023
  // Capacitive sensor: 1023 = completely dry, 0 = fully wet
  // Convert to 0-100% where 100 = very wet
  d.soilMoisturePercent = map(d.soilMoistureRaw, 1023, 300, 0, 100);
  d.soilMoisturePercent = constrain(d.soilMoisturePercent, 0, 100);

  d.pumpOn    = pumpState;
  d.servoPos  = servoAngle;
  d.manualMode = manualMode;

  Serial.printf("Temp:%.1f Hum:%.1f Soil:%d%%\n",
    d.temperature, d.humidity, d.soilMoisturePercent);

  return d;
}

// ==============================
// AUTO LOGIC
// ==============================
void runAutoLogic(SensorData& d) {
  // Water if soil too dry and pump not already running
  if (d.soilMoisturePercent < SOIL_DRY_THRESHOLD && !pumpState) {
    Serial.println("[AUTO] Soil dry → turning pump ON");
    setPump(true);
  }

  // Shade control based on temperature
  if (d.temperature > TEMP_HIGH_THRESHOLD && servoAngle < 90) {
    Serial.println("[AUTO] High temp → opening shade");
    setServo(90);
  } else if (d.temperature < TEMP_LOW_THRESHOLD && servoAngle > 0) {
    Serial.println("[AUTO] Low temp → closing shade");
    setServo(0);
  }
}

// ==============================
// ACTUATOR CONTROL
// ==============================
void setPump(bool state) {
  pumpState = state;
  digitalWrite(PUMP_PIN, state ? HIGH : LOW);
  if (state) pumpStartTime = millis();
  Serial.printf("[PUMP] %s\n", state ? "ON" : "OFF");
}

void setServo(int angle) {
  angle = constrain(angle, 0, 180);
  servoAngle = angle;
  shadeServo.write(angle);
  Serial.printf("[SERVO] → %d°\n", angle);
}

// ==============================
// SEND DATA TO BACKEND
// ==============================
void sendToBackend(SensorData& d) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  http.begin(client, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["temperature"]          = d.temperature;
  doc["humidity"]             = d.humidity;
  doc["soil_moisture_raw"]    = d.soilMoistureRaw;
  doc["soil_moisture_percent"]= d.soilMoisturePercent;
  doc["pump_on"]              = d.pumpOn;
  doc["servo_angle"]          = d.servoPos;
  doc["manual_mode"]          = d.manualMode;
  doc["device_id"]            = "plant-esp-01";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("[HTTP] POST → %d\n", code);
  http.end();
}

// ==============================
// POLL COMMANDS FROM BACKEND
// ==============================
void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  http.begin(client, COMMAND_URL);
  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (!err && doc["has_command"].as<bool>()) {
      const char* cmd = doc["command"];
      int value = doc["value"] | 0;
      executeCommand(String(cmd), value);
    }
  }
  http.end();
}

void executeCommand(String cmd, int value) {
  Serial.printf("[CMD] %s = %d\n", cmd.c_str(), value);

  if (cmd == "pump_on")     { manualMode = true;  setPump(true);  }
  if (cmd == "pump_off")    { manualMode = true;  setPump(false); }
  if (cmd == "servo")       { manualMode = true;  setServo(value);}
  if (cmd == "manual_on")   { manualMode = true;  }
  if (cmd == "manual_off")  { manualMode = false; }
}

// ==============================
// LOCAL WEB SERVER (optional direct control)
// ==============================
void setupLocalServer() {
  server.on("/status", HTTP_GET, []() {
    StaticJsonDocument<256> doc;
    doc["pump"]        = pumpState;
    doc["servo"]       = servoAngle;
    doc["manual_mode"] = manualMode;
    String out; serializeJson(doc, out);
    server.send(200, "application/json", out);
  });

  server.on("/pump/on",  HTTP_GET, []() { setPump(true);  server.send(200, "text/plain", "pump on");  });
  server.on("/pump/off", HTTP_GET, []() { setPump(false); server.send(200, "text/plain", "pump off"); });

  server.on("/servo", HTTP_GET, []() {
    int angle = server.arg("angle").toInt();
    setServo(angle);
    server.send(200, "text/plain", "servo set");
  });

  server.begin();
  Serial.printf("Local server: http://%s\n", WiFi.localIP().toString().c_str());
}

// ==============================
// WIFI
// ==============================
void connectWiFi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500); Serial.print("."); tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi failed — running in offline mode");
  }
}
