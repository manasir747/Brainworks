// // #include <Arduino.h>
// //#include <SPI.h>
// //#include <LoRa.h>
// //#include <TinyGPSPlus.h>

// #define LORA_SCK       18
// #define LORA_MISO      19
// #define LORA_MOSI      23
// #define LORA_SS         5
// #define LORA_RST       14
// #define LORA_DIO0      26

// #define GPS_RX         16
// #define GPS_TX         17

// #define RADAR_TRIG     32
// #define RADAR_ECHO     33

// #define BUZZER_PIN     25
// #define BRAKE_PIN      27
// #define MOTOR_ENABLE_PIN 4

// #define LORA_FREQUENCY 866E6

// const String VEHICLE_ID = "TRK-101";
// const String VEHICLE_TYPE = "truck";

// const float V2X_WARNING_MAX = 190.0;
// const float V2X_WARNING_MIN = 75.0;
// const float V2V_EMERGENCY_DISTANCE = 65.0;
// const float RADAR_BRAKE_DISTANCE = 58.0;

// #define MAX_REMOTE_VEHICLES 10
// #define MAX_HAZARDS 20

// HardwareSerial GPSSerial(2);
// TinyGPSPlus gps;

// struct RemoteVehicle {
//     String id;
//     String type;
//     float latitude;
//     float longitude;
//     float speedKmh;
//     float heading;
//     int rssi;
//     unsigned long lastSeen;
//     bool valid;
// };

// struct Hazard {
//     String id;
//     String type;
//     float latitude;
//     float longitude;
//     float radius;
//     unsigned long lastSeen;
//     bool valid;
// };

// RemoteVehicle remoteVehicles[MAX_REMOTE_VEHICLES];
// Hazard hazards[MAX_HAZARDS];

// float vehicleLatitude = 0.0;
// float vehicleLongitude = 0.0;
// float vehicleSpeedKmh = 0.0;
// float vehicleHeading = 0.0;
// float navigationHeading = 0.0;

// bool loraHealthy = false;
// bool radarAlert = false;
// bool v2xAlert = false;
// bool emergencyBrake = false;

// float radarDistance = 9999.0;
// float nearestVehicleDistance = 9999.0;
// float nearestHazardDistance = 9999.0;
// float TTC = 9999.0;

// unsigned long lastLoRaPacketTime = 0;
// unsigned long lastTelemetryTx = 0;
// unsigned long lastRadarTime = 0;

// unsigned long lastRadarBeep = 0;
// unsigned long lastRockfallBeep = 0;
// unsigned long lastV2VBeep = 0;
// unsigned long lastV2XBeep = 0;

// void beep(int frequency, int duration);
// void processSerialCommands();
// void readGPS();
// void readRadar();
// void receiveLoRa();
// void parseVehiclePacket(String packet, int rssi);
// void parseHazardPacket(String packet);
// void checkLoRaFailure();
// void calculateV2X();
// void calculateTTC();
// float gpsDistanceMeters(float lat1, float lon1, float lat2, float lon2);
// void safetyDecision();
// void updateBrakeControl();
// void sendTelemetry();
// void sendRockfall(float lat, float lon, float radius);
// void updateNavigation();
// void printStatus();

// void setup() {
//     Serial.begin(115200);
//     delay(1000);
//     Serial.println("================================================");
//     Serial.println("       BRAINWORKS MINE SAFETY NODE");
//     Serial.println("       ESP32 + LoRa + GPS + AEB");
//     Serial.println("================================================");

//     for(int i=0; i<MAX_REMOTE_VEHICLES; i++) remoteVehicles[i].valid = false;
//     for(int i=0; i<MAX_HAZARDS; i++) hazards[i].valid = false;

//     pinMode(RADAR_TRIG, OUTPUT);
//     pinMode(RADAR_ECHO, INPUT);
//     digitalWrite(RADAR_TRIG, LOW);

//     pinMode(BUZZER_PIN, OUTPUT);
//     digitalWrite(BUZZER_PIN, LOW);

//     pinMode(BRAKE_PIN, OUTPUT);
//     digitalWrite(BRAKE_PIN, LOW);

//     pinMode(MOTOR_ENABLE_PIN, OUTPUT);
//     digitalWrite(MOTOR_ENABLE_PIN, HIGH);

//     GPSSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
//     Serial.println("[GPS] Initialized on HardwareSerial 2");

//     SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
//     LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

