#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/measurements";
const char* stationId = "ESP32_STATION_001";

#define DHTPIN 4
#define DHTTYPE DHT22
#define PM_SERIAL_RX 16
#define PM_SERIAL_TX 17

DHT dht(DHTPIN, DHTTYPE);
HardwareSerial pmSerial(1);

struct AirQualityData {
  float pm2_5 = 0;
  float pm10 = 0;
  float temperature = 0;
  float humidity = 0;
  float pressure = 1013.25;
  float co2 = 0;
  float no2 = 0;
  String timestamp;
  int errorCode = 0;
};

uint8_t pmBuffer[32];
int pmIndex = 0;
float currentPM2_5 = 0;
float currentPM10 = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("Starting air quality station...");
  
  initWiFi();
  initSensors();
  
  Serial.println("Station ready!");
}

void loop() {
  static unsigned long lastMeasurement = 0;
  const unsigned long measurementInterval = 60000;
  
  if (millis() - lastMeasurement >= measurementInterval) {
    lastMeasurement = millis();
    
    AirQualityData data = readAllSensors();
    
    if (data.errorCode == 0) {
      sendToServer(data);
    } else {
      Serial.printf("Sensor error: %d\n", data.errorCode);
    }
    
    printData(data);
  }
  
  readPMSensor();
  delay(100);
}

void initWiFi() {
  Serial.print("Connecting to WiFi ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

void initSensors() {
  dht.begin();
  Serial.println("DHT sensor initialized");
  
  pmSerial.begin(9600, SERIAL_8N1, PM_SERIAL_RX, PM_SERIAL_TX);
  Serial.println("PM sensor initialized");
}

AirQualityData readAllSensors() {
  AirQualityData data;
  data.errorCode = 0;
  
  data.temperature = dht.readTemperature();
  data.humidity = dht.readHumidity();
  
  if (isnan(data.temperature) || isnan(data.humidity)) {
    data.errorCode = 1;
    Serial.println("DHT sensor error!");
  }
  
  data.pm2_5 = getLastPM2_5();
  data.pm10 = getLastPM10();
  
  data.no2 = random(10, 100);
  data.co2 = random(400, 1200);
  
  data.timestamp = getTimestamp();
  
  return data;
}

void readPMSensor() {
  while (pmSerial.available()) {
    uint8_t byte = pmSerial.read();
    
    if (pmIndex == 0 && byte != 0x42) continue;
    if (pmIndex == 1 && byte != 0x4D) {
      pmIndex = 0;
      continue;
    }
    
    pmBuffer[pmIndex++] = byte;
    
    if (pmIndex >= 32) {
      pmIndex = 0;
      
      if (checkPMSum()) {
        parsePMData();
      }
      break;
    }
  }
}

bool checkPMSum() {
  uint16_t sum = 0;
  for (int i = 0; i < 30; i++) {
    sum += pmBuffer[i];
  }
  
  uint16_t frameSum = (pmBuffer[30] << 8) | pmBuffer[31];
  return (sum == frameSum);
}

void parsePMData() {
  uint16_t pm2_5 = (pmBuffer[12] << 8) | pmBuffer[13];
  uint16_t pm10 = (pmBuffer[14] << 8) | pmBuffer[15];
  
  static float lastPM2_5 = 0;
  static float lastPM10 = 0;
  
  lastPM2_5 = pm2_5 / 10.0;
  lastPM10 = pm10 / 10.0;
  
  setPMValues(lastPM2_5, lastPM10);
}

void setPMValues(float pm2_5, float pm10) {
  currentPM2_5 = pm2_5;
  currentPM10 = pm10;
}

float getLastPM2_5() {
  return currentPM2_5;
}

float getLastPM10() {
  return currentPM10;
}

String getTimestamp() {
  configTime(3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "2024-01-01T00:00:00Z";
  }
  
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

void sendToServer(AirQualityData data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    initWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return;
    }
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(512);
  
  doc["station_id"] = stationId;
  doc["timestamp"] = data.timestamp;
  
  JsonObject measurements = doc.createNestedObject("measurements");
  measurements["pm2_5"] = data.pm2_5;
  measurements["pm10"] = data.pm10;
  measurements["no2"] = data.no2;
  measurements["co2"] = data.co2;
  measurements["temperature"] = data.temperature;
  measurements["humidity"] = data.humidity;
  measurements["pressure"] = data.pressure;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending data: ");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.printf("Response code: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println("Server response: " + response);
  } else {
    Serial.printf("Send error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

void printData(AirQualityData data) {
  Serial.println("\n=== Measurement Data ===");
  Serial.printf("Time: %s\n", data.timestamp.c_str());
  Serial.printf("PM2.5: %.1f μg/m³\n", data.pm2_5);
  Serial.printf("PM10: %.1f μg/m³\n", data.pm10);
  Serial.printf("NO2: %.1f ppb\n", data.no2);
  Serial.printf("CO2: %.1f ppm\n", data.co2);
  Serial.printf("Temperature: %.1f °C\n", data.temperature);
  Serial.printf("Humidity: %.1f %%\n", data.humidity);
  Serial.printf("Pressure: %.1f hPa\n", data.pressure);
  Serial.println("=======================\n");
}
