export interface Device {
  id: string;
  name: string;
  type: "ssh" | "serial";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  baudRate?: number;
  serialPortId?: string; // Add this line
}

export interface Macro {
  id: string;
  name: string;
  script: string; // Commands separated by newlines or similar
}

export interface TerminalSession {
  id: string;
  deviceId?: string;
  title: string;
  active: boolean;
  status: "disconnected" | "connecting" | "connected" | "error";
  error?: string;
}

export interface LayoutConfig {
  type: "1x1" | "1x2" | "2x1" | "2x2";
  sessions: (TerminalSession | null)[]; // length based on type
}