//     Serial.printf("[LORA] Starting at %g MHz...\n", LORA_FREQUENCY/1E6);
//     if (!LoRa.begin(LORA_FREQUENCY)) {
//         Serial.println("[LORA] ERROR: Initialization failed!");
//         loraHealthy = false;
//     } else {
//         Serial.println("[LORA] ONLINE.");
//         LoRa.setTxPower(17);
//         loraHealthy = true;
//         lastLoRaPacketTime = millis();
//     }

//     beep(1000, 150);
//     Serial.println("[SYSTEM] Vehicle node ready.\n");
// }

// void loop() {
//     processSerialCommands();
//     readGPS();

//     if (millis() - lastRadarTime >= 100) {
//         lastRadarTime = millis();
//         readRadar();
//     }

//     receiveLoRa();
//     checkLoRaFailure();

//     calculateV2X();
//     calculateTTC();

//     safetyDecision();
//     updateBrakeControl();

//     sendTelemetry();
//     updateNavigation();

//     delay(20);
// }

// void readGPS() {
//     while (GPSSerial.available()) {
//         gps.encode(GPSSerial.read());
//     }

//     if (gps.location.isValid()) {
//         vehicleLatitude = gps.location.lat();
//         vehicleLongitude = gps.location.lng();
//     }
//     if (gps.speed.isValid()) {
//         vehicleSpeedKmh = gps.speed.kmph();
//     }
//     if (gps.course.isValid()) {

//         navigationHeading = gps.course.deg();
//     }
// }

// void readRadar() {
//     digitalWrite(RADAR_TRIG, LOW);
//     delayMicroseconds(2);
//     digitalWrite(RADAR_TRIG, HIGH);
//     delayMicroseconds(10);
//     digitalWrite(RADAR_TRIG, LOW);

//     long duration = pulseIn(RADAR_ECHO, HIGH, 30000);
//     if (duration == 0) {
//         radarDistance = 9999.0;
//     } else {
//         radarDistance = duration * 0.0343 / 2.0;
//     }
// }

// void receiveLoRa() {
//     int packetSize = LoRa.parsePacket();
//     if (packetSize) {
//         String packet = "";
//         while (LoRa.available()) {
//             packet += (char)LoRa.read();
//         }
//         int rssi = LoRa.packetRssi();
//         lastLoRaPacketTime = millis();
//         loraHealthy = true;

//         if (packet.startsWith("HAZARD")) {
//             parseHazardPacket(packet);
//         } else {
//             parseVehiclePacket(packet, rssi);
//         }
//     }
// }

// void parseVehiclePacket(String packet, int rssi) {
//     int parts = 0;
//     String tokens[6];
//     int startIdx = 0;

//     for (int i=0; i<packet.length(); i++) {
//         if (packet.charAt(i) == ',' || i == packet.length() - 1) {
//             if (i == packet.length() - 1) i++;
//             tokens[parts++] = packet.substring(startIdx, i);
//             startIdx = i + 1;
//             if (parts == 6) break;
//         }
//     }

//     if (parts < 6 || tokens[0] == VEHICLE_ID) return;

//     int slot = -1;
//     for (int i=0; i<MAX_REMOTE_VEHICLES; i++) {
//         if (remoteVehicles[i].valid && remoteVehicles[i].id == tokens[0]) {
//             slot = i; break;
//         }
//     }
//     if (slot == -1) {
//         for (int i=0; i<MAX_REMOTE_VEHICLES; i++) {
//             if (!remoteVehicles[i].valid) {
//                 slot = i; break;
//             }
//         }
//     }

//     if (slot != -1) {
//         remoteVehicles[slot].id = tokens[0];
//         remoteVehicles[slot].type = tokens[1];
//         remoteVehicles[slot].latitude = tokens[2].toFloat();
//         remoteVehicles[slot].longitude = tokens[3].toFloat();
//         remoteVehicles[slot].speedKmh = tokens[4].toFloat();
//         remoteVehicles[slot].heading = tokens[5].toFloat();
//         remoteVehicles[slot].rssi = rssi;
//         remoteVehicles[slot].lastSeen = millis();
//         remoteVehicles[slot].valid = true;
//     }
// }

// void parseHazardPacket(String packet) {
//     int parts = 0;
//     String tokens[5];
//     int startIdx = 0;

//     for (int i=0; i<packet.length(); i++) {
//         if (packet.charAt(i) == ',' || i == packet.length() - 1) {
//             if (i == packet.length() - 1) i++;
//             tokens[parts++] = packet.substring(startIdx, i);
//             startIdx = i + 1;
//             if (parts == 5) break;
//         }
//     }

//     if (parts < 5) return;
//     float lat = tokens[2].toFloat();
//     float lon = tokens[3].toFloat();
//     float radius = tokens[4].toFloat();

