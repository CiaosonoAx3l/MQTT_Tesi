/* ============================================================
   GCS AND WEBSOCKET LOGIC
   ============================================================ */
const GCS = (() => {
    let ws = null;
    let terminal = null;

    function setStatus(online) {
        document.querySelectorAll('.status-dot').forEach(d => {
            d.className = 'status-dot ' + (online ? 'online' : 'offline');
        });
        document.querySelectorAll('.status-text').forEach(el => {
            el.textContent = online ? 'ONLINE — Connected' : 'OFFLINE — Disconnected';
            el.style.color = online ? 'var(--green)' : 'var(--red)';
        });
        sessionStorage.setItem('gcs_online', online ? '1' : '0');
    }

    function log(html, cls = '') {
        if (!terminal) terminal = document.getElementById('terminal');
        if (!terminal) return;
        const d = document.createElement('div');
        d.className = 'msg' + (cls ? ' ' + cls : '');
        d.innerHTML = html;
        terminal.appendChild(d);
        terminal.scrollTop = terminal.scrollHeight;
    }

    // NEW: Function to clear the terminal log
    function clearTerminal() {
        if (!terminal) terminal = document.getElementById('terminal');
        if (terminal) terminal.innerHTML = '<div class="msg" style="color:var(--text-muted); font-style:italic;">Log cleared.</div>';
    }

    function updateHUDFromTelemetry(msg) {
        if(!msg) return;

        let altMatch = msg.match(/(?:ALT|alt|quota)[:=]\s*([0-9.]+)/i);
        if(altMatch && document.getElementById('hud-alt')) {
            document.getElementById('hud-alt').textContent = `ALT: ${altMatch[1]} m`;
        }

        let batMatch = msg.match(/(?:BAT|bat|batteria)[:=]\s*([0-9]+)/i);
        if(batMatch && document.getElementById('hud-bat')) {
            let batVal = parseInt(batMatch[1]);
            let badge = document.getElementById('hud-bat');
            badge.textContent = `BAT: ${batVal}%`;
            badge.className = batVal < 30 ? 'hud-badge red' : 'hud-badge amber';
        }

        let spdMatch = msg.match(/(?:SPD|spd|speed|velocita)[:=]\s*([0-9.]+)/i);
        if(spdMatch && document.getElementById('hud-speed')) {
            document.getElementById('hud-speed').textContent = `SPD: ${spdMatch[1]} km/h`;
        }

        // ADDED: GPS coordinates extraction and sending to the Map!
        let gpsMatch = msg.match(/(?:GPS)[:=]\s*([0-9.-]+),\s*([0-9.-]+)/i);
        if(gpsMatch && document.getElementById('hud-gps')) {
            let currentLat = parseFloat(gpsMatch[1]);
            let currentLon = parseFloat(gpsMatch[2]);
            
            // 1. Show 7 decimals to see micro-movements (8 centimeters per click)
            document.getElementById('hud-gps').textContent = `GPS: ${currentLat.toFixed(7)}, ${currentLon.toFixed(7)}`;

            // 2. Pass the coordinates secretly through the iframe walls to Adam!
            const mapIframe = document.querySelector('#map-tab iframe');
            if(mapIframe && mapIframe.contentWindow) {
                mapIframe.contentWindow.postMessage({ type: 'DRONE_LIVE_POS', lat: currentLat, lon: currentLon }, '*');
            }
        }
    }

    function initWebSocket(onReady) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            if (onReady) onReady();
            return;
        }

        ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
            log('<span class="sys">[WS] Channel open to local gateway.</span>', 'sys');
            if (onReady) onReady();
        };

        ws.onmessage = (event) => {
            const msgStr = typeof event.data === 'string' ? event.data : '';

            // 1. VIDEO MANAGEMENT (Ignore if it's a Base64 image)
            const imgIndex = msgStr.indexOf('/9j/');
            if (imgIndex !== -1 && msgStr.length > 500) {
                const pureBase64 = msgStr.substring(imgIndex);
                const videoImg = document.getElementById('live-video');
                if (videoImg) {
                    videoImg.src = "data:image/jpeg;base64," + pureBase64;
                    videoImg.style.display = 'block'; 
                    const offlineText = document.getElementById('offline-text');
                    if (offlineText) offlineText.style.display = 'none'; 
                }
                return; 
            }

            // 2. LOG MANAGEMENT (Avoid telemetry spam!)
            // If the string does NOT contain telemetry markers, then print it in the log
            if (!msgStr.includes('ALT:') && !msgStr.includes('BAT:') && !msgStr.includes('SPD:')) {
                log(msgStr);
            }

            // 3. STATUS AND HUD UPDATE (This always happens)
            if (msgStr.includes('[SYSTEM] Connected!')) setStatus(true);
            if (msgStr.includes('[ERROR]') || msgStr.includes('[CRITICAL ERROR]')) setStatus(false);
            
            updateHUDFromTelemetry(msgStr);
        };

        ws.onclose = () => {
            log('<span style="color:var(--red)">[WS] WebSocket connection closed.</span>');
            setStatus(false);
            ws = null;
        };

        ws.onerror = () => {
            log('<span style="color:var(--red)">[WS] Unable to reach the gateway (localhost:8000).</span>');
        };
    }

    function send(obj) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Connection not active. Go to the Connection page and reconnect.');
            return false;
        }
        ws.send(JSON.stringify(obj));
        return true;
    }

    function connect(params) {
        sessionStorage.setItem('gcs_conn', JSON.stringify(params));
        const doSend = () => send({
            action: 'connect',
            broker: params.broker,
            connection_type: params.connection_type,
            username: params.username,
            password: params.password,
            topic: params.topic
        });

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            initWebSocket(doSend);
        } else {
            doSend();
        }
    }

    function sendCommand(cmd) {
        return send({ action: 'command', target_topic: 'drone/commands', payload: cmd });
    }

    function quickSwitchProfile(value) {
        const fields = {
            local: { broker: 'localhost', connection_type: 'standard', username: 'admin', password: '160304' },
            cloud: { broker: 'e0d996a0720a4a25ae1a34becc9e8a90.s1.eu.hivemq.cloud', connection_type: 'secure', username: 'univr-studenti', password: 'MQTT-esercitazione2026' }
        };
        const f = fields[value];
        if (!f) return;
        ['broker','connection_type','username','password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = f[id];
        });
    }

    function toggleTelemetry() {
        const d = document.getElementById('telemetry-drawer');
        if (!d) return;
        d.classList.toggle('open');
    }

    function updateDynamicSubscription() {
        const t = document.getElementById('dynamic_topic');
        if (!t || !t.value) return;
        const raw = sessionStorage.getItem('gcs_conn');
        const params = raw ? JSON.parse(raw) : {};
        send({ action: 'connect', ...params, topic: t.value });
        log(`<span style="color:var(--amber)">[SYS] Topic changed → ${t.value}</span>`);
    }

    function init(opts = {}) {
        terminal = document.getElementById('terminal');
        const online = sessionStorage.getItem('gcs_online') === '1';
        setStatus(online);
        
        if (opts.autoReconnect) {
            const raw = sessionStorage.getItem('gcs_conn');
            if (raw) {
                const params = JSON.parse(raw);
                initWebSocket(() => {
                    setTimeout(() => send({
                        action: 'connect',
                        ...params
                    }), 300);
                });
            }
        }
    }

    // Exposed 'clearTerminal' and 'log' to be usable outside
    return { init, connect, send, sendCommand, toggleTelemetry, updateDynamicSubscription, quickSwitchProfile, clearTerminal, log };
})();


