MQTT README - TEORIA, COMANDI PRATICI & SETUP   

1. PARADIGMA PUBLISH/SUBSCRIBE
Il paradigma Pub/Sub e' un modello di comunicazione "data-centric" in cui i produttori (Publisher) e i consumatori (Subscriber) non interagiscono direttamente.
- BROKER: E' l'entita' centrale che gestisce lo smistamento dei messaggi.
- PUBLISHER: Invia dati etichettati con un "topic".
- SUBSCRIBER: Riceve i dati iscrivendosi a specifici "topic".

2. PROTOCOLLO MQTT (Message Queuing Telemetry Transport)
Protocollo leggero ideale per IoT .
- TOPIC: Stringhe di testo gerarchiche separate da "/" (es: universita/studenti/messaggi).
- CREAZIONE TOPIC: I topic sono dinamici; vengono creati quando si pubblica o ci si iscrive.
- WILDCARDS:
  * '#' (Multi-level): Sostituisce tutti i livelli successivi (es: universita/#).
  * '+' (Single-level): Sostituisce esattamente un livello (es: universita/+/messaggi).
- QoS (Quality of Service):
  * 0: At most once (nessuna garanzia).
  * 1: At least once (garantito con PUBACK).
  * 2: Exactly once (4-way handshake).
- PORTE STANDARD E SICUREZZA:
  * Porta 1883: Utilizza una connessione TCP/IP standard in chiaro. I dati e le password viaggiano senza crittografia. È ideale (e standard) per le connessioni in `localhost` o all'interno di reti private e chiuse.
  * Porta 8883: Utilizza una connessione protetta da crittografia **TLS/SSL**. È obbligatoria quando ci si connette a Broker remoti in Cloud (es. HiveMQ) o attraverso reti pubbliche, per evitare che i dati vengano intercettati.

3. COMANDI PRATICI (Utilizzando mosquitto_clients)
Parametri principali:
-h : Host (indirizzo broker)
-p : Porta
-u : Username
-P : Password
-t : Topic
-m : Messaggio
-r : Retain (il messaggio resta in memoria sul broker)

A. CLOUD UNIVERSITA (HiveMQ)
Host: e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud
Porta: 8883 (richiede TLS)
User: univr-studenti
Pass: MQTT-esercitazione2026

Comando Publish:
mosquitto_pub -h e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud -p 8883 -u univr-studenti -P MQTT-esercitazione2026 -t "universita/test" -m "Ciao dal Cloud"

B. LOCALHOST (Proprio PC)
Host: localhost (127.0.0.1)
Porta: 1883
User/Pass: Configurate via mosquitto_passwd (es: admin / password)

Comando Publish con RETAIN (messaggio che resta in memoria):
mosquitto_pub -h localhost -p 1883 -u admin -P password -t "drone/stato" -m "In volo" -r

Comando Subscribe (Ascolto):
mosquitto_sub -h localhost -p 1883 -u admin -P password -t "drone/#" -d


--nuova esecuzione--
Per configurare l'applicazione su un nuovo PC Linux (Ubuntu):


## INSTALLAZIONE E CONFIGURAZIONE BROKER LOCALE TRAMITE MOQUITTO ##

1. Preparazione del sistema:
   sudo apt update
   sudo apt install mosquitto mosquitto-clients -y

2. Creazione dell'utente e della password:
   sudo mosquitto_passwd -c /etc/mosquitto/passwd admin           #chiedera' la password da impostare 2 volte#

3. Configurazione della sicurezza e del Listener:
   sudo nano /etc/mosquitto/conf.d/default.conf

   *incollare:*

   listener 1883 0.0.0.0
   allow_anonymous false
   password_file /etc/mosquitto/passwd 

   *CTRL+O, Invio, CTRL+X*

4. Riavvio del servizio per applicare le modifiche:
   sudo systemctl restart mosquitto
   sudo systemctl enable mosquitto


## ESECUZIONE DEL BROKER LOCALE ##

1. Preparazione sistema:
   sudo apt update
   sudo apt install python3-pip python3-venv -y

2. Posizionamento nella cartella del progetto:
   cd /percorso/della/tua/cartella/MQTT_Tesi

3. Creazione e attivazione ambiente virtuale (venv):
   python3 -m venv .venv
   source .venv/bin/activate

4. Installazione dipendenze:
   pip install fastapi uvicorn paho-mqtt websockets

5. Avvio dell'applicazione:
   uvicorn gateway_mqtt:app --reload

Nota per le esecuzioni successive (una volta configurato tutto):

   cd /percorso/della/tua/cartella/MQTT_Tesi
   source .venv/bin/activate
   uvicorn gateway_mqtt:app --reload

## UTILIZZO DELL'INTERFACCIA WEB (CONFIGURAZIONE CONNESSIONE) ##

Una volta avviato Uvicorn, apri il browser all'indirizzo: http://127.0.0.1:8000
L'interfaccia permette di collegarsi dinamicamente a diversi broker senza modificare il codice.

SCENARIO A: Test Locale (o con il Drone)
- Broker Address: 127.0.0.1
- Connection Type: Local / Drone (Port 1883, Unencrypted)
- Username: admin (o quello configurato)
- Password: la_tua_password
- Topic: drone/# (o il topic specifico)

SCENARIO B: Test Cloud (HiveMQ Università)
- Broker Address: e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud
- Connection Type: Cloud HiveMQ (Port 8883, TLS/SSL)
- Username: univr-studenti
- Password: MQTT-esercitazione2026
- Topic: universita/#

L'applicazione è dotata di ripristino automatico (Auto-Reconnect) tramite WebSocket e gestisce gli errori di connessione TCP (es. IP errato o Broker spento) stampandoli direttamente a schermo nel terminale virtuale della pagina.




## 4.0 NEW STATO DEL PROGETTO E SPECIFICHE DEL DRONE (AGRI DRONES GCS) ##

Per gli sviluppatori che continueranno questo progetto, di seguito sono riportate le specifiche di integrazione, le origini dei dati e i dettagli architetturali dell'interfaccia di volo sviluppata.

**4.1 Ambiente di Test e Rete (Localhost)**
Si specifica che, al momento della stesura di questa applicazione, non è stato ancora reso pubblico l'indirizzo IP definitivo o la configurazione di rete esatta per accedere al drone sul campo. Per questo motivo, **tutti i test di sviluppo dell'applicazione sono stati eseguiti in localhost** (sia per il frontend che per il backend e il broker).

**4.2 Origine dei Comandi e Formule di Spostamento**
[cite_start]Tutti i comandi mappati all'interno della Web App (es. decollo, atterraggio, movimenti e waypoint) sono stati estrapolati in base alle email di coordinamento scambiate con Pietro Dal Degan [cite: 1] e visionando il repository GitHub del progetto del drone: 
`https://github.com/qtLeaf/DjiDroneControl.git`.

- [cite_start]**Controllo base e radiocomando:** Per poter pilotare il drone (modello DJI mini 3 [cite: 1][cite_start]) dal computer, è obbligatorio inviare il comando `enablevs` (che disattiva il controllo tramite levette del telecomando fisico [cite: 1]). [cite_start]Il comando `disablevs` restituisce il controllo al telecomando[cite: 1].
- [cite_start]**Movimenti Manuali (es. `forward <time> <power>`):** [cite: 1]
  - `<time>`: espresso in **millisecondi (ms)**.
  - `<power>`: espresso come valore angolare normalizzato (0 < power <= 1).
  - *Formula di calcolo velocità:* Il drone si sposta calcolando `tempo(ms) * potenza * 10(m/s)` (dove 10m/s è una costante di velocità data dalla modalità del drone).
- [cite_start]**Volo Autonomo (Waypoint):** Il drone accetta il comando di navigazione automatica formattato come `goto <lat> <long> <alt>`, ricevendo l'altitudine in metri e coordinate standard assolute[cite: 1].

**4.3 Topic MQTT dei Comandi: AVVISO DI IMPLEMENTAZIONE**
Il Web-Gateway è impostato per pubblicare i comandi d'azione sul topic **`drone/commands`**. 
**ATTENZIONE:** L'utilizzo del topic `drone/commands` è attualmente **un'idea interna del team frontend** pensata per avere uno spazio isolato su cui pubblicare ed effettuare i test. Pietro non ha ancora ufficializzato o documentato su quale topic esatto lo script di volo in Python (`DjiDroneControl`) rimarrà in ascolto per ricevere la stringa di input. Chi prenderà in mano il progetto dovrà confrontarsi con il team del drone per confermare o modificare questa stringa nel codice sorgente (`collegamento.js`).

**4.4 Gestione Telecamera, Video e Immagini**
L'interfaccia prevede uno spazio ("Plancia di Volo") per l'anteprima video e una "Mappa" per visionare le foto elaborate per una singola zona. Si precisa che **il protocollo di trasmissione per i media non è ancora stato pianificato in via definitiva**.
Allo stato attuale, l'idea in discussione è quella di trasmettere l'immagine in bassissima risoluzione convertita e infilata all'interno dello stesso protocollo MQTT (al fine di avere un canale unico). Tale pratica non è generalmente consigliata in produzioni professionali IoT per via del peso dei file sui Broker, pertanto andrà valutato se mantenere questo approccio in fase finale o affiancare protocolli HTTP/RTSP.

**4.5 Architettura dell'Interfaccia Web (Single Page Application Dinamica)**
L'intera applicazione web è stata progettata come una pagina HTML **dinamica** (Single Page Application - SPA). Questo significa che il passaggio tra i vari menu (es. da "Collegamento" a "Plancia di Volo") non carica mai nuovi file HTML esterni, ma mostra e nasconde dinamicamente diverse porzioni di codice (`div`) presenti all'interno dello stesso `index.html`.
Questa scelta tecnica è obbligatoria: se il browser dovesse cambiare pagina o ricaricare, la connessione **WebSocket** tra l'interfaccia e il backend Python verrebbe interrotta, causando la disconnessione istantanea dal Broker MQTT e forzando l'utente a effettuare nuovamente il login.

## 5.0 Integrazione Mappa Topografica e Storico (Modulo "Adam") ##

L'interfaccia cartografica per la visualizzazione dello storico (Tab 02) è stata sviluppata originariamente come applicazione a sé stante basata su Node.js, Express e PostgreSQL (con estensione spaziale PostGIS).

Integrazione visiva (iFrame): Per evitare conflitti di dipendenze Javascript (es. sovrapposizioni con Leaflet) e mantenere la Single Page Application pulita, l'intera web-app di mappatura viene servita in locale sulla porta 3000 e iniettata nella GCS principale tramite un tag <iframe>.

Mock del Database (Fake DB): Poiché l'applicativo originale interrogava un database PostgreSQL richiedendo i dati formattati tramite la funzione SQL jsonb_build_object, per i test di sviluppo sprovvisti di DB fisico il file server.js è stato modificato inserendo un "Fake DB" in memoria RAM. Questo restituisce il JSON formattato esattamente come lo farebbe PostGIS, permettendo al frontend Javascript (main.js, clustering.js) di renderizzare i marker senza crash.

Fix Marker Leaflet: È stata implementata una funzione CSS personalizzata (L.divIcon) per aggirare il problema delle icone vettoriali predefinite di Leaflet mancanti nel server.

## 6.0 INTEGRAZIONE SIMULATORE 3D (COPPELIASIM - Modulo "Anna") ##

Per testare la GCS e il volo del drone in assenza dell'hardware reale, l'infrastruttura è stata collegata a un simulatore fisico professionale: CoppeliaSim. Il drone virtuale si muove all'interno di una scena 3D (Serra.ttt) gestita da uno script Python (Controller.py).

**6.1 Architettura di Comunicazione (ZMQ + MQTT)**
Il file Controller.py fa da ponte tra due mondi:

   -ZeroMQ (ZMQ): Comunica con CoppeliaSim (tramite la libreria coppeliasim-zmqremoteapi-client) per muovere il drone, leggere i sensori visivi e calcolare la cinematica.

   -MQTT (Paho): È iscritto al broker locale in ascolto sul topic drone/commands e pubblica costantemente sui topic drone/telemetria e drone/video.

**6.2 Traduzione delle Coordinate (GPS vs Cartesian)**
Il simulatore CoppeliaSim ragiona in Metri cartesiani (X, Y, Z) relativi al centro della scena, mentre la GCS invia comandi Waypoint (goto) in Gradi GPS (Latitudine, Longitudine).
Nel Controller.py è stata implementata una conversione matematica al volo: le coordinate inviate dalla web-app vengono sottratte da un punto "Zero" di riferimento (Lat: 45.4320, Lon: 10.9120) e moltiplicate per una costante di conversione terrestre (111319.9 metri per grado), calcolando così il vettore X e Y di spostamento esatto per il motore fisico.

**6.3 Sicurezza Multi-Threading e ZeroMQ (Pattern "Bigliettino")**
Durante lo sviluppo si è riscontrato l'errore critico Operation cannot be accomplished in current state. Questo avviene perché l'API di ZeroMQ non permette di inviare comandi al simulatore da thread secondari (come il thread in background generato dalla ricezione di un messaggio MQTT).

   Soluzione: È stato implementato un pattern di accodamento. La funzione MQTT (on_mqtt_message) non sposta più direttamente il drone, ma salva il comando in una variabile sicura (self.pending_action). Il Loop principale del drone (run), che gira nel thread primario autorizzato da ZMQ, legge costantemente questa variabile e, se trova un comando, lo esegue applicando la fisica.

**6.4 Streaming Video Live (Telecamera FPV via Base64)**

L'anteprima video del drone (Plancia di volo) è stata realizzata implementando un feed in tempo reale dalla telecamera del simulatore:

-Cattura e Compressione: OpenCV (cv2) legge il frame RGB dal Vision Sensor di CoppeliaSim. Per non saturare la banda MQTT, il frame viene convertito in BGR e compresso in formato JPEG al 30% di qualità.

-Codifica Testuale: L'immagine binaria viene convertita in una lunghissima stringa di testo usando Base64 e inviata sul topic drone/video.

-Ottimizzazione Server (FastAPI): Il Web-Gateway in Python riconosce se il topic in transito è il video. In tal caso, per risparmiare preziosi millisecondi, salta l'aggiunta dei tag HTML decorativi e spara la stringa pura via WebSocket al browser.

-Rendering Web: Il Javascript intercetta la stringa riconoscendo l'header standard JPEG Base64 (/9j/), taglia eventuali prefissi in eccesso e la inietta direttamente nel tag <img src="...">, interrompendo l'esecuzione della funzione per evitare che l'enorme blocco di testo venga riversato (spammato) nel terminale di log a schermo.

## COME AVVIARE LA DEMO ##

Per avviare l'intero ecosistema con tutte e tre le sue componenti (Mappa Adam, Backend GCS, Simulatore Anna), rispettare rigorosamente questo ordine per evitare crash di connessione:

**Passo 1: Avvio Servizi di Rete e Mappa**

    Assicurarsi che il broker Mosquitto sia in esecuzione in background (sudo systemctl status mosquitto).

    Aprire un terminale nella directory di Adam (ParteAdam/src) e avviare il server express locale:
    node server.js (Il terminale riporterà "Server attivo su localhost:3000")

**Passo 2: Avvio della Ground Control Station (FastAPI)**

    Aprire un secondo terminale nella cartella del proprio progetto.

    Attivare l'ambiente virtuale: source .venv/bin/activate

    Avviare il Web Gateway: uvicorn gateway_mqtt:app --reload

    Aprire il browser su http://localhost:8000 (l'iFrame della mappa si caricherà in automatico leggendo la porta 3000).

**Passo 3: Avvio Motore Fisico 3D**

    Avviare l'eseguibile di CoppeliaSim (./coppeliasim).

    Caricare la scena Serra.ttt.

    CRITICO: Premere il tasto Play nell'interfaccia di CoppeliaSim per avviare il motore del tempo e della fisica.

**Passo 4: Aggancio del Drone (Script Python)**

    Aprire un terzo terminale nella cartella del controller di Anna.

    Attivare l'ambiente virtuale: source .venv/bin/activate

    Avviare il controller: python Controller.py

    Verifica: Il terminale si pulirà disegnando l'HUD e riporterà in verde la scritta: [MQTT] Connesso al Broker! In ascolto...

**Azione Finale: Dalla pagina web, stabilire la connessione MQTT nella scheda 01. Spostarsi nella scheda 03 e cliccare su Decollo. Il video FPV si accenderà sulla pagina web e il drone nel simulatore si alzerà in volo, rispondendo a tutti i comandi manuali successivi.**