//     int slot = -1;
//     for (int i=0; i<MAX_HAZARDS; i++) {
//         if (hazards[i].valid && gpsDistanceMeters(lat, lon,
//         hazards[i].latitude, hazards[i].longitude) < 5.0) {
//             slot = i; break;
//         }
//     }
//     if (slot == -1) {
//         for (int i=0; i<MAX_HAZARDS; i++) {
//             if (!hazards[i].valid) {
//                 slot = i; break;
//             }
//         }
//     }

//     if (slot != -1) {
//         hazards[slot].id = "HAZ-" + String(slot+1);
//         hazards[slot].type = tokens[1];
//         hazards[slot].latitude = lat;
//         hazards[slot].longitude = lon;
//         hazards[slot].radius = radius;
//         hazards[slot].lastSeen = millis();
//         hazards[slot].valid = true;

//         Serial.println("[HAZARD] New remote hazard received.");
//         beep(950, 100);
//     }
// }

// float gpsDistanceMeters(float lat1, float lon1, float lat2, float lon2) {
//     float dLat = radians(lat2 - lat1);
//     float dLon = radians(lon2 - lon1);
//     float a = sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) *
//     cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2); return 6371000.0 * (2.0 *
//     atan2(sqrt(a), sqrt(1.0 - a)));
// }

// void calculateV2X() {
//     nearestVehicleDistance = 9999.0;
//     nearestHazardDistance = 9999.0;

//     for (int i=0; i<MAX_REMOTE_VEHICLES; i++) {
//         if (remoteVehicles[i].valid) {
//             if (millis() - remoteVehicles[i].lastSeen > 5000) {
//                 remoteVehicles[i].valid = false;
//                 continue;
//             }
//             float dist = gpsDistanceMeters(vehicleLatitude, vehicleLongitude,
//             remoteVehicles[i].latitude, remoteVehicles[i].longitude); if
//             (dist < nearestVehicleDistance) nearestVehicleDistance = dist;
//         }
//     }

//     for (int i=0; i<MAX_HAZARDS; i++) {
//         if (hazards[i].valid) {
//             float dist = gpsDistanceMeters(vehicleLatitude, vehicleLongitude,
//             hazards[i].latitude, hazards[i].longitude); dist = max(0.0f, dist
//             - hazards[i].radius); if (dist < nearestHazardDistance)
//             nearestHazardDistance = dist;
//         }
//     }

//     v2xAlert = (nearestVehicleDistance <= V2X_WARNING_MAX &&
//     nearestVehicleDistance > V2X_WARNING_MIN);
// }

// void calculateTTC() {
//     if (nearestVehicleDistance >= 9999.0) {
//         TTC = 9999.0;
//         return;
//     }

//     float remoteSpeed = 0.0;
//     for (int i=0; i<MAX_REMOTE_VEHICLES; i++) {
//         if (remoteVehicles[i].valid) {
//             float dist = gpsDistanceMeters(vehicleLatitude, vehicleLongitude,
//             remoteVehicles[i].latitude, remoteVehicles[i].longitude); if
//             (abs(dist - nearestVehicleDistance) < 1.0) {
//                 remoteSpeed = remoteVehicles[i].speedKmh;
//                 break;
//             }
//         }
//     }

//     float relativeSpeedMs = (vehicleSpeedKmh + remoteSpeed) / 3.6;
//     if (relativeSpeedMs <= 0.1) {
//         TTC = 9999.0;
//     } else {
//         TTC = nearestVehicleDistance / relativeSpeedMs;
//     }
// }

// void safetyDecision() {
//     emergencyBrake = false;
//     radarAlert = false;

//     if (radarDistance <= RADAR_BRAKE_DISTANCE) {
//         emergencyBrake = true;
//         radarAlert = true;
//         if (millis() - lastRadarBeep > 250) {
//             beep(1100, 60);
//             lastRadarBeep = millis();
//         }
//     }

//     else if (nearestHazardDistance <= RADAR_BRAKE_DISTANCE) {
//         emergencyBrake = true;
//         if (millis() - lastRockfallBeep > 250) {
//             beep(950, 60);
//             lastRockfallBeep = millis();
//         }
//     }

//     else if (nearestVehicleDistance <= V2V_EMERGENCY_DISTANCE) {
//         emergencyBrake = true;
//         if (millis() - lastV2VBeep > 250) {
//             beep(1300, 60);
//             lastV2VBeep = millis();
//         }
//     }

//     else if (v2xAlert) {
//         if (millis() - lastV2XBeep > 1000) {
//             beep(650, 80);
//             lastV2XBeep = millis();
//         }
//     }
// }

