'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Panel,
    BackgroundVariant,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import type { KnowledgeGraphNode, KnowledgeGraphEdge } from '@/types';

interface Props {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
    onNodeClick?: (node: KnowledgeGraphNode) => void;
    selectedNodeId?: string;
}

// Custom concept node component
function ConceptNode({ data }: { data: { label: string; weight: number; cluster?: string; color: string; selected?: boolean } }) {
    const size = Math.max(44, Math.min(96, 44 + data.weight * 8));
    const fontSize = Math.max(10, Math.min(14, 10 + data.weight * 1.5));
    const isSelected = data.selected;

    return (
        <div
            className="flex items-center justify-center rounded-full cursor-pointer transition-all"
            style={{
                width: size,
                height: size,
                background: isSelected
                    ? `radial-gradient(circle, ${data.color}50, ${data.color}20)`
                    : `radial-gradient(circle, ${data.color}30, ${data.color}10)`,
                border: isSelected ? `3px solid ${data.color}` : `2px solid ${data.color}60`,
                boxShadow: isSelected
                    ? `0 0 ${data.weight * 6 + 12}px ${data.color}70, 0 0 30px ${data.color}40`
                    : `0 0 ${data.weight * 5}px ${data.color}30`,
                fontSize,
                color: data.color,
                fontWeight: 600,
                padding: '6px',
                textAlign: 'center',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.2s ease',
            }}
            title={data.label}
        >
            <span style={{ color: isSelected ? 'white' : 'var(--text-primary)', fontSize: Math.max(9, fontSize - 2) }}>
                {data.label.length > 15 ? data.label.slice(0, 13) + '...' : data.label}
            </span>
        </div>
    );
}

const nodeTypes = { concept: ConceptNode };

// Cluster colors
const CLUSTER_COLORS: Record<string, string> = {
    'cluster-0': '#6366f1',
    'cluster-1': '#06b6d4',
    'cluster-2': '#10b981',
    'cluster-3': '#f59e0b',
    'cluster-4': '#a855f7',
    'cluster-5': '#ec4899',
    default: '#6366f1',
};

// Force-directed layout approximation using concentric circles per cluster
function applyLayout(nodes: KnowledgeGraphNode[]): KnowledgeGraphNode[] {
    const clusters: Map<string, KnowledgeGraphNode[]> = new Map();

    nodes.forEach(node => {
        const cluster = node.data.cluster || 'default';
        if (!clusters.has(cluster)) clusters.set(cluster, []);
        clusters.get(cluster)!.push(node);
    });

    const clusterArray = Array.from(clusters.entries());
    const centerX = 500;
    const centerY = 300;
    const clusterRadius = 280;

    const result: KnowledgeGraphNode[] = [];
    clusterArray.forEach(([clusterId, clusterNodes], ci) => {
        const clusterAngle = (ci / clusterArray.length) * 2 * Math.PI;
        const clusterCenterX = centerX + (clusterArray.length > 1 ? Math.cos(clusterAngle) * clusterRadius : 0);
        const clusterCenterY = centerY + (clusterArray.length > 1 ? Math.sin(clusterAngle) * clusterRadius : 0);
        const nodeRadius = 100 + clusterNodes.length * 15;
        const color = CLUSTER_COLORS[`cluster-${ci}`] || CLUSTER_COLORS.default;

        clusterNodes.forEach((node, ni) => {
            const angle = (ni / clusterNodes.length) * 2 * Math.PI;
            result.push({
                ...node,
                position: {
                    x: clusterCenterX + Math.cos(angle) * nodeRadius,
                    y: clusterCenterY + Math.sin(angle) * nodeRadius,
                },
                data: { ...node.data, color },
                type: 'concept',
            });
        });
    });

    return result;
}

export default function KnowledgeGraph({ nodes: initialNodes, edges: initialEdges, onNodeClick, selectedNodeId }: Props) {
    const layoutedNodes = applyLayout(initialNodes).map(n => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNodeId },
    }));

    const rfEdges = initialEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: false,
        style: {
            stroke: 'rgba(99,102,241,0.35)',
            strokeWidth: Math.max(1, (e.data?.strength || 0.5) * 3),
        },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'rgba(99,102,241,0.4)',
            width: 12,
            height: 12,
        },
        label: e.data?.relationship,
        labelStyle: { fill: 'var(--text-muted)', fontSize: 9 },
        labelBgStyle: { fill: 'rgba(15,22,35,0.8)' },
    }));

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

    useEffect(() => {
        setNodes(applyLayout(initialNodes).map(n => ({
            ...n,
            data: { ...n.data, selected: n.id === selectedNodeId },
        })));
        setEdges(rfEdges);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialNodes, initialEdges, selectedNodeId]);

    const onConnect = useCallback((params: Connection) => {
        setEdges(eds => addEdge(params, eds));
    }, [setEdges]);

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (onNodeClick) {
            onNodeClick(node as KnowledgeGraphNode);
        }
    }, [onNodeClick]);

    // Cluster legend
    const clusters = Array.from(new Set(nodes.map(n => (n.data as { cluster?: string }).cluster).filter(Boolean)));

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={2}
                style={{ background: 'var(--bg-primary)' }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="rgba(99,102,241,0.08)"
                />
                <Controls
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                    }}
                />
                <MiniMap
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                    }}
                    nodeColor={(node) => {
                        const data = node.data as { color?: string };
                        return data.color || '#6366f1';
                    }}
                    maskColor="rgba(8,11,20,0.7)"
                />

                {/* Cluster legend */}
                {clusters.length > 0 && (
                    <Panel position="top-right">
                        <div className="p-3 rounded-xl text-xs space-y-1.5" style={{
                            background: 'rgba(15,22,35,0.9)',
                            border: '1px solid var(--border)',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <p className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Clusters</p>
                            {clusters.slice(0, 6).map((cluster, i) => (
                                <div key={cluster} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CLUSTER_COLORS[`cluster-${i}`] || '#6366f1' }} />
                                    <span style={{ color: 'var(--text-muted)' }}>{cluster}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}

                {/* Stats panel */}
                <Panel position="bottom-left">
                    <div className="flex items-center gap-4 px-4 py-2 rounded-xl text-xs" style={{
                        background: 'rgba(15,22,35,0.9)',
                        border: '1px solid var(--border)',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{nodes.length}</span> concepts
                        </span>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: '#06b6d4', fontWeight: 600 }}>{edges.length}</span> relationships
                        </span>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{clusters.length}</span> clusters
                        </span>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
