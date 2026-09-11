/**
 * Auto Reconnect WebSocket.
 *
 * Baut die Verbindung immer wieder auf, alle RECONNECT_INTERVAL Millisekunden,
 * unbegrenzt, egal wie lange das Backend weg war. Nachrichten, die waehrend
 * einer Unterbrechung gesendet werden, landen in einer Queue und gehen raus,
 * sobald die Verbindung wieder steht.
 *
 * Verwendung:
 *   const ws = new ReconnectingWebSocket('wss://proxy.example.com/socket');
 *   ws.addEventListener('message', (e) => console.log(e.data));
 *   ws.send('hallo');
 */

const RECONNECT_INTERVAL = 5000;

class ReconnectingWebSocket extends EventTarget {
  constructor(url, protocols, options = {}) {
    super();
    this.url = url;
    this.protocols = protocols;
    this.reconnectInterval = options.reconnectInterval ?? RECONNECT_INTERVAL;
    this.queue = [];
    this.closedByUser = false;
    this.socket = null;
    this.timer = null;
    this.connect();
  }

  get readyState() {
    return this.socket ? this.socket.readyState : WebSocket.CONNECTING;
  }

  connect() {
    if (this.closedByUser) return;

    this.socket = new WebSocket(this.url, this.protocols);

    this.socket.addEventListener('open', (event) => {
      const pending = this.queue;
      this.queue = [];
      for (const data of pending) this.socket.send(data);
      this.dispatchEvent(new Event('open'));
      if (typeof this.onopen === 'function') this.onopen(event);
    });

    this.socket.addEventListener('message', (event) => {
      this.dispatchEvent(new MessageEvent('message', { data: event.data }));
      if (typeof this.onmessage === 'function') this.onmessage(event);
    });

    this.socket.addEventListener('error', (event) => {
      this.dispatchEvent(new Event('error'));
      if (typeof this.onerror === 'function') this.onerror(event);
    });

    // Jeder Close, egal aus welchem Grund, plant den naechsten Versuch.
    this.socket.addEventListener('close', (event) => {
      this.dispatchEvent(new CloseEvent('close', { code: event.code, reason: event.reason }));
      if (typeof this.onclose === 'function') this.onclose(event);
      this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    if (this.closedByUser || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    } else {
      this.queue.push(data);
    }
  }

  /** Beendet die Verbindung endgueltig, ohne weiteren Reconnect. */
  close(code, reason) {
    this.closedByUser = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.socket) this.socket.close(code, reason);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReconnectingWebSocket, RECONNECT_INTERVAL };
}
