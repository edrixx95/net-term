import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Handle,
  Position,
  NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Macro } from '../types';
import { X, Play, Save, Plus } from 'lucide-react';

const TriggerNode = ({ data }: NodeProps) => (
  <div className="bg-emerald-900 border-2 border-emerald-500 p-3 rounded-lg shadow-lg text-white min-w-[150px]">
    <div className="font-bold text-xs uppercase tracking-wider mb-2">Trigger</div>
    <div className="text-xs text-emerald-200">Start Flow</div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-400" />
  </div>
);

const CommandNode = ({ data, id }: NodeProps) => (
  <div className="bg-blue-900 border-2 border-blue-500 p-3 rounded-lg shadow-lg text-white min-w-[150px] relative">
    <button onClick={() => data.onDelete(id)} className="absolute top-1 right-1 text-blue-300 hover:text-white bg-blue-800/50 hover:bg-blue-700 rounded-full p-0.5">
      <X size={12} />
    </button>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-400" />
    <div className="font-bold text-xs uppercase tracking-wider mb-2 pr-4">Send Command</div>
    <input 
      className="w-full bg-black/50 border border-blue-400/50 rounded px-2 py-1 text-xs font-mono text-blue-200 nodrag"
      defaultValue={data.command}
      onChange={(e) => data.onChange(id, 'command', e.target.value)}
      placeholder="e.g. ls -la"
    />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-400" />
  </div>
);

const WaitNode = ({ data, id }: NodeProps) => (
  <div className="bg-amber-900 border-2 border-amber-500 p-3 rounded-lg shadow-lg text-white min-w-[150px] relative">
    <button onClick={() => data.onDelete(id)} className="absolute top-1 right-1 text-amber-300 hover:text-white bg-amber-800/50 hover:bg-amber-700 rounded-full p-0.5">
      <X size={12} />
    </button>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-amber-400" />
    <div className="font-bold text-xs uppercase tracking-wider mb-2 pr-4">Wait For</div>
    <input 
      className="w-full bg-black/50 border border-amber-400/50 rounded px-2 py-1 text-xs font-mono text-amber-200 nodrag"
      defaultValue={data.text}
      onChange={(e) => data.onChange(id, 'text', e.target.value)}
      placeholder="e.g. password:"
    />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-amber-400" />
  </div>
);

interface Props {
  macro: Partial<Macro>;
  onClose: () => void;
  onSave: (macro: Partial<Macro>) => void;
}

const initialNodes = [
  { id: '1', type: 'trigger', position: { x: 50, y: 150 }, data: {} },
];

export function MacroFlowEditor({ macro, onClose, onSave }: Props) {
  const [name, setName] = useState(macro.name || 'New Flow Macro');
  
  const updateNodeData = useCallback((id: string, key: string, value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = {
            ...node.data,
            [key]: value,
          };
        }
        return node;
      })
    );
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const loadedNodes = macro.nodes?.map(n => ({
    ...n,
    data: {
      ...n.data,
      onChange: updateNodeData,
      onDelete: deleteNode
    }
  })) || [
    { id: '1', type: 'trigger', position: { x: 50, y: 150 }, data: { onChange: updateNodeData, onDelete: deleteNode } }
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(loadedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(macro.edges || []);

  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    command: CommandNode,
    wait: WaitNode
  }), []);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type: 'command' | 'wait') => {
    const newNode = {
      id: Date.now().toString(),
      type,
      position: { x: 300, y: 150 },
      data: { command: '', text: '', onChange: updateNodeData, onDelete: deleteNode },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = () => {
    // clean up onChange and onDelete from data before saving to avoid serialization issues
    const cleanNodes = nodes.map(n => {
      const { onChange, onDelete, ...cleanData } = n.data;
      return { ...n, data: cleanData };
    });
    onSave({
      ...macro,
      name,
      nodes: cleanNodes,
      edges,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col font-sans">
      <div className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-4 bg-[#0a0a0a]">
        <div className="flex items-center space-x-4">
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-transparent text-white font-bold text-lg outline-none border-b border-transparent focus:border-emerald-500 px-1 py-0.5"
          />
          <div className="flex bg-[#111] border border-[#222] rounded p-1 space-x-1">
            <button onClick={() => addNode('command')} className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 flex items-center">
              <Plus size={12} className="mr-1" /> Command
            </button>
            <button onClick={() => addNode('wait')} className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 flex items-center">
              <Plus size={12} className="mr-1" /> Wait
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={onClose} className="px-4 py-1.5 text-gray-400 hover:text-white flex items-center text-sm">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!name.trim()}
            className={`px-4 py-1.5 rounded font-semibold flex items-center text-sm transition-colors ${name.trim() ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600/50 text-white/50 cursor-not-allowed'}`}
          >
            <Save size={14} className="mr-2" /> Save Flow
          </button>
        </div>
      </div>
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#050505]"
          colorMode="dark"
        >
          <Background color="#222" gap={16} />
          <Controls className="bg-[#111] border-[#222] fill-white" />
        </ReactFlow>
      </div>
    </div>
  );
}
