import { Peer, DataConnection } from 'peerjs';
import { NetworkMessage } from '../types';

class MultiplayerManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onDataCallback: ((data: NetworkMessage) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  public myId: string = '';

  constructor() {
    // Lazy initialization
  }

  // Initialize Peer as Host or Client
  async initialize(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a random ID for simplicity (requires only 4 chars for better UX)
      const shortId = Math.random().toString(36).substr(2, 4).toUpperCase();
      this.peer = new Peer(shortId);

      this.peer.on('open', (id) => {
        console.log('My Peer ID is: ' + id);
        this.myId = id;
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        console.log('Incoming connection...');
        this.handleConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error(err);
        reject(err);
      });
    });
  }

  // Join a Host
  connectToHost(hostId: string): void {
    if (!this.peer) return;
    const conn = this.peer.connect(hostId.toUpperCase());
    this.handleConnection(conn);
  }

  private handleConnection(conn: DataConnection) {
    this.conn = conn;

    this.conn.on('open', () => {
      console.log('Connected to peer!');
      if (this.onConnectCallback) this.onConnectCallback();
    });

    this.conn.on('data', (data) => {
      if (this.onDataCallback) {
        this.onDataCallback(data as NetworkMessage);
      }
    });

    this.conn.on('close', () => {
      console.log('Connection closed');
      // Handle disconnect?
    });
  }

  sendMessage(msg: NetworkMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  onData(cb: (data: NetworkMessage) => void) {
    this.onDataCallback = cb;
  }

  onConnect(cb: () => void) {
    this.onConnectCallback = cb;
  }

  cleanup() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.conn = null;
  }
}

export const multiplayerManager = new MultiplayerManager();