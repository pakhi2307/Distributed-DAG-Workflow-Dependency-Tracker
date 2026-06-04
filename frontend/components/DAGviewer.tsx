'use client';
import React, {useCallback, useEffect, useState} from 'react';
import axios from 'axios';
import ReactFlow,{
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node as ReactFlowNode
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
const PROJECT_ID = '317ee30f-277d-4ca3-a7dd-af5162cdbf69'; 
const nodeWidth = 250;
const nodeHeight = 60;
const getLayoutedElements = (nodes: ReactFlowNode[], edges: Edge[], direction = 'TB') => {
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

dagreGraph.setGraph({ rankdir: direction });

nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
     node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { layoutedNodes, layoutedEdges: edges };
};
export default function DAGviewer({ projectId = PROJECT_ID }: { projectId?: string }){
     const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(()=>{
    const fetchGraphData= async ()=> {
        try{
            // 1. Fetch the graph nodes and edges
            const response= await axios.get(`http://localhost:5000/api/modules/graph/${projectId}`);
            
            // 2. Fetch the critical path
            let criticalPathIds: string[] = [];
            try {
                const cpResponse = await axios.get(`http://localhost:5000/api/dependencies/projects/${projectId}/critical-path`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                criticalPathIds = cpResponse.data.criticalPathIds || [];
            } catch (cpError) {
                console.error("Error fetching critical path:", cpError);
            }

            // 3. Highlight nodes and edges
            const highlightedNodes = response.data.nodes.map((n: any) => {
                if (criticalPathIds.includes(n.id)) {
                    return {
                        ...n,
                        style: { ...n.style, border: '2px solid #ef4444', backgroundColor: '#fee2e2' },
                        className: 'critical-node'
                    };
                }
                return n;
            });

            const highlightedEdges = response.data.edges.map((e: any) => {
                if (criticalPathIds.includes(e.source) && criticalPathIds.includes(e.target)) {
                    return {
                        ...e,
                        style: { stroke: '#ef4444', strokeWidth: 2 },
                        animated: true
                    };
                }
                return e;
            });

            const { layoutedNodes, layoutedEdges } = getLayoutedElements(
                highlightedNodes,
                highlightedEdges,
                'TB' // Top-to-Bottom
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

        }catch(error){
            console.error("Error fetching graph data:", error);

        }finally{
            setIsLoading(false);
        }
    };
    fetchGraphData();

   }, [projectId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Edge|Connection )=> setEdges((eds)=>addEdge(params,eds)),
    [setEdges]
  );

  if(isLoading){
    return <div className="w-full h-[500px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-12px">Loading DAG...</div>;
  }
  return (
     <div style={{ width: '100%', height: '500px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}