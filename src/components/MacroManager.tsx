import React, { useState } from "react";
import { useStore } from "../store";
import { Macro } from "../types";
import { Play, Plus, Trash2, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MacroFlowEditor } from "./MacroFlowEditor";

export function MacroManager() {
  const { macros, addMacro, updateMacro, deleteMacro, activeSessionId } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMacro, setEditingMacro] = useState<Partial<Macro>>({});

  const handleSave = (macro: Partial<Macro>) => {
    if (macro.name) {
      if (editingId) {
        updateMacro(editingId, macro);
      } else {
        addMacro(macro as Omit<Macro, "id">);
      }
      setIsEditing(false);
      setEditingId(null);
      setEditingMacro({});
    }
  };

  const handleEdit = (macro: Macro) => {
    setEditingId(macro.id);
    setEditingMacro({ ...macro });
    setIsEditing(true);
  };

  const executeMacro = (macro: Macro) => {
    if (!activeSessionId) {
      alert("Please select an active terminal session first.");
      return;
    }
    const event = new CustomEvent("execute-macro", { detail: macro });
    window.dispatchEvent(event);
  };

  return (
    <>
      {isEditing && (
        <MacroFlowEditor 
          macro={editingMacro} 
          onClose={() => { setIsEditing(false); setEditingId(null); setEditingMacro({}); }} 
          onSave={handleSave} 
        />
      )}
      <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-300">
        <div className="flex items-center justify-between p-3 border-b border-[#1a1a1a]">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Macro List</h2>
          <button 
            onClick={() => {
              setIsEditing(true);
              setEditingId(null);
              setEditingMacro({ nodes: [], edges: [] });
            }} 
            className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {macros.length === 0 && (
            <div className="p-6 text-center text-xs text-gray-600 uppercase tracking-widest mt-10">
              No Macros Found
            </div>
          )}
          <AnimatePresence>
            {macros.map(macro => (
              <motion.div 
                key={macro.id} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex flex-col p-3 border-b border-[#1a1a1a] hover:bg-[#111] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col flex-1 cursor-pointer" onClick={() => executeMacro(macro)}>
                    <div className="font-semibold text-gray-200 text-sm tracking-wide">{macro.name}</div>
                    <div className="text-xs text-emerald-500/70 font-mono truncate max-w-[200px] mt-1">
                      {macro.nodes ? `${macro.nodes.length} nodes flow` : macro.script}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => executeMacro(macro)} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors" title="Run in Active Session">
                      <Play size={14} />
                    </button>
                    <button onClick={() => handleEdit(macro)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteMacro(macro.id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
