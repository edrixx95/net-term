import React, { useState, useRef, useEffect } from "react";

interface SplitProps {
  direction: "horizontal" | "vertical";
  children: [React.ReactNode, React.ReactNode];
  initialSize?: number;
  hideFirst?: boolean;
}

export function SplitPane({ direction, children, initialSize = 50, hideFirst = false }: SplitProps) {
  const [size, setSize] = useState(initialSize); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (direction === "horizontal") {
        const newSize = ((e.clientX - rect.left) / rect.width) * 100;
        setSize(Math.min(Math.max(newSize, 10), 90));
      } else {
        const newSize = ((e.clientY - rect.top) / rect.height) * 100;
        setSize(Math.min(Math.max(newSize, 10), 90));
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, direction]);

  return (
    <div ref={containerRef} className={`flex h-full w-full ${direction === "horizontal" ? "flex-row" : "flex-col"}`}>
      <div style={{ 
        [direction === "horizontal" ? "width" : "height"]: hideFirst ? '0%' : `${size}%`,
        display: hideFirst ? 'none' : 'block'
      }} className="relative">
        {children[0]}
      </div>
      {!hideFirst && (
        <div
          onMouseDown={() => setIsDragging(true)}
          className={`${direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"} bg-[#1a1a1a] hover:bg-emerald-500 flex-shrink-0 z-10 transition-colors duration-200`}
        />
      )}
      <div className="flex-1 relative">
        {children[1]}
      </div>
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" style={{ cursor: direction === "horizontal" ? "col-resize" : "row-resize" }} />}
    </div>
  );
}
