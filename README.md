# wss-proxy

nginx Proxy fuer HTTP und WebSocket, gedacht fuer Coolify.

## Auto Reconnect

Ein Reconnect braucht zwei Seiten, deshalb gibt es hier beides.

### 1. Proxy Seite: keine tote IP, kein Neustart noetig

Ohne Laufzeit DNS loest nginx den Backend Namen nur einmal beim Start auf.
Startet das Backend danach mit einer neuen IP neu, liefert der Proxy dauerhaft
502, bis jemand den Container neu startet.

Die Konfiguration umgeht das:

* `resolver ... valid=5s` plus `proxy_pass $backend` ueber eine Variable,
  dadurch wird der Backend Name alle 5 Sekunden neu aufgeloest
* `proxy_connect_timeout 5s`, ein toter Versuch scheitert schnell
* `proxy_socket_keepalive on`, tote TCP Verbindungen werden erkannt
* Ist das Backend weg, kommt statt eines harten Fehlers ein
  `503` mit `Retry-After: 5` und CORS Headern zurueck

Sobald das Backend wieder da ist, funktioniert die naechste Anfrage,
ohne dass der Proxy neu gestartet wird.

### 2. Client Seite: alle 5 Sekunden neu verbinden

Eine geschlossene WebSocket Verbindung kann nur der Client wieder aufbauen,
nginx kann das prinzipiell nicht. Dafuer gibt es
[`client/reconnecting_ws.js`](client/reconnecting_ws.js): unbegrenzte Versuche
alle 5 Sekunden, egal wie lange das Backend weg war, plus eine Queue fuer
Nachrichten, die waehrend der Unterbrechung gesendet werden.

```js
const ws = new ReconnectingWebSocket('wss://proxy.example.com/socket');

ws.addEventListener('open',    () => console.log('verbunden'));
ws.addEventListener('message', (e) => console.log(e.data));

ws.send('hallo');   // wird gepuffert, falls gerade keine Verbindung steht
ws.close();         // beendet endgueltig, danach kein Reconnect mehr
```

## Environment

| Variable | Default | Bedeutung |
| --- | --- | --- |
| `BACKEND_URL` | — | Ziel, z.B. `http://your-backend:3000` |
| `DNS_RESOLVER` | `127.0.0.11` | DNS Server, Default ist das Docker interne DNS |
| `RECONNECT_INTERVAL` | `5` | Sekunden fuer DNS TTL, Connect Timeout und `Retry-After` |

## Start

```sh
BACKEND_URL=http://your-backend:3000 docker compose up -d --build
```

Der Proxy lauscht auf Port 3000.
