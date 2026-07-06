import React, { useEffect, useState } from "react";
import { useStore } from "./store";
import { DeviceManager } from "./components/DeviceManager";
import { MacroManager } from "./components/MacroManager";
import { TerminalGrid } from "./components/TerminalGrid";
import { Terminal, Server, Code2, LayoutGrid, Rows2, Columns2, Square, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SplitPane } from "./components/SplitPane";

export default function App() {
  const { loadData, layout, setLayoutType } = useStore();
  const [activeTab, setActiveTab] = useState<"devices" | "macros">("devices");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    loadData().then(() => setIsLoaded(true));
  }, [loadData]);

  const LayoutIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "1x1": return <Square size={14} />;
      case "2x1": return <Columns2 size={14} />;
      case "1x2": return <Rows2 size={14} />;
      case "2x2": return <LayoutGrid size={14} />;
      default: return null;
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center text-emerald-500 font-mono">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          INITIALIZING NET-TERM...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] text-gray-200 overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Top Bar */}
      <div className="h-12 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-4 z-20">
        <div className="flex items-center space-x-3 text-emerald-500 font-bold tracking-widest text-sm">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-emerald-500/10 rounded transition-colors text-emerald-600 hover:text-emerald-400"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className="flex items-center space-x-2">
            <Terminal size={18} />
            <span>NET-TERM</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 mr-2 uppercase tracking-widest font-semibold">Layout</span>
          <div className="flex bg-[#111] p-1 rounded-md border border-[#222]">
            {(["1x1", "2x1", "1x2", "2x2"] as const).map(type => (
              <button
                key={type}
                title={`Layout ${type}`}
                onClick={() => setLayoutType(type as any)}
                className={`p-1.5 rounded transition-all ${layout.type === type ? "bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"}`}
              >
                <LayoutIcon type={type} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <SplitPane direction="horizontal" initialSize={20} hideFirst={!isSidebarOpen}>
          {/* Sidebar */}
          <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-[#1a1a1a] w-full overflow-hidden">
            <div className="flex p-2 space-x-1 border-b border-[#1a1a1a]">
              <button
                onClick={() => setActiveTab("devices")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-semibold uppercase tracking-wider rounded transition-all ${activeTab === "devices" ? "bg-emerald-500/10 text-emerald-400" : "text-gray-500 hover:bg-[#111]"}`}
              >
                <Server size={14} />
                <span>Devices</span>
              </button>
              <button
                onClick={() => setActiveTab("macros")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-semibold uppercase tracking-wider rounded transition-all ${activeTab === "macros" ? "bg-emerald-500/10 text-emerald-400" : "text-gray-500 hover:bg-[#111]"}`}
              >
                <Code2 size={14} />
                <span>Macros</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0"
                >
                  {activeTab === "devices" ? <DeviceManager /> : <MacroManager />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Terminal Grid */}
          <TerminalGrid />
        </SplitPane>
      </div>
    </div>
  );
}
