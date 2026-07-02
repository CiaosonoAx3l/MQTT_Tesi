MQTT README - THEORY, PRACTICAL COMMANDS & SETUP

1. PUBLISH/SUBSCRIBE PARADIGM
The Pub/Sub paradigm is a "data-centric" communication model in which producers (Publishers) and consumers (Subscribers) do not interact directly.

* BROKER: It is the central entity that manages message routing.
* PUBLISHER: Sends data labeled with a "topic".
* SUBSCRIBER: Receives data by subscribing to specific "topics".

2. MQTT PROTOCOL (Message Queuing Telemetry Transport)
Lightweight protocol ideal for IoT .

* TOPIC: Hierarchical text strings separated by "/" (e.g.: university/students/messages).
* TOPIC CREATION: Topics are dynamic; they are created when publishing or subscribing.
* WILDCARDS:
* '#' (Multi-level): Replaces all subsequent levels (e.g.: university/#).
* '+' (Single-level): Replaces exactly one level (e.g.: university/+/messages).


* QoS (Quality of Service):
* 0: At most once (no guarantee).
* 1: At least once (guaranteed with PUBACK).
* 2: Exactly once (4-way handshake).


* STANDARD PORTS AND SECURITY:
* Port 1883: Uses a standard cleartext TCP/IP connection. Data and passwords travel without encryption. It is ideal (and standard) for `localhost` connections or within private and closed networks.
* Port 8883: Uses a connection protected by **TLS/SSL** encryption. It is mandatory when connecting to remote Cloud Brokers (e.g. HiveMQ) or through public networks, to prevent data from being intercepted.



3. PRACTICAL COMMANDS (Using mosquitto_clients)
Main parameters:
-h : Host (broker address)
-p : Port
-u : Username
-P : Password
-t : Topic
-m : Message
-r : Retain (the message remains in memory on the broker)

A. UNIVERSITY CLOUD (HiveMQ)
Host: e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud
Port: 8883 (requires TLS)
User: univr-studenti
Pass: MQTT-esercitazione2026

Publish Command:
mosquitto_pub -h e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud -p 8883 -u univr-studenti -P MQTT-esercitazione2026 -t "universita/test" -m "Hello from the Cloud"

B. LOCALHOST (Own PC)
Host: localhost (127.0.0.1)
Port: 1883
User/Pass: Configured via mosquitto_passwd (e.g.: admin / password)

Publish Command with RETAIN (message that remains in memory):
mosquitto_pub -h localhost -p 1883 -u admin -P password -t "drone/stato" -m "In flight" -r

Subscribe Command (Listening):
mosquitto_sub -h localhost -p 1883 -u admin -P password -t "drone/#" -d

--new execution--
To configure the application on a new Linux PC (Ubuntu):

## INSTALLATION AND CONFIGURATION OF LOCAL BROKER VIA MOSQUITTO

1. System preparation:
sudo apt update
sudo apt install mosquitto mosquitto-clients -y
2. Creation of user and password:
sudo mosquitto_passwd -c /etc/mosquitto/passwd admin           #it will ask for the password to be set 2 times#
3. Security and Listener configuration:
sudo nano /etc/mosquitto/conf.d/default.conf
*paste:*
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
*CTRL+O, Enter, CTRL+X*
4. Restart the service to apply changes:
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto

## EXECUTION OF LOCAL BROKER

1. System preparation:
sudo apt update
sudo apt install python3-pip python3-venv -y
2. Positioning in the project folder:
cd /path/to/your/folder/MQTT_Tesi
3. Creation and activation of virtual environment (venv):
python3 -m venv .venv
source .venv/bin/activate
4. Dependencies installation:
pip install fastapi uvicorn paho-mqtt websockets
5. Application startup:
uvicorn gateway_mqtt:app --reload

Note for subsequent executions (once everything is configured):

cd /path/to/your/folder/MQTT_Tesi
source .venv/bin/activate
uvicorn gateway_mqtt:app --reload

## USE OF THE WEB INTERFACE (CONNECTION CONFIGURATION)

Once Uvicorn is started, open the browser at the address: [http://127.0.0.1:8000](http://127.0.0.1:8000)
The interface allows connecting dynamically to different brokers without modifying the code.

SCENARIO A: Local Test (or with the Drone)

* Broker Address: 127.0.0.1
* Connection Type: Local / Drone (Port 1883, Unencrypted)
* Username: admin (or the one configured)
* Password: your_password
* Topic: drone/# (or the specific topic)

SCENARIO B: Cloud Test (University HiveMQ)

* Broker Address: e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud
* Connection Type: Cloud HiveMQ (Port 8883, TLS/SSL)
* Username: univr-studenti
* Password: MQTT-esercitazione2026
* Topic: universita/#

The application is equipped with automatic recovery (Auto-Reconnect) via WebSocket and handles TCP connection errors (e.g. wrong IP or Broker off) by printing them directly on screen in the virtual terminal of the page.

## 4.0 NEW PROJECT STATUS AND DRONE SPECIFICATIONS (AGRI DRONES GCS)

For the developers who will continue this project, below are the integration specifications, data origins, and architectural details of the developed flight interface.

**4.1 Test Environment and Network (Localhost)**
It is specified that, at the time of writing this application, the definitive IP address or the exact network configuration to access the drone in the field has not yet been made public. For this reason, **all application development tests were executed in localhost** (for the frontend, the backend, and the broker).

**4.2 Origin of Commands and Movement Formulas**
[cite_start]All commands mapped within the Web App (e.g. takeoff, landing, movements, and waypoints) have been extrapolated based on coordination emails exchanged with Pietro Dal Degan and by reviewing the GitHub repository of the drone project:
`[https://github.com/qtLeaf/DjiDroneControl.git](https://github.com/qtLeaf/DjiDroneControl.git)`.

* [cite_start]**Base control and remote controller:** To be able to pilot the drone (DJI mini 3 model[cite_start]) from the computer, it is mandatory to send the `enablevs` command (which deactivates control via the physical remote controller's sticks). [cite_start]The `disablevs` command returns control to the remote controller.
* [cite_start]**Manual Movements (e.g. `forward <time> <power>`):**
* `<time>`: expressed in **milliseconds (ms)**.
* `<power>`: expressed as a normalized angular value (0 < power <= 1).
* *Speed calculation formula:* The drone moves by calculating `time(ms) * power * 10(m/s)` (where 10m/s is a speed constant given by the drone's mode).


* [cite_start]**Autonomous Flight (Waypoint):** The drone accepts the automatic navigation command formatted as `goto <lat> <long> <alt>`, receiving the altitude in meters and absolute standard coordinates.

**4.3 MQTT Commands Topic: IMPLEMENTATION NOTICE**
The Web-Gateway is set to publish action commands on the **`drone/commands`** topic.
**ATTENTION:** The use of the `drone/commands` topic is currently **an internal idea of the frontend team** designed to have an isolated space on which to publish and perform tests. Pietro has not yet officialized or documented on which exact topic the Python flight script (`DjiDroneControl`) will listen to receive the input string. Whoever takes over the project will have to coordinate with the drone team to confirm or modify this string in the source code (`collegamento.js`).

**4.4 Camera, Video and Image Management**
The interface provides a space ("Flight Deck") for the video preview and a "Map" to view the photos processed for a single zone. It is specified that **the transmission protocol for media has not yet been definitively planned**.
At present, the idea under discussion is to transmit the image in very low resolution converted and inserted within the same MQTT protocol (in order to have a single channel). This practice is generally not recommended in professional IoT productions due to the file weight on the Brokers, therefore it will have to be evaluated whether to keep this approach in the final phase or place HTTP/RTSP protocols alongside it.

**4.5 Web Interface Architecture (Dynamic Single Page Application)**
The entire web application was designed as a **dynamic** HTML page (Single Page Application - SPA). This means that navigating between the various menus (e.g. from "Connection" to "Flight Deck") never loads new external HTML files, but dynamically shows and hides different portions of code (`div`) present within the same `index.html`.
This technical choice is mandatory: if the browser were to change page or reload, the **WebSocket** connection between the interface and the Python backend would be interrupted, causing instantaneous disconnection from the MQTT Broker and forcing the user to log in again.

## 5.0 Topographical Map and History Integration ("Adam" Module)

The cartographic interface for viewing the history (Tab 02) was originally developed as a standalone application based on Node.js, Express and PostgreSQL (with PostGIS spatial extension).

Visual integration (iFrame): To avoid Javascript dependency conflicts (e.g. overlaps with Leaflet) and keep the Single Page Application clean, the entire mapping web-app is served locally on port 3000 and injected into the main GCS via an  tag.

Database Mock (Fake DB): Since the original application queried a PostgreSQL database requesting formatted data via the jsonb_build_object SQL function, for development tests lacking a physical DB the server.js file was modified by inserting a "Fake DB" in RAM memory. This returns the JSON formatted exactly as PostGIS would, allowing the Javascript frontend (main.js, clustering.js) to render the markers without crashing.

Leaflet Marker Fix: A custom CSS function (L.divIcon) was implemented to bypass the issue of missing default Leaflet vector icons on the server.

## 6.0 3D SIMULATOR INTEGRATION (COPPELIASIM - "Anna" Module)

To test the GCS and drone flight in the absence of real hardware, the infrastructure was connected to a professional physics simulator: CoppeliaSim. The virtual drone moves within a 3D scene (Serra.ttt) managed by a Python script (Controller.py).

**6.1 Communication Architecture (ZMQ + MQTT)**
The Controller.py file acts as a bridge between two worlds:

-ZeroMQ (ZMQ): Communicates with CoppeliaSim (via the coppeliasim-zmqremoteapi-client library) to move the drone, read visual sensors, and calculate kinematics.

-MQTT (Paho): It is subscribed to the local broker listening on the drone/commands topic and constantly publishes on the drone/telemetria and drone/video topics.

**6.2 Coordinate Translation (GPS vs Cartesian)**
The CoppeliaSim simulator reasons in Cartesian Meters (X, Y, Z) relative to the center of the scene, while the GCS sends Waypoint commands (goto) in GPS Degrees (Latitude, Longitude).
A mathematical on-the-fly conversion was implemented in Controller.py: the coordinates sent by the web-app are subtracted from a "Zero" reference point (Lat: 45.4320, Lon: 10.9120) and multiplied by a terrestrial conversion constant (111319.9 meters per degree), thus calculating the exact X and Y displacement vector for the physics engine.

**6.3 Multi-Threading Security and ZeroMQ ("Note" Pattern)**
During development, the critical error Operation cannot be accomplished in current state was encountered. This happens because the ZeroMQ API does not allow sending commands to the simulator from secondary threads (like the background thread generated by receiving an MQTT message).

Solution: A queuing pattern was implemented. The MQTT function (on_mqtt_message) no longer moves the drone directly, but saves the command in a safe variable (self.pending_action). The drone's main Loop (run), which runs in the primary thread authorized by ZMQ, constantly reads this variable and, if it finds a command, executes it by applying physics.

**6.4 Live Video Streaming (FPV Camera via Base64)**

The drone's video preview (Flight Deck) was created by implementing a real-time feed from the simulator's camera:

-Capture and Compression: OpenCV (cv2) reads the RGB frame from CoppeliaSim's Vision Sensor. To avoid saturating the MQTT bandwidth, the frame is converted to BGR and compressed into JPEG format at 30% quality.

-Textual Encoding: The binary image is converted into a very long text string using Base64 and sent on the drone/video topic.

-Server Optimization (FastAPI): The Python Web-Gateway recognizes if the topic in transit is the video. In that case, to save precious milliseconds, it skips adding the decorative HTML tags and shoots the pure string via WebSocket to the browser.

-Web Rendering: Javascript intercepts the string by recognizing the standard JPEG Base64 header (/9j/), cuts any excess prefixes, and injects it directly into the  tag, interrupting the function's execution to prevent the massive block of text from being poured (spammed) into the on-screen log terminal.

## HOW TO START THE DEMO

To start the entire ecosystem with all three of its components (Adam Map, GCS Backend, Anna Simulator), strictly follow this order to avoid connection crashes:

**Step 1: Start Network and Map Services**

```
Ensure the Mosquitto broker is running in the background (sudo systemctl status mosquitto).

Open a terminal in the Adam directory (ParteAdam/src) and start the local express server:
node server.js (The terminal will report "Server active on localhost:3000")

```

**Step 2: Start Ground Control Station (FastAPI)**

```
Open a second terminal in your project folder.

Activate the virtual environment: source .venv/bin/activate

Start the Web Gateway: uvicorn gateway_mqtt:app --reload

Open the browser to http://localhost:8000 (the map iFrame will load automatically reading port 3000).

```

**Step 3: Start 3D Physics Engine**

```
Start the CoppeliaSim executable (./coppeliasim).

Load the Serra.ttt scene.

CRITICAL: Press the Play button in the CoppeliaSim interface to start the time and physics engine.

```

**Step 4: Drone Hook-up (Python Script)**

```
Open a third terminal in the Anna controller folder.

Activate the virtual environment: source .venv/bin/activate

Start the controller: python Controller.py

Verification: The terminal will clear, drawing the HUD, and report in green the text: [MQTT] Connected to Broker! Listening...

```

**Final Action: From the web page, establish the MQTT connection in tab 01. Move to tab 03 and click on Takeoff. The FPV video will turn on on the web page and the drone in the simulator will take flight, responding to all subsequent manual commands.**