// void updateBrakeControl() {
//     if (emergencyBrake) {
//         digitalWrite(BRAKE_PIN, HIGH);
//         digitalWrite(MOTOR_ENABLE_PIN, LOW);
//     } else {
//         digitalWrite(BRAKE_PIN, LOW);
//         digitalWrite(MOTOR_ENABLE_PIN, HIGH);
//     }
// }

// void beep(int frequency, int duration) {
//     tone(BUZZER_PIN, frequency, duration);
// }

// void updateNavigation() {
//     vehicleHeading = navigationHeading;
// }

// void checkLoRaFailure() {
//     if (loraHealthy && millis() - lastLoRaPacketTime > 3000) {
//         Serial.println("[FAULT] LoRa communication lost.");
//         loraHealthy = false;

//     }
// }

// void sendTelemetry() {
//     if (!loraHealthy || millis() - lastTelemetryTx < 500) return;
//     lastTelemetryTx = millis();

//     String packet = VEHICLE_ID + "," + VEHICLE_TYPE + "," +
//     String(vehicleLatitude, 6) + "," +
//                     String(vehicleLongitude, 6) + "," +
//                     String(vehicleSpeedKmh, 1) + "," + String(vehicleHeading,
//                     1);
//     LoRa.beginPacket();
//     LoRa.print(packet);
//     LoRa.endPacket();
// }

// void sendRockfall(float lat, float lon, float radius) {
//     if (!loraHealthy) return;
//     String packet = "HAZARD,ROCKFALL," + String(lat, 6) + "," + String(lon,
//     6) + "," + String(radius, 1); LoRa.beginPacket(); LoRa.print(packet);
//     LoRa.endPacket();
//     Serial.println("[HAZARD TX] " + packet);
// }

// void processSerialCommands() {
//     if (!Serial.available()) return;
//     String cmd = Serial.readStringUntil('\n');
//     cmd.trim();
//     cmd.toUpperCase();

//     if (cmd == "STATUS") {
//         printStatus();
//     }
//     else if (cmd == "TEST_BEEP") {
//         beep(1100, 150); delay(150);
//         beep(1100, 150); delay(150);
//         beep(1100, 150);
//     }
//     else if (cmd == "TEST_AEB") {
//         emergencyBrake = true;
//         updateBrakeControl();
//         beep(1300, 60);
//         Serial.println("[AEB] TEST_AEB activated.");
//     }
//     else if (cmd == "LORA_FAIL") {
//         loraHealthy = false;
//         Serial.println("[FAULT] LoRa FAILURE SIMULATED");
//         Serial.println("[SAFETY] Navigation unchanged. Vehicle direction
//         unchanged.");
//     }
//     else if (cmd == "LORA_RECOVER") {
//         loraHealthy = true;
//         lastLoRaPacketTime = millis();
//         Serial.println("[LORA] Communication recovered");
//     }
//     else if (cmd == "ROCKFALL") {
//         if (gps.location.isValid()) {
//             sendRockfall(vehicleLatitude, vehicleLongitude, 15.0);
//         } else {
//             Serial.println("[GPS] No fix available for ROCKFALL command.");
//         }
//     }
//     else if (cmd == "CLEAR_HAZARDS") {
//         for(int i=0; i<MAX_HAZARDS; i++) hazards[i].valid = false;
//         Serial.println("[HAZARD] All hazards cleared.");
//     }
// }

// void printStatus() {
//     Serial.println("\n[BRAINWORKS]");
//     Serial.println("Vehicle: " + VEHICLE_ID);
//     Serial.println("GPS: " + String(gps.location.isValid() ? "VALID" : "NO
//     FIX")); Serial.println("LoRa: " + String(loraHealthy ? "ONLINE" :
//     "FAILED")); Serial.println("Speed: " + String(vehicleSpeedKmh, 1) + "
//     km/h"); Serial.println("Heading: " + String(vehicleHeading, 1) + " deg");
//     Serial.println("Radar: " + String(radarDistance, 1) + " m");
//     Serial.println("Nearest V2V: " + String(nearestVehicleDistance, 1) + "
//     m"); Serial.println("Nearest Hazard: " + String(nearestHazardDistance, 1)
//     + " m"); Serial.println("TTC: " + String(TTC > 999 ? 9999.0 : TTC, 1) + "
//     s"); Serial.println("V2X: " + String(v2xAlert ? "WARNING" : "CLEAR"));
//     Serial.println("AEB: " + String(emergencyBrake ? "ENGAGED" : "OFF"));
// }
