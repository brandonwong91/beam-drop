export type ConnectionState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface PeerDevice {
  id: string;
  name: string;
  browser: string;
  os: string;
  isHost: boolean;
  connectedAt?: number;
  rtt?: number;
}

export type TransferStatus = 'queued' | 'transferring' | 'completed' | 'cancelled' | 'error';

export interface FileTransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number; // 0 to 100
  bytesTransferred: number;
  speed: number; // bytes per second
  timeRemaining?: number; // seconds
  status: TransferStatus;
  isSender: boolean;
  file?: File;
  blob?: Blob;
  downloadUrl?: string;
  startTime?: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface TextSnippet {
  id: string;
  text: string;
  timestamp: number;
  sender: 'me' | 'peer';
}

export type ProtocolMessage =
  | {
      type: 'handshake';
      device: {
        name: string;
        browser: string;
        os: string;
      };
    }
  | {
      type: 'ping';
      timestamp: number;
    }
  | {
      type: 'pong';
      timestamp: number;
    }
  | {
      type: 'file-meta';
      id: string;
      name: string;
      size: number;
      mimeType: string;
      totalChunks: number;
      chunkSize: number;
    }
  | {
      type: 'file-chunk';
      id: string;
      chunkIndex: number;
      data: ArrayBuffer | string; // binary chunk
    }
  | {
      type: 'file-complete';
      id: string;
    }
  | {
      type: 'file-cancel';
      id: string;
    }
  | {
      type: 'text-message';
      id: string;
      text: string;
      timestamp: number;
    };
