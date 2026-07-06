import { create } from "zustand";
import { Device, Macro, LayoutConfig, TerminalSession } from "./types";
import { v4 as uuidv4 } from "uuid";

interface AppState {
  devices: Device[];
  macros: Macro[];
  layout: LayoutConfig;
  activeSessionId: string | null;

  loadData: () => Promise<void>;
  
  // Devices
  addDevice: (device: Omit<Device, "id">) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  deleteDevice: (id: string) => void;

  // Macros
  addMacro: (macro: Omit<Macro, "id">) => void;
  updateMacro: (id: string, macro: Partial<Macro>) => void;
  deleteMacro: (id: string) => void;

  // Layout & Sessions
  setLayoutType: (type: LayoutConfig["type"]) => void;
  assignSession: (index: number, deviceId: string) => void;
  closeSession: (index: number) => void;
  updateSessionStatus: (index: number, status: TerminalSession["status"], error?: string) => void;
  setActiveSession: (id: string | null) => void;
}

const defaultLayout: LayoutConfig = { type: "1x1", sessions: [null] };

const saveData = async (devices: Device[], macros: Macro[]) => {
  try {
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devices, macros })
    });
  } catch (err) {
    console.error("Failed to save data", err);
  }
};

export const useStore = create<AppState>((setStore, getStore) => ({
  devices: [],
  macros: [],
  layout: defaultLayout,
  activeSessionId: null,

  loadData: async () => {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      setStore({ devices: data.devices || [], macros: data.macros || [] });
    } catch (err) {
      console.error("Failed to load data", err);
      setStore({ devices: [], macros: [] });
    }
  },

  addDevice: (device) => {
    const newDevice = { ...device, id: uuidv4() };
    const devices = [...getStore().devices, newDevice];
    saveData(devices, getStore().macros);
    setStore({ devices });
  },

  updateDevice: (id, updated) => {
    const devices = getStore().devices.map(d => d.id === id ? { ...d, ...updated } : d);
    saveData(devices, getStore().macros);
    setStore({ devices });
  },

  deleteDevice: (id) => {
    const devices = getStore().devices.filter(d => d.id !== id);
    saveData(devices, getStore().macros);
    setStore({ devices });
  },

  addMacro: (macro) => {
    const newMacro = { ...macro, id: uuidv4() };
    const macros = [...getStore().macros, newMacro];
    saveData(getStore().devices, macros);
    setStore({ macros });
  },

  updateMacro: (id, updated) => {
    const macros = getStore().macros.map(m => m.id === id ? { ...m, ...updated } : m);
    saveData(getStore().devices, macros);
    setStore({ macros });
  },

  deleteMacro: (id) => {
    const macros = getStore().macros.filter(m => m.id !== id);
    saveData(getStore().devices, macros);
    setStore({ macros });
  },

  setLayoutType: (type) => {
    const currentSessions = getStore().layout.sessions;
    let newLength = 1;
    if (type === "1x2" || type === "2x1") newLength = 2;
    if (type === "2x2") newLength = 4;

    const newSessions = Array.from({ length: newLength }).map((_, i) => 
      currentSessions[i] || null
    );

    setStore({ layout: { type, sessions: newSessions } });
  },

  assignSession: (index, deviceId) => {
    const { devices, layout } = getStore();
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const newSession: TerminalSession = {
      id: uuidv4(),
      deviceId,
      title: device.name,
      active: true,
      status: "connecting"
    };

    const newSessions = [...layout.sessions];
    newSessions[index] = newSession;

    setStore({ 
      layout: { ...layout, sessions: newSessions },
      activeSessionId: newSession.id
    });
  },

  closeSession: (index) => {
    const { layout } = getStore();
    const newSessions = [...layout.sessions];
    newSessions[index] = null;
    setStore({ layout: { ...layout, sessions: newSessions } });
  },

  updateSessionStatus: (index, status, error) => {
    const { layout } = getStore();
    const newSessions = [...layout.sessions];
    if (newSessions[index]) {
      newSessions[index] = { ...newSessions[index]!, status, error };
      setStore({ layout: { ...layout, sessions: newSessions } });
    }
  },

  setActiveSession: (id) => {
    setStore({ activeSessionId: id });
  }
}));
