"use client";

import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { io as socketIO, Socket } from 'socket.io-client';
import api from '../lib/api';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top' as any;
    node.sourcePosition = isHorizontal ? 'right' : 'bottom' as any;
    node.position = {
      x: nodeWithPosition.x - 250 / 2,
      y: nodeWithPosition.y - 80 / 2,
    };
    return node;
  });

  return { nodes, edges };
};

export default function ProjectGraph({ projectId }: { projectId: string }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const socketRef = useRef<Socket | null>(null);

  const fetchGraphData = useCallback(async () => {
    try {
      const res = await api.get(`/modules/graph/${projectId}`);
      const { nodes: initialNodes, edges: initialEdges } = getLayoutedElements(
        res.data.nodes,
        res.data.edges
      );
      setNodes(initialNodes);
      setEdges(initialEdges);
    } catch (err) {
      console.error('Failed to fetch graph', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // WebSocket connection
  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = socketIO(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setLiveStatus('connected');
      socket.emit('join-project', projectId);
      console.log(`⚡ Socket connected. Joined project room: ${projectId}`);
    });

    socket.on('disconnect', () => {
      setLiveStatus('disconnected');
    });

    // When the server emits GRAPH_UPDATED, refresh the graph automatically
    socket.on('GRAPH_UPDATED', (payload: { type: string; projectId: string }) => {
      if (payload.projectId === projectId) {
        console.log(`🔄 GRAPH_UPDATED received (${payload.type}). Refreshing...`);
        fetchGraphData();
      }
    });

    return () => {
      socket.emit('leave-project', projectId);
      socket.disconnect();
    };
  }, [projectId, fetchGraphData]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      try {
        await api.post('/dependencies', {
          moduleId: params.target,
          dependsOnId: params.source
        });
        fetchGraphData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to add dependency');
        fetchGraphData();
      }
    },
    [fetchGraphData]
  );

  if (loading && nodes.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl">
        <div className="text-slate-500 text-sm">Loading Graph...</div>
      </div>
    );
  }

  return (
    <div className="h-[500px] border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background color="#ccc" gap={16} />

        {/* Live status badge */}
        <Panel position="top-left">
          <div className={`flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
            liveStatus === 'connected'
              ? 'bg-green-50 border-green-200 text-green-700'
              : liveStatus === 'connecting'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              liveStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              liveStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`}></span>
            {liveStatus === 'connected' ? 'Live' : liveStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-xs w-48">
          <div className="mb-3">
            <h4 className="font-semibold text-slate-700 mb-1.5 border-b pb-1">Modules (Nodes)</h4>
            <div className="flex flex-col gap-1.5">
               <div className="flex items-center"><span className="w-3 h-3 border-2 border-blue-500 bg-white rounded mr-2"></span> In Progress</div>
               <div className="flex items-center"><span className="w-3 h-3 border-2 border-green-500 bg-white rounded mr-2"></span> Accepted</div>
               <div className="flex items-center"><span className="w-3 h-3 border-[3px] border-red-500 bg-red-50 rounded mr-2"></span> Critical Path</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-1.5 border-b pb-1">Handshakes (Edges)</h4>
            <div className="flex flex-col gap-1.5">
               <div className="flex items-center"><span className="w-4 h-0.5 bg-slate-400 mr-2"></span> Planned Dependency</div>
               <div className="flex items-center"><span className="w-4 h-1 bg-red-500 mr-2"></span> Critical Path (No Handshake)</div>
               <div className="flex items-center"><span className="w-4 h-0.5 bg-yellow-500 mr-2 border-b border-dashed border-yellow-500"></span> Pending (Animated)</div>
               <div className="flex items-center"><span className="w-4 h-0.5 bg-green-500 mr-2"></span> Accepted</div>
               <div className="flex items-center"><span className="w-4 h-0.5 bg-red-500 mr-2"></span> Rejected</div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
