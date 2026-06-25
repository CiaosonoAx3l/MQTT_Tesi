from fastapi import FastAPI, WebSocket, WebSocketDisconnect 
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import paho.mqtt.client as mqtt
import asyncio # Asynchrony
import json

app = FastAPI(title="MQTT-Web Gateway") 

# Mounts the js directory to make static files available to the app
app.mount("/js", StaticFiles(directory="js"), name="js")

# ENDPOINT FOR THE WEB PAGE
@app.get("/")
async def get_web_page():
    return FileResponse("index.html")
# ENDPOINT FOR THE CSS
@app.get("/style.css")
async def get_css():
    return FileResponse("style.css")


# GATEWAY: WEBSOCKET + MQTT 
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept() 
    
    loop = asyncio.get_running_loop()
    mqtt_client = None

    # Callback: what Paho does when it receives a message from the MQTT broker
    def on_message(client, userdata, msg):
        received_text = msg.payload.decode('utf-8')
        
        # OTTIMIZZAZIONE MAGICA: Se è il video, lo inviamo "puro", senza l'HTML!
        if msg.topic == "drone/video":
            asyncio.run_coroutine_threadsafe(websocket.send_text(received_text), loop)
        else:
            # Per la telemetria o i log normali, manteniamo la formattazione con lo span
            formatted_message = f"<span class='topic'>[{msg.topic}]</span> {received_text}"
            asyncio.run_coroutine_threadsafe(websocket.send_text(formatted_message), loop)

    try:
        while True:
            # We receive the JSON payload from the js
            raw_data = await websocket.receive_text()
            received_data = json.loads(raw_data) 
            
            # Leggiamo il TIPO di azione che la pagina web ci sta chiedendo
            # Se non c'è, impostiamo "connect" come default
            action = received_data.get("action", "connect")
            
            # ==========================================
            # AZIONE 1: CONNESSIONE AL BROKER
            # ==========================================
            if action == "connect":
                broker_address = received_data.get("broker")
                conn_type = received_data.get("connection_type", "standard")
                broker_username = received_data.get("username", "")
                broker_password = received_data.get("password", "")
                requested_topic = received_data.get("topic", "#")
                
                # If there was already an old active connection, we close it
                if mqtt_client:
                    mqtt_client.loop_stop()
                    mqtt_client.disconnect()
                
                def on_connect(client, userdata, flags, reason_code, properties):
                    if reason_code == 0:
                        msg = f"<span style='color:#3b82f6'>[SYSTEM] Connected! Subscribed to topic: {requested_topic}</span>"
                        asyncio.run_coroutine_threadsafe(websocket.send_text(msg), loop)
                        
                        # Iscrizione al topic richiesto dall'utente
                        client.subscribe(requested_topic) 
                        
                        # FIX DEFINITIVO: Forza l'iscrizione al topic video SEMPRE E COMUNQUE!
                        client.subscribe("drone/video")
                    else:
                        msg = f"<span style='color:red'>[ERROR] Unable to connect (Code: {reason_code})</span>"
                        asyncio.run_coroutine_threadsafe(websocket.send_text(msg), loop)

                # We create the new client 
                mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
                mqtt_client.on_connect = on_connect
                mqtt_client.on_message = on_message
                
                if conn_type == "secure":
                    port = 8883
                    mqtt_client.tls_set()
                else:
                    port = 1883 
                    
                if broker_username:
                    mqtt_client.username_pw_set(broker_username, broker_password)
                
                try:
                    mqtt_client.connect(broker_address, port, 60)
                    mqtt_client.loop_start()
                except Exception as e:
                    error_msg = f"<span style='color:red'>[CRITICAL ERROR] Failed to connect to broker: {str(e)}. Check IP and Port.</span>"
                    await websocket.send_text(error_msg)
                    mqtt_client = None
            
            # ==========================================
            # AZIONE 2: INVIO COMANDO AL DRONE
            # ==========================================
            elif action == "command":
                if mqtt_client: 
                    # Recuperiamo il comando e il topic dal JSON inviato dalla pagina web
                    cmd_topic = received_data.get("target_topic", "drone/commands") # Default provvisorio
                    cmd_payload = received_data.get("payload", "")
                    
                    # Pubblichiamo il comando verso il broker!
                    mqtt_client.publish(cmd_topic, cmd_payload)
                    
                    # Stampiamo un feedback visivo nel terminale nero per l'utente
                    feedback_msg = f"<span style='color:#eab308'>[OUTBOUND] Commmand sent to '{cmd_topic}': {cmd_payload}</span>"
                    await websocket.send_text(feedback_msg)
                else:
                    await websocket.send_text("<span style='color:red'>[ERROR] You must connect to the broker first before sending commands.</span>")

    except WebSocketDisconnect:
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        print("Web page closed, client disconnected.")