/* ============================================================
   PAGE LOGIC (SPA Tabs, Map, Flight)
   ============================================================ */

function switchTab(tabId, event) {
    if (event) event.preventDefault(); 
    
    document.querySelectorAll('.page-inner').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tabs a').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    
    // Removed Leaflet's map.invalidateSize() since the map is now an iframe
}

document.addEventListener("DOMContentLoaded", () => {
    GCS.init({ autoReconnect: true });
    
    // ============================================================
    // [DEPRECATED] OLD JAVASCRIPT MAP CODE
    // Kept commented to avoid losing the logic if needed
    // ============================================================
    /*
    let map;
    let currentZone = null;

    map = L.map('map', { zoomControl: true }).setView([45.435, 10.913], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri', maxZoom: 19
    }).addTo(map);

    function makeIcon(color) {
        return L.divIcon({
            className: '',
            html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 3px rgba(0,194,255,0.4);cursor:pointer;"></div>`,
            iconSize: [12,12], iconAnchor: [6,6]
        });
    }

    const ZONES = [
        { id: 'alfa', name: 'Zona Alfa', lat: 45.432, lon: 10.912, readings: [{ temp: 22.5 }], images: [] },
        { id: 'beta', name: 'Zona Beta', lat: 45.435, lon: 10.919, readings: [{ temp: 28.1 }], images: [] }
    ];

    ZONES.forEach(zone => {
        const marker = L.marker([zone.lat, zone.lon], { icon: makeIcon('#00c2ff') }).addTo(map)
            .bindTooltip(zone.name, { className: 'leaflet-tooltip', direction: 'top' });
        marker.on('click', () => loadZone(zone));
    });

    map.on('mousemove', e => {
        const badge = document.getElementById('coord-badge');
        if(badge) badge.textContent = `${e.latlng.lat.toFixed(5)}° N · ${e.latlng.lng.toFixed(5)}° E`;
    });

    function loadZone(zone) {
        currentZone = zone;
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('pin-data').style.display = 'block';
        document.getElementById('pin-title').textContent = 'Anagrafica: ' + zone.name;
        document.getElementById('pin-coords').textContent = `${zone.lat.toFixed(5)}° N, ${zone.lon.toFixed(5)}° E`;
        map.flyTo([zone.lat, zone.lon], 16, { duration: 0.8 });
    }
    */
});

