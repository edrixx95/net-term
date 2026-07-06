import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import { Device, TerminalSession } from "../types";
import { useStore } from "../store";
import { Download, X, AlertCircle, Copy, Terminal as TerminalIcon, Eraser } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  session: TerminalSession;
  index: number;
}

export function TerminalComponent({ session, index }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { devices, updateSessionStatus, closeSession, activeSessionId, setActiveSession } = useStore();
  const device = devices.find((d) => d.id === session.deviceId);
  
  const [term, setTerm] = useState<Terminal | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const serialPortRef = useRef<any>(null);
  const logDataRef = useRef<string>("");

  useEffect(() => {
    if (!terminalRef.current || !device) return;

    const terminal = new Terminal({
      cursorBlink: true,
      scrollback: 5000,
      theme: { 
        background: "#000000",
        foreground: "#d4d4d4",
        cursor: "#10b981",
        selectionBackground: "rgba(16, 185, 129, 0.3)"
      },
      fontFamily: "JetBrains Mono, monospace"
    });
    
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    requestAnimationFrame(() => {
      try {
        if (terminalRef.current && terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0 && terminal.element) {
          fitAddon.fit();
        }
      } catch(e) {}
    });
    
    setTerm(terminal);

    terminal.onSelectionChange(() => {
      setHasSelection(terminal.hasSelection());
    });

    const handleData = (data: string | Uint8Array) => {
      if (typeof data === "string") {
        terminal.write(data);
      } else {
        terminal.write(data);
      }
    };

    let isCleanTeardown = false;
    let reconnectTimer: any = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 720; // 2 hours every 10s

    const attemptReconnect = () => {
      if (isCleanTeardown) return;
      if (attempts < MAX_ATTEMPTS) {
        attempts++;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectLogic, 10000);
      }
    };

    const connectLogic = () => {
      if (isCleanTeardown) return;
      updateSessionStatus(index, "connecting");
      
      if (device.type === "ssh") {
        terminal.write(`\r\n\x1b[36m[System]\x1b[0m Connecting to ${device.host}:${device.port}...\r\n`);
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/ssh`);
        wsRef.current = ws;

        ws.onopen = () => {
          attempts = 0; // reset on success
          ws.send(JSON.stringify({
            type: "connect",
            payload: {
              host: device.host,
              port: device.port,
              username: device.username,
              password: device.password
            }
          }));
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "data") {
            const text = atob(msg.payload);
            handleData(text);
          } else if (msg.type === "status") {
            if (msg.payload === "connected") {
              terminal.write(`\r\n\x1b[32m[System]\x1b[0m Connected successfully.\r\n`);
              updateSessionStatus(index, "connected");
              ws.send(JSON.stringify({ type: "resize", payload: { cols: terminal.cols, rows: terminal.rows } }));
            } else if (msg.payload === "closed") {
              terminal.write(`\r\n\x1b[33m[System]\x1b[0m Connection closed by remote host.\r\n`);
              updateSessionStatus(index, "disconnected");
              attemptReconnect();
            }
          } else if (msg.type === "error") {
            terminal.write(`\r\n\x1b[31m[System Error]\x1b[0m ${msg.payload}\r\n`);
            updateSessionStatus(index, "error", msg.payload);
            attemptReconnect();
          }
        };

        ws.onclose = () => {
          terminal.write(`\r\n\x1b[33m[System]\x1b[0m Connection lost.\r\n`);
          updateSessionStatus(index, "disconnected");
          attemptReconnect();
        };
        ws.onerror = () => {
          updateSessionStatus(index, "error", "WebSocket Error");
        };

        terminal.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "data", payload: btoa(data) }));
          }
        });
        
        terminal.onResize((size) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "resize", payload: size }));
          }
        });

      } else if (device.type === "serial") {
        const connectSerial = async () => {
          try {
            terminal.write(`\r\n\x1b[36m[System]\x1b[0m Requesting serial port...\r\n`);
            const port = await (navigator as any).serial.requestPort();
            terminal.write(`\r\n\x1b[36m[System]\x1b[0m Connecting to serial port at ${device.baudRate || 9600} baud...\r\n`);
            await port.open({ baudRate: device.baudRate || 9600 });
            serialPortRef.current = port;
            attempts = 0;
            terminal.write(`\r\n\x1b[32m[System]\x1b[0m Connected to serial port successfully.\r\n`);
            updateSessionStatus(index, "connected");

            const decoder = new TextDecoderStream();
            const inputDone = port.readable.pipeTo(decoder.writable);
            const inputStream = decoder.readable;
            const reader = inputStream.getReader();

            const encoder = new TextEncoderStream();
            const outputDone = encoder.readable.pipeTo(port.writable);
            const outputStream = encoder.writable;
            const writer = outputStream.getWriter();

            terminal.onData((data) => {
              writer.write(data);
            });

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) handleData(value);
            }
            
            terminal.write(`\r\n\x1b[33m[System]\x1b[0m Serial connection closed.\r\n`);
            updateSessionStatus(index, "disconnected");
            attemptReconnect();
          } catch (err: any) {
            terminal.write(`\r\n\x1b[31m[System Error]\x1b[0m Serial Error: ${err.message}\r\n`);
            updateSessionStatus(index, "error", err.message);
            attemptReconnect();
          }
        };
        connectSerial();
      }
    };

    connectLogic();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          if (terminalRef.current && terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0 && terminal.element) {
            fitAddon.fit();
          }
        } catch(e) {}
      });
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      isCleanTeardown = true;
      clearTimeout(reconnectTimer);
      resizeObserver.disconnect();
      terminal.dispose();
      if (wsRef.current) wsRef.current.close();
      if (serialPortRef.current) serialPortRef.current.close();
    };
  }, [device, index, updateSessionStatus]);

  const downloadLog = () => {
    if (!term) return;
    
    const buffer = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }
    const logContent = lines.join("\n");

    const blob = new Blob([logContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${device?.name || 'terminal'}_log_${new Date().toISOString().replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const handleClear = () => {
    if (term) {
      term.clear();
    }
  };

  const handleCopy = () => {
    if (term) {
      const selection = term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        term.clearSelection();
      }
    }
  };

  const isActive = activeSessionId === session.id;

  useEffect(() => {
    const handleMacro = (e: any) => {
      if (isActive && term) {
        const script = e.detail;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
           wsRef.current.send(JSON.stringify({ type: "data", payload: btoa(script) }));
        } else if (serialPortRef.current && serialPortRef.current.writable) {
           const writer = serialPortRef.current.writable.getWriter();
           writer.write(new TextEncoder().encode(script));
           writer.releaseLock();
        }
      }
    };
    window.addEventListener("execute-macro", handleMacro);
    return () => window.removeEventListener("execute-macro", handleMacro);
  }, [isActive, term]);

  return (
    <div 
      className={`flex flex-col h-full w-full transition-all duration-300 border-2 ${isActive ? "border-emerald-500 shadow-inner shadow-emerald-500/10" : "border-transparent"}`} 
      onClickCapture={() => setActiveSession(session.id)}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 text-xs border-b transition-colors ${isActive ? "bg-emerald-900/20 border-emerald-900/50" : "bg-[#111] border-[#222]"}`}>
        <div className="flex items-center space-x-2 overflow-hidden">
          <div className={`w-2 h-2 rounded-full ${
            session.status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
            session.status === "connecting" ? "bg-yellow-500" :
            session.status === "error" ? "bg-red-500" : "bg-gray-600"
          }`} />
          <span className={`font-semibold tracking-wide truncate ${isActive ? "text-emerald-400" : "text-gray-400"}`}>{session.title}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={handleClear} className="p-1 hover:bg-[#222] hover:text-emerald-400 text-gray-500 rounded transition-colors" title="Clear Terminal">
            <Eraser size={14} />
          </button>
          <button onClick={downloadLog} className="p-1 hover:bg-[#222] hover:text-emerald-400 text-gray-500 rounded transition-colors" title="Download Log">
            <Download size={14} />
          </button>
          <button onClick={() => closeSession(index)} className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors" title="Close Session">
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Terminal */}
      <div className="flex-1 bg-[#000000] overflow-hidden p-1 relative">
        <div ref={terminalRef} className="h-full w-full" />
        
        <AnimatePresence>
          {(session.status === "disconnected" || session.status === "connecting") && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]"
            >
               <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
               <div className="text-emerald-500 font-mono text-xs font-semibold tracking-widest uppercase shadow-black drop-shadow-md">
                 {session.status === "connecting" ? "Connecting..." : "Connection Lost. Reconnecting..."}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {session.status === "error" && (
             <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500 text-white px-3 py-1.5 rounded text-xs flex items-center space-x-2 shadow-lg"
             >
               <AlertCircle size={14} />
               <span>{session.error || "Connection Error"}</span>
             </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasSelection && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleCopy}
              className="absolute bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] px-3 py-2 rounded-full text-xs font-semibold flex items-center space-x-2 z-10"
            >
              <Copy size={14} />
              <span>Copy</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

TerminalComponent.Icon = () => <TerminalIcon size={16} className="text-gray-600" />;
