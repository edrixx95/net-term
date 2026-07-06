import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import { TerminalComponent } from "./TerminalComponent";
import { motion } from "motion/react";

export function TerminalGrid() {
  const { layout } = useStore();
  const [splitX, setSplitX] = useState(50);
  const [splitY, setSplitY] = useState(50);
  
  const [isDraggingX, setIsDraggingX] = useState(false);
  const [isDraggingY, setIsDraggingY] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingX) {
        const newX = (e.clientX / window.innerWidth) * 100;
        setSplitX(Math.min(Math.max(newX, 10), 90));
      }
      if (isDraggingY) {
        const newY = (e.clientY / window.innerHeight) * 100;
        setSplitY(Math.min(Math.max(newY, 10), 90));
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingX(false);
      setIsDraggingY(false);
    };

    if (isDraggingX || isDraggingY) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingX, isDraggingY]);

  // CSS Grid setup
  let gridCols = "1fr";
  let gridRows = "1fr";

  if (layout.type === "2x1") {
    gridCols = `${splitX}% ${100 - splitX}%`;
  } else if (layout.type === "1x2") {
    gridRows = `${splitY}% ${100 - splitY}%`;
  } else if (layout.type === "2x2") {
    gridCols = `${splitX}% ${100 - splitX}%`;
    gridRows = `${splitY}% ${100 - splitY}%`;
  }

  // Which slots are visible based on layout type
  const isVisible = (idx: number) => {
    if (layout.type === "1x1") return idx === 0;
    if (layout.type === "2x1" || layout.type === "1x2") return idx < 2;
    if (layout.type === "2x2") return idx < 4;
    return false;
  };

  return (
    <div className="relative h-full w-full bg-[#050505] overflow-hidden">
      <div 
        className="absolute inset-0 grid gap-1 p-1"
        style={{
          gridTemplateColumns: gridCols,
          gridTemplateRows: gridRows,
        }}
      >
        {/* Render exactly 4 slots so they remain mounted. Hide them if not needed for current layout. */}
        {[0, 1, 2, 3].map((index) => {
          if (!isVisible(index)) return null;
          const session = layout.sessions[index];
          return (
            <motion.div 
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative min-h-0 min-w-0 border border-[#111] bg-black rounded overflow-hidden shadow-lg shadow-emerald-900/5"
            >
              {session ? (
                <TerminalComponent session={session} index={index} />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-700 bg-[#0a0a0a] space-y-2">
                  <TerminalComponent.Icon />
                  <span className="text-xs uppercase tracking-widest opacity-50">Empty Slot {index + 1}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Resizers */}
      {(layout.type === "2x1" || layout.type === "2x2") && (
        <div 
          className="absolute top-0 bottom-0 w-2 z-10 cursor-col-resize -translate-x-1/2 flex justify-center items-center group"
          style={{ left: `${splitX}%` }}
          onMouseDown={() => setIsDraggingX(true)}
        >
          <div className="h-full w-px bg-emerald-500/20 group-hover:bg-emerald-400 group-hover:w-0.5 transition-all" />
        </div>
      )}

      {(layout.type === "1x2" || layout.type === "2x2") && (
        <div 
          className="absolute left-0 right-0 h-2 z-10 cursor-row-resize -translate-y-1/2 flex justify-center items-center group"
          style={{ top: `${splitY}%` }}
          onMouseDown={() => setIsDraggingY(true)}
        >
          <div className="w-full h-px bg-emerald-500/20 group-hover:bg-emerald-400 group-hover:h-0.5 transition-all" />
        </div>
      )}

      {(isDraggingX || isDraggingY) && (
        <div className="fixed inset-0 z-50 pointer-events-none" style={{ cursor: isDraggingX ? "col-resize" : "row-resize" }} />
      )}
    </div>
  );
}