// ==========================================
// FLIGHT COMMANDS AND MQTT MANAGEMENT
// ==========================================
function doConnect() {
    const params = {
        broker:          document.getElementById('broker').value,
        connection_type: document.getElementById('connection_type').value,
        username:        document.getElementById('username').value,
        password:        document.getElementById('password').value,
        topic:           document.getElementById('topic').value
    };
    document.getElementById('telemetry-drawer').classList.add('open');
    GCS.connect(params);
}

function cmd(command) { GCS.sendCommand(command); }

function manual(direction) {
    const time  = document.getElementById('cmd_time').value;
    const power = parseFloat(document.getElementById('cmd_power').value).toFixed(1);
    GCS.sendCommand(`${direction} ${time} ${power}`);
}

function sendWaypoint() {
    const lat = document.getElementById('wp_lat').value;
    const lon = document.getElementById('wp_lon').value;
    const alt = document.getElementById('wp_alt').value;
    if (!lat || !lon || !alt) { alert('Please enter lat, lon, and altitude.'); return; }
    GCS.sendCommand(`goto ${lat} ${lon} ${alt}`);
}

function takePhoto() {
    // Send command to drone (kept for backend sync if necessary)
    GCS.sendCommand('photo');
    
    // Visual flash effect on the interface
    const feed = document.getElementById('video-feed');
    feed.style.filter = 'brightness(3)';
    setTimeout(() => feed.style.filter = '', 120);

    // Save current frame locally
    const videoImg = document.getElementById('live-video');
    if (videoImg && videoImg.src && videoImg.src.startsWith('data:image')) {
        // Create an invisible link to trigger the download
        const a = document.createElement('a');
        a.href = videoImg.src;
        
        // Generate a filename with the current timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `drone_snapshot_${timestamp}.jpg`;
        
        document.body.appendChild(a);
        a.click(); // Trigger download
        document.body.removeChild(a); // Cleanup
        
        GCS.log('<span style="color:var(--green)">[SYS] Snapshot saved locally.</span>');
    } else {
        GCS.log('<span style="color:var(--red)">[ERROR] No video feed available to snapshot.</span>');
    }
}

// Export functions kept as placeholders if needed externally
function downloadCSV() { alert('CSV Download in preparation...'); }
function downloadZIP() { alert('ZIP Download in preparation...'); }