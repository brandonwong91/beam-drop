import Peer, { DataConnection } from 'peerjs';
import { ConnectionState, FileTransferItem, HtmlPreviewSession, PeerDevice, ProtocolMessage, TextSnippet } from '../types';
import { getDeviceInfo } from './deviceInfo';
import { extractHtmlTitle } from './formatters';
import { playConnectSound, playNotificationSound, playTransferCompleteSound } from './soundEffects';

export interface WebRTCServiceEvents {
  onConnectionStateChange: (state: ConnectionState, message?: string) => void;
  onPeerDeviceChange: (device: PeerDevice | null) => void;
  onTransferUpdate: (transfer: FileTransferItem) => void;
  onTextReceived: (snippet: TextSnippet) => void;
  onHtmlPresented?: (session: HtmlPreviewSession) => void;
  onCodeAssigned?: (code: string) => void;
  onError: (error: string) => void;
}

const CHUNK_SIZE = 32 * 1024; // 32 KB per chunk for optimal WebRTC reliability
const BUFFER_HIGH_THRESHOLD = 512 * 1024; // 512 KB backpressure threshold

export class WebRTCService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private connectionState: ConnectionState = 'idle';
  private events: WebRTCServiceEvents;
  private roomCode: string = '';
  private isHost: boolean = false;
  private peerDevice: PeerDevice | null = null;
  private activeTransfers: Map<string, FileTransferItem> = new Map();
  private receivingChunks: Map<string, { chunks: ArrayBuffer[]; receivedBytes: number; meta: FileTransferItem; lastSpeedUpdate: number; lastBytes: number }> = new Map();
  private pingInterval: number | null = null;
  private lastPingTimestamp: number = 0;
  private isDestroyed: boolean = false;
  private activeHtmlSession: HtmlPreviewSession | null = null;

  constructor(events: WebRTCServiceEvents) {
    this.events = events;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getPeerDevice(): PeerDevice | null {
    return this.peerDevice;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getActiveHtmlSession(): HtmlPreviewSession | null {
    return this.activeHtmlSession;
  }

  public setActiveHtmlSession(session: HtmlPreviewSession | null) {
    this.activeHtmlSession = session;
  }

  private setConnectionState(state: ConnectionState, message?: string) {
    this.connectionState = state;
    this.events.onConnectionStateChange(state, message);
  }

  /**
   * Host a new room with a 4-digit code
   */
  public async hostRoom(preferredCode?: string): Promise<string> {
    this.cleanup();
    this.isDestroyed = false;
    this.isHost = true;
    
    const code = preferredCode || Math.floor(1000 + Math.random() * 9000).toString();
    this.roomCode = code;
    this.setConnectionState('initializing', `Registering 4-digit code: ${code}...`);

    const peerId = `p2pdrop-${code}-host`;

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
          debug: 0,
        });

        this.peer = peer;

        peer.on('open', (id) => {
          if (this.isDestroyed) return;
          this.setConnectionState('ready', `Space ready! Share code ${code} to connect.`);
          if (this.events.onCodeAssigned) {
            this.events.onCodeAssigned(code);
          }
          resolve(code);
        });

        peer.on('connection', (conn) => {
          if (this.connection) {
            // Already connected to one peer, close previous or allow reconnect
            try { this.connection.close(); } catch {}
          }
          this.setupConnection(conn);
        });

        peer.on('error', (err) => {
          if (this.isDestroyed) return;
          // If code is already taken, generate another 4-digit code automatically
          if (err.type === 'unavailable-id') {
            const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
            this.hostRoom(nextCode).then(resolve).catch(reject);
            return;
          }
          this.setConnectionState('error', err.message || 'Peer connection error');
          this.events.onError(err.message || 'Signaling error');
          reject(err);
        });

        peer.on('disconnected', () => {
          if (this.connectionState === 'connected') {
            this.setConnectionState('disconnected', 'Signaling disconnected (P2P might still be active)');
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create host';
        this.setConnectionState('error', msg);
        reject(err);
      }
    });
  }

  /**
   * Join an existing room via 4-digit code
   */
  public async joinRoom(code: string): Promise<void> {
    this.cleanup();
    this.isDestroyed = false;
    this.isHost = false;
    this.roomCode = code.trim();

    this.setConnectionState('connecting', `Searching for peer with code ${this.roomCode}...`);

    const clientId = `p2pdrop-${this.roomCode}-client-${Math.random().toString(36).substring(2, 7)}`;
    const hostPeerId = `p2pdrop-${this.roomCode}-host`;

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer(clientId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
          debug: 0,
        });

        this.peer = peer;

        peer.on('open', () => {
          if (this.isDestroyed) return;
          const conn = peer.connect(hostPeerId, {
            reliable: true,
          });
          this.setupConnection(conn);
          resolve();
        });

        peer.on('error', (err) => {
          if (this.isDestroyed) return;
          const errorMsg = err.type === 'peer-unavailable' 
            ? `Room ${code} not found. Please check the 4-digit code on the other device.`
            : (err.message || 'Connection error');
          this.setConnectionState('error', errorMsg);
          this.events.onError(errorMsg);
          reject(new Error(errorMsg));
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join room';
        this.setConnectionState('error', msg);
        reject(err);
      }
    });
  }

  /**
   * Configure the established DataConnection
   */
  private setupConnection(conn: DataConnection) {
    this.connection = conn;
    this.setConnectionState('connecting', 'Establishing secure P2P DataChannel...');

    conn.on('open', () => {
      if (this.isDestroyed) return;
      this.setConnectionState('connected', 'Secure P2P Connection Established');
      playConnectSound();

      // Send device handshake
      const myInfo = getDeviceInfo();
      const handshakeMsg: ProtocolMessage = {
        type: 'handshake',
        device: {
          name: myInfo.name,
          browser: myInfo.browser,
          os: myInfo.os,
        },
      };
      this.sendMessage(handshakeMsg);

      // Start RTT ping heartbeat
      this.startPingLoop();

      // If we have an active HTML preview session, present it to the peer
      if (this.activeHtmlSession) {
        this.sendMessage({
          type: 'present-html',
          id: this.activeHtmlSession.id,
          fileName: this.activeHtmlSession.fileName,
          htmlContent: this.activeHtmlSession.htmlContent,
          fileSize: this.activeHtmlSession.fileSize,
          timestamp: Date.now(),
        });
      } else if (!this.isHost) {
        // As client, request active HTML if host is presenting one
        this.sendMessage({
          type: 'request-active-html',
        });
      }
    });

    conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    conn.on('close', () => {
      this.stopPingLoop();
      this.peerDevice = null;
      this.events.onPeerDeviceChange(null);
      this.setConnectionState('disconnected', 'Peer disconnected');
    });

    conn.on('error', (err) => {
      this.setConnectionState('error', `Connection error: ${err.message || 'DataChannel failure'}`);
      this.events.onError(err.message || 'DataChannel error');
    });
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = window.setInterval(() => {
      if (this.connection && this.connection.open) {
        this.lastPingTimestamp = performance.now();
        this.sendMessage({
          type: 'ping',
          timestamp: this.lastPingTimestamp,
        });
      }
    }, 4000);
  }

  private stopPingLoop() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public sendMessage(msg: ProtocolMessage) {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(msg);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  }

  /**
   * Handle all incoming protocol messages over the WebRTC data channel
   */
  private handleIncomingData(raw: unknown) {
    try {
      const msg = raw as ProtocolMessage;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'handshake': {
          const device: PeerDevice = {
            id: this.connection?.peer || 'remote-peer',
            name: msg.device.name,
            browser: msg.device.browser,
            os: msg.device.os,
            isHost: !this.isHost,
            connectedAt: Date.now(),
          };
          this.peerDevice = device;
          this.events.onPeerDeviceChange(device);
          break;
        }

        case 'ping': {
          this.sendMessage({
            type: 'pong',
            timestamp: msg.timestamp,
          });
          break;
        }

        case 'pong': {
          const rtt = Math.round(performance.now() - msg.timestamp);
          if (this.peerDevice) {
            this.peerDevice.rtt = rtt;
            this.events.onPeerDeviceChange({ ...this.peerDevice });
          }
          break;
        }

        case 'text-message': {
          playNotificationSound();
          this.events.onTextReceived({
            id: msg.id,
            text: msg.text,
            timestamp: msg.timestamp,
            sender: 'peer',
          });
          break;
        }

        case 'file-meta': {
          const item: FileTransferItem = {
            id: msg.id,
            name: msg.name,
            size: msg.size,
            type: msg.mimeType,
            progress: 0,
            bytesTransferred: 0,
            speed: 0,
            status: 'transferring',
            isSender: false,
            startTime: Date.now(),
          };
          this.activeTransfers.set(msg.id, item);
          this.receivingChunks.set(msg.id, {
            chunks: new Array(msg.totalChunks),
            receivedBytes: 0,
            meta: item,
            lastSpeedUpdate: performance.now(),
            lastBytes: 0,
          });
          this.events.onTransferUpdate(item);
          break;
        }

        case 'file-chunk': {
          const receiver = this.receivingChunks.get(msg.id);
          if (!receiver) return;

          let chunkBuffer: ArrayBuffer;
          if (msg.data instanceof ArrayBuffer) {
            chunkBuffer = msg.data;
          } else if (typeof msg.data === 'string') {
            // Base64 or binary string
            const binaryString = atob(msg.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            chunkBuffer = bytes.buffer;
          } else if ((msg.data as unknown as { buffer: ArrayBuffer }).buffer) {
            chunkBuffer = (msg.data as unknown as { buffer: ArrayBuffer }).buffer;
          } else {
            return;
          }

          receiver.chunks[msg.chunkIndex] = chunkBuffer;
          receiver.receivedBytes += chunkBuffer.byteLength;

          const now = performance.now();
          const elapsed = (now - receiver.lastSpeedUpdate) / 1000;
          let speed = receiver.meta.speed;
          if (elapsed >= 0.3) {
            const bytesSince = receiver.receivedBytes - receiver.lastBytes;
            speed = bytesSince / elapsed;
            receiver.lastSpeedUpdate = now;
            receiver.lastBytes = receiver.receivedBytes;
          }

          const progress = Math.min(100, Math.round((receiver.receivedBytes / receiver.meta.size) * 100));
          const remainingBytes = Math.max(0, receiver.meta.size - receiver.receivedBytes);
          const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

          const updated: FileTransferItem = {
            ...receiver.meta,
            progress,
            bytesTransferred: receiver.receivedBytes,
            speed,
            timeRemaining,
          };
          receiver.meta = updated;
          this.activeTransfers.set(msg.id, updated);
          this.events.onTransferUpdate(updated);
          break;
        }

        case 'file-complete': {
          const receiver = this.receivingChunks.get(msg.id);
          if (!receiver) return;

          const blob = new Blob(receiver.chunks, { type: receiver.meta.type || 'application/octet-stream' });
          const downloadUrl = URL.createObjectURL(blob);

          const completedItem: FileTransferItem = {
            ...receiver.meta,
            progress: 100,
            bytesTransferred: receiver.meta.size,
            speed: 0,
            timeRemaining: 0,
            status: 'completed',
            blob,
            downloadUrl,
            completedAt: Date.now(),
          };

          this.receivingChunks.delete(msg.id);
          this.activeTransfers.set(msg.id, completedItem);
          this.events.onTransferUpdate(completedItem);
          playTransferCompleteSound();
          break;
        }

        case 'present-html': {
          playNotificationSound();
          const session: HtmlPreviewSession = {
            id: msg.id,
            fileName: msg.fileName,
            htmlContent: msg.htmlContent,
            fileSize: msg.fileSize,
            source: 'peer',
            timestamp: msg.timestamp,
            title: extractHtmlTitle(msg.htmlContent) || undefined,
          };
          this.activeHtmlSession = session;
          if (this.events.onHtmlPresented) {
            this.events.onHtmlPresented(session);
          }
          break;
        }

        case 'request-active-html': {
          if (this.activeHtmlSession) {
            this.sendMessage({
              type: 'present-html',
              id: this.activeHtmlSession.id,
              fileName: this.activeHtmlSession.fileName,
              htmlContent: this.activeHtmlSession.htmlContent,
              fileSize: this.activeHtmlSession.fileSize,
              timestamp: this.activeHtmlSession.timestamp,
            });
          }
          break;
        }

        case 'file-cancel': {
          const receiver = this.receivingChunks.get(msg.id);
          if (receiver) {
            const cancelledItem: FileTransferItem = {
              ...receiver.meta,
              status: 'cancelled',
              errorMessage: 'Transfer cancelled by sender',
            };
            this.receivingChunks.delete(msg.id);
            this.activeTransfers.set(msg.id, cancelledItem);
            this.events.onTransferUpdate(cancelledItem);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling data channel message:', err);
    }
  }

  /**
   * Send a file over the P2P DataChannel with backpressure flow control
   */
  public async sendFile(file: File): Promise<string> {
    if (!this.connection || !this.connection.open) {
      throw new Error('Not connected to any peer');
    }

    const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const transferItem: FileTransferItem = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      progress: 0,
      bytesTransferred: 0,
      speed: 0,
      status: 'transferring',
      isSender: true,
      file,
      startTime: Date.now(),
    };

    this.activeTransfers.set(id, transferItem);
    this.events.onTransferUpdate(transferItem);

    // Send metadata
    this.sendMessage({
      type: 'file-meta',
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
      chunkSize: CHUNK_SIZE,
    });

    // Stream file slices
    this.streamFileChunks(id, file, totalChunks);
    return id;
  }

  private async streamFileChunks(id: string, file: File, totalChunks: number) {
    let offset = 0;
    let chunkIndex = 0;
    let bytesSent = 0;
    let lastSpeedTime = performance.now();
    let lastSpeedBytes = 0;

    const rawDataChannel = (this.connection as unknown as { _dc?: RTCDataChannel; dataChannel?: RTCDataChannel })._dc || 
                           (this.connection as unknown as { dataChannel?: RTCDataChannel }).dataChannel;

    try {
      while (offset < file.size) {
        const item = this.activeTransfers.get(id);
        if (!item || item.status === 'cancelled') {
          this.sendMessage({ type: 'file-cancel', id });
          return;
        }

        // WebRTC DataChannel backpressure management
        if (rawDataChannel && rawDataChannel.bufferedAmount > BUFFER_HIGH_THRESHOLD) {
          await new Promise<void>((resolve) => {
            const onBufferedAmountLow = () => {
              rawDataChannel.removeEventListener('bufferedamountlow', onBufferedAmountLow);
              resolve();
            };
            rawDataChannel.bufferedAmountLowThreshold = BUFFER_HIGH_THRESHOLD / 2;
            rawDataChannel.addEventListener('bufferedamountlow', onBufferedAmountLow);
            // Fallback timeout in case event is missed
            setTimeout(resolve, 50);
          });
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const arrayBuffer = await slice.arrayBuffer();

        this.sendMessage({
          type: 'file-chunk',
          id,
          chunkIndex,
          data: arrayBuffer,
        });

        offset += slice.size;
        bytesSent += slice.size;
        chunkIndex++;

        const now = performance.now();
        const elapsed = (now - lastSpeedTime) / 1000;
        let speed = item.speed;
        if (elapsed >= 0.3) {
          speed = (bytesSent - lastSpeedBytes) / elapsed;
          lastSpeedTime = now;
          lastSpeedBytes = bytesSent;
        }

        const progress = Math.min(100, Math.round((bytesSent / file.size) * 100));
        const remainingBytes = Math.max(0, file.size - bytesSent);
        const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

        const updated: FileTransferItem = {
          ...item,
          progress,
          bytesTransferred: bytesSent,
          speed,
          timeRemaining,
        };
        this.activeTransfers.set(id, updated);
        this.events.onTransferUpdate(updated);

        // Micro-yield to prevent browser UI thread blocking
        if (chunkIndex % 8 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // Finish signal
      this.sendMessage({ type: 'file-complete', id });

      const finalItem: FileTransferItem = {
        ...this.activeTransfers.get(id)!,
        progress: 100,
        bytesTransferred: file.size,
        speed: 0,
        timeRemaining: 0,
        status: 'completed',
        completedAt: Date.now(),
      };
      this.activeTransfers.set(id, finalItem);
      this.events.onTransferUpdate(finalItem);
      playTransferCompleteSound();
    } catch (err) {
      console.error('Error streaming file:', err);
      const failedItem: FileTransferItem = {
        ...this.activeTransfers.get(id)!,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Transfer interrupted',
      };
      this.activeTransfers.set(id, failedItem);
      this.events.onTransferUpdate(failedItem);
      this.sendMessage({ type: 'file-cancel', id });
    }
  }

  public cancelTransfer(id: string) {
    const item = this.activeTransfers.get(id);
    if (item && item.status === 'transferring') {
      item.status = 'cancelled';
      this.activeTransfers.set(id, { ...item });
      this.events.onTransferUpdate({ ...item });
      this.sendMessage({ type: 'file-cancel', id });
    }
  }

  public sendText(text: string): TextSnippet {
    const snippet: TextSnippet = {
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      timestamp: Date.now(),
      sender: 'me',
    };
    this.sendMessage({
      type: 'text-message',
      id: snippet.id,
      text: snippet.text,
      timestamp: snippet.timestamp,
    });
    return snippet;
  }

  /**
   * Broadcast/Present an HTML preview to the connected peer
   */
  public presentHtml(fileName: string, htmlContent: string, fileSize?: number): HtmlPreviewSession {
    const size = fileSize || new Blob([htmlContent]).size;
    const session: HtmlPreviewSession = {
      id: `html-session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName,
      htmlContent,
      fileSize: size,
      source: 'local',
      timestamp: Date.now(),
      title: extractHtmlTitle(htmlContent) || undefined,
    };

    this.activeHtmlSession = session;

    this.sendMessage({
      type: 'present-html',
      id: session.id,
      fileName: session.fileName,
      htmlContent: session.htmlContent,
      fileSize: session.fileSize,
      timestamp: session.timestamp,
    });

    return session;
  }

  public cleanup() {
    this.isDestroyed = true;
    this.stopPingLoop();
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.peerDevice = null;
    this.activeTransfers.clear();
    this.receivingChunks.clear();
    this.connectionState = 'idle';
  }
}
