import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import { Device } from "../types";
import { Play, Plus, Trash2, Edit2, Terminal as TerminalIcon, Usb, X, Search, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function DeviceManager() {
  const { devices, addDevice, updateDevice, deleteDevice, layout, assignSession, activeSessionId } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<Partial<Device>>({ type: "ssh", port: 22 });
  const [showPassword, setShowPassword] = useState(false);
  
  const [authorizedPorts, setAuthorizedPorts] = useState<any[]>([]);

  useEffect(() => {
    if ('serial' in navigator) {
      try {
        (navigator as any).serial.getPorts().then((ports: any) => {
          setAuthorizedPorts(ports);
        }).catch((e: any) => console.error("Serial getPorts error:", e));
      } catch (e) {
        console.error("Serial not allowed or error:", e);
      }
    }
  }, [isEditing]);

  const requestNewPort = async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      const info = port.getInfo();
      const id = `${info.usbVendorId}-${info.usbProductId}`;
      setEditingDevice(prev => ({ ...prev, serialPortId: id, name: prev.name || `COM Device (${id})` }));
      
      const ports = await (navigator as any).serial.getPorts();
      setAuthorizedPorts(ports);
    } catch (e) {
      console.error(e);
    }
  };

  const isFormValid = () => {
    if (!editingDevice.name) return false;
    if (editingDevice.type === "ssh") {
      return !!(editingDevice.host && editingDevice.port && editingDevice.username);
    } else if (editingDevice.type === "serial") {
      // serialPortId might be empty if they didn't select, but it's required to connect.
      // let's say it's valid if they have a name, maybe they don't have the device plugged in right now.
      // But better if we enforce serialPortId if we have authorized ports? 
      // Actually, let's just make it required.
      return true; // We'll keep it simple for serial for now since they might just want to save the name and baudrate
    }
    return false;
  };

  const handleSave = () => {
    if (isFormValid()) {
      if (editingId) {
        updateDevice(editingId, editingDevice);
      } else {
        addDevice(editingDevice as Omit<Device, "id">);
      }
      setIsEditing(false);
      setEditingId(null);
      setEditingDevice({ type: "ssh", port: 22 });
      setShowPassword(false);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingId(device.id);
    setEditingDevice({ ...device });
    setIsEditing(true);
    setShowPassword(false);
  };

  const connectDevice = (deviceId: string) => {
    let targetIndex = layout.sessions.findIndex(s => s === null);
    
    if (targetIndex === -1) {
      if (layout.type === "1x1") {
        useStore.getState().setLayoutType("1x2");
        targetIndex = 1;
      } else if (layout.type === "1x2" || layout.type === "2x1") {
        useStore.getState().setLayoutType("2x2");
        targetIndex = 2;
      } else {
        targetIndex = layout.sessions.findIndex(s => s?.id === activeSessionId);
        if (targetIndex === -1) targetIndex = 0;
      }
    }
    
    useStore.getState().assignSession(targetIndex, deviceId);
  };

  const activeDeviceId = layout.sessions.find(s => s?.id === activeSessionId)?.deviceId;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-300">
      <div className="flex items-center justify-between p-3 border-b border-[#1a1a1a]">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Device List</h2>
        <button 
          onClick={() => {
            setIsEditing(!isEditing);
            setEditingId(null);
            setEditingDevice({ type: "ssh", port: 22 });
          }} 
          className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"
        >
          {isEditing && !editingId ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-[#111] border-b border-[#1a1a1a] space-y-3 text-xs">
              <input
                className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                placeholder="Device Name"
                value={editingDevice.name || ""}
                onChange={e => setEditingDevice({ ...editingDevice, name: e.target.value })}
              />
              <select
                className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                value={editingDevice.type}
                onChange={e => setEditingDevice({ ...editingDevice, type: e.target.value as any })}
              >
                <option value="ssh">SSH Connection</option>
                <option value="serial">Serial Port</option>
              </select>
              
              {editingDevice.type === "ssh" ? (
                <>
                  <input
                    className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                    placeholder="Host (e.g. 192.168.1.1)"
                    value={editingDevice.host || ""}
                    onChange={e => setEditingDevice({ ...editingDevice, host: e.target.value })}
                  />
                  <div className="flex space-x-2">
                    <input
                      className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                      placeholder="Username"
                      value={editingDevice.username || ""}
                      onChange={e => setEditingDevice({ ...editingDevice, username: e.target.value })}
                    />
                    <input
                      className="w-20 bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                      placeholder="Port"
                      type="number"
                      value={editingDevice.port || ""}
                      onChange={e => setEditingDevice({ ...editingDevice, port: parseInt(e.target.value as any) })}
                    />
                  </div>
                  <div className="relative">
                    <input
                      className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors pr-8"
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      value={editingDevice.password || ""}
                      onChange={e => setEditingDevice({ ...editingDevice, password: e.target.value })}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {authorizedPorts.length > 0 && (
                    <select
                      className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                      value={editingDevice.serialPortId || ""}
                      onChange={e => setEditingDevice({ ...editingDevice, serialPortId: e.target.value })}
                    >
                      <option value="">Select an authorized port...</option>
                      {authorizedPorts.map((p, i) => {
                        const info = p.getInfo();
                        return (
                          <option key={i} value={`${info.usbVendorId}-${info.usbProductId}`}>
                            COM Port (VID: {info.usbVendorId})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <button 
                    onClick={requestNewPort}
                    className="w-full flex items-center justify-center space-x-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded px-2 py-1.5 text-gray-300 transition-colors"
                  >
                    <Search size={14} />
                    <span>Authorize New Port</span>
                  </button>
                  <input
                    className="w-full bg-[#050505] border border-[#222] focus:border-emerald-500 rounded px-2 py-1.5 text-gray-200 outline-none transition-colors"
                    placeholder="Baud Rate (default 9600)"
                    type="number"
                    value={editingDevice.baudRate || ""}
                    onChange={e => setEditingDevice({ ...editingDevice, baudRate: parseInt(e.target.value as any) })}
                  />
                </>
              )}
              
              <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingDevice.autoReconnect || false}
                  onChange={e => setEditingDevice({ ...editingDevice, autoReconnect: e.target.checked })}
                  className="accent-emerald-500"
                />
                <span className="text-gray-300">Auto Reconnect</span>
              </label>

              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => { setIsEditing(false); setEditingId(null); setShowPassword(false); }} className="px-3 py-1.5 text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
                <button 
                  onClick={handleSave} 
                  disabled={!isFormValid()}
                  className={`px-4 py-1.5 rounded text-white font-semibold transition-colors ${isFormValid() ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600/50 cursor-not-allowed opacity-50'}`}
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        {devices.length === 0 && !isEditing && (
          <div className="p-6 text-center text-xs text-gray-600 uppercase tracking-widest mt-10">
            No Devices Found
          </div>
        )}
        <AnimatePresence>
          {devices.map(device => {
            const isSelected = activeDeviceId === device.id;
            return (
              <motion.div 
                key={device.id} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group flex flex-col p-3 border-b border-[#1a1a1a] hover:bg-[#111] transition-all duration-300 relative overflow-hidden ${isSelected ? 'bg-emerald-900/10' : ''}`}
              >
                {isSelected && (
                  <motion.div layoutId="activeIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                )}
                <div className="flex items-center justify-between pl-1">
                  <div className="flex items-center space-x-3 cursor-pointer flex-1" onClick={() => connectDevice(device.id)}>
                    <div className={`p-2 rounded transition-colors ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-emerald-500 group-hover:bg-emerald-500/10'}`}>
                      {device.type === "ssh" ? <TerminalIcon size={16} /> : <Usb size={16} />}
                    </div>
                    <div>
                      <div className={`font-semibold text-sm tracking-wide ${isSelected ? 'text-emerald-400' : 'text-gray-200'}`}>{device.name}</div>
                      <div className="text-xs text-gray-500 tracking-wider mt-0.5">{device.type.toUpperCase()} • {device.type === "ssh" ? device.host : `BAUD: ${device.baudRate || 9600}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => connectDevice(device.id)} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors" title="Connect">
                      <Play size={14} />
                    </button>
                    <button onClick={() => handleEdit(device)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteDevice(device.id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
