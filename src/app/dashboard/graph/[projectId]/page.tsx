'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Network, RefreshCw, Brain, Loader2,
    X, Layers, Database, Link2, BookOpen, ChevronRight,
    Hash, TrendingUp, Clock, Play, Pause, SkipBack
} from 'lucide-react';
import KnowledgeGraph from '@/components/graph/KnowledgeGraph';
import type { KnowledgeGraphNode, KnowledgeGraphEdge } from '@/types';

interface Props {
    params: Promise<{ projectId: string }>;
}

interface ConceptDetail {
    concept: {
        id: string;
        label: string;
        weight: number;
        cluster: string;
        color: string;
        created_at: string;
    };
    memories: Array<{
        id: string;
        content: string;
        source_type: string;
        source_label: string;
        importance_score: number;
        created_at: string;
        similarity?: number;
    }>;
    relatedConcepts: Array<{ id: string; label: string; weight: number; cluster?: string }>;
    relationships: Array<{
        id: string;
        relationship_type: string;
        strength: number;
        direction: 'from' | 'to';
        target_id?: string;
        source_id?: string;
    }>;
}

const SOURCE_COLORS: Record<string, string> = {
    url: '#06b6d4',
    chat: '#6366f1',
    note: '#10b981',
    document: '#f59e0b',
    session: '#a855f7',
};

const SOURCE_LABELS: Record<string, string> = {
    url: 'URL',
    chat: 'Chat',
    note: 'Note',
    document: 'Doc',
    session: 'Session',
};

const REL_COLORS: Record<string, string> = {
    supports: '#10b981',
    contradicts: '#ef4444',
    extends: '#6366f1',
    questions: '#f59e0b',
    related: '#06b6d4',
    references: '#a855f7',
};

export default function GraphPage({ params }: Props) {
    const { projectId } = use(params);
    const router = useRouter();
    const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
    const [edges, setEdges] = useState<KnowledgeGraphEdge[]>([]);
    const [allNodes, setAllNodes] = useState<(KnowledgeGraphNode & { created_at: string })[]>([]);
    const [allEdges, setAllEdges] = useState<(KnowledgeGraphEdge & { created_at: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectName, setProjectName] = useState('');

    // Time Machine state
    const [timeMachineMode, setTimeMachineMode] = useState(false);
    const [timelineMax, setTimelineMax] = useState(100);
    const [timelinePos, setTimelinePos] = useState(100);
    const [timelineLabel, setTimelineLabel] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Node detail panel state
    const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
    const [nodeDetail, setNodeDetail] = useState<ConceptDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    const fetchGraph = useCallback(async () => {
        setLoading(true);
        try {
            const [graphRes, projRes] = await Promise.all([
                fetch(`/api/graph?projectId=${projectId}`),
                fetch('/api/projects'),
            ]);
            const graphData = await graphRes.json();
            const projData = await projRes.json();
            const project = projData.projects?.find((p: { id: string; name: string }) => p.id === projectId);

            setProjectName(project?.name || 'Research Project');

            const rfNodes: (KnowledgeGraphNode & { created_at: string })[] = (graphData.nodes || []).map((n: {
                id: string; label: string; weight?: number; cluster?: string; color?: string; created_at?: string;
            }) => ({
                id: n.id,
                type: 'concept',
                position: { x: Math.random() * 600 + 50, y: Math.random() * 400 + 50 },
                created_at: n.created_at || new Date().toISOString(),
                data: {
                    label: n.label,
                    weight: n.weight || 1,
                    cluster: n.cluster,
                    color: n.color || '#6366f1',
                },
            }));

            const rfEdges: (KnowledgeGraphEdge & { created_at: string })[] = (graphData.edges || []).map((e: {
                id: string; source_id: string; target_id: string; relationship_type?: string; strength?: number; created_at?: string;
            }) => ({
                id: e.id,
                source: e.source_id,
                target: e.target_id,
                created_at: e.created_at || new Date().toISOString(),
                data: {
                    relationship: e.relationship_type || 'related',
                    strength: e.strength || 0.5,
                },
                animated: false,
            }));

            rfNodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            rfEdges.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            setAllNodes(rfNodes);
            setAllEdges(rfEdges);
            setNodes(rfNodes);
            setEdges(rfEdges);
            setTimelineMax(rfNodes.length);
            setTimelinePos(rfNodes.length);
            if (rfNodes.length > 0) {
                setTimelineLabel(new Date(rfNodes[rfNodes.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
            }
        } catch (err) {
            console.error('Graph fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchGraph(); }, [fetchGraph]);

    // Time Machine logic
    const handleTimelineChange = useCallback((pos: number) => {
        setTimelinePos(pos);
        const visibleNodes = allNodes.slice(0, pos);
        const visibleIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = allEdges.filter(e => visibleIds.has(e.source as string) && visibleIds.has(e.target as string));
        setNodes(visibleNodes);
        setEdges(visibleEdges);
        if (visibleNodes.length > 0) {
            setTimelineLabel(new Date(visibleNodes[visibleNodes.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        } else setTimelineLabel('Beginning of research');
    }, [allNodes, allEdges]);

    const startPlayback = useCallback(() => {
        if (isPlaying) { if (playRef.current) clearInterval(playRef.current); setIsPlaying(false); return; }
        let cur = timelinePos < timelineMax ? timelinePos : 0;
        setIsPlaying(true);
        playRef.current = setInterval(() => {
            cur += 1;
            handleTimelineChange(cur);
            if (cur >= timelineMax) { if (playRef.current) clearInterval(playRef.current); setIsPlaying(false); }
        }, 150);
    }, [isPlaying, timelinePos, timelineMax, handleTimelineChange]);

    useEffect(() => () => { if (playRef.current) clearInterval(playRef.current); }, []);

    // Exit time machine mode: restore all
    useEffect(() => {
        if (!timeMachineMode) { setNodes(allNodes); setEdges(allEdges); setTimelinePos(allNodes.length); }
    }, [timeMachineMode, allNodes, allEdges]);

    const handleNodeClick = useCallback(async (node: KnowledgeGraphNode) => {
        setSelectedNode(node);
        setNodeDetail(null);
        setDetailError('');
        setDetailLoading(true);

        try {
            const res = await fetch(`/api/graph/node?conceptId=${node.id}&projectId=${projectId}`);
            if (!res.ok) throw new Error('Failed to load concept details');
            const data = await res.json();
            setNodeDetail(data);
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Failed to load concept details');
        } finally {
            setDetailLoading(false);
        }
    }, [projectId]);

    const closePanel = () => {
        setSelectedNode(null);
        setNodeDetail(null);
        setDetailError('');
    };

    return (
        <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0 z-10"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()}
                        className="p-1.5 rounded-lg transition-all hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                            <Network className="w-4 h-4" style={{ color: '#06b6d4' }} />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Knowledge Graph
                            </h1>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {projectName} · {nodes.length} concepts · {edges.length} relationships
                                {selectedNode && (
                                    <span style={{ color: '#06b6d4' }}> · Viewing: {selectedNode.data.label}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {allNodes.length > 0 && (
                        <button onClick={() => setTimeMachineMode(m => !m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={timeMachineMode
                                ? { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#a855f7' }
                                : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                            }
                        >
                            <Clock className="w-3.5 h-3.5" /> Time Machine
                        </button>
                    )}
                    {selectedNode && (
                        <button onClick={closePanel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                            <X className="w-3.5 h-3.5" />
                            Close Panel
                        </button>
                    )}
                    <button onClick={fetchGraph}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                    <button onClick={() => router.push(`/dashboard/workspace/${projectId}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--accent-light)' }}>
                        <Brain className="w-3.5 h-3.5" />
                        Back to Chat
                    </button>
                </div>
            </div>

            {/* Main: Graph + Detail Panel side by side */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Time Machine Bar */}
                <AnimatePresence>
                    {timeMachineMode && allNodes.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="shrink-0 px-6 py-3 border-b overflow-hidden"
                            style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.07), rgba(99,102,241,0.04))', borderColor: 'rgba(168,85,247,0.2)' }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => handleTimelineChange(0)} title="Reset to beginning"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}
                                    ><SkipBack className="w-3 h-3" /></button>
                                    <button onClick={startPlayback} title={isPlaying ? 'Pause' : 'Play'}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                                        style={{ background: isPlaying ? 'rgba(239,68,68,0.15)' : 'rgba(168,85,247,0.15)', border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)'}`, color: isPlaying ? '#ef4444' : '#a855f7' }}
                                    >{isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}</button>
                                </div>
                                <div className="flex-1">
                                    <input type="range" min={0} max={timelineMax} value={timelinePos}
                                        onChange={e => handleTimelineChange(Number(e.target.value))}
                                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                        style={{ accentColor: '#a855f7', background: `linear-gradient(90deg, #a855f7 ${(timelinePos / Math.max(timelineMax, 1)) * 100}%, rgba(168,85,247,0.15) 0%)` }}
                                    />
                                </div>
                                <div className="shrink-0 text-right min-w-[130px]">
                                    <p className="text-xs font-semibold" style={{ color: '#a855f7' }}>{timelinePos} / {timelineMax} concepts</p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timelineLabel}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Graph + Side Panel */}
                <div className="flex flex-1 overflow-hidden relative">
                    {/* Graph Canvas */}
                    <div className={`flex-1 relative transition-all duration-300 ${selectedNode ? 'mr-[400px]' : ''}`}>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading knowledge graph...</p>
                            </div>
                        ) : nodes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="w-24 h-24 rounded-3xl flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.1))',
                                        border: '1px solid rgba(6,182,212,0.25)',
                                    }}>
                                    <Network className="w-12 h-12" style={{ color: '#06b6d4' }} />
                                </motion.div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                                        Your knowledge graph is empty
                                    </h3>
                                    <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Start a research conversation and CLARIBB will automatically extract concepts and build your knowledge graph in real time.
                                    </p>
                                </div>
                                <button onClick={() => router.push(`/dashboard/workspace/${projectId}`)}
                                    className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                                    Start Researching →
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Click hint */}
                                {!selectedNode && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-xs font-medium pointer-events-none"
                                        style={{
                                            background: 'rgba(15,22,35,0.9)',
                                            border: '1px solid rgba(99,102,241,0.3)',
                                            color: 'var(--text-secondary)',
                                            backdropFilter: 'blur(12px)',
                                        }}>
                                        💡 Click any concept node to explore related memories & connections
                                    </motion.div>
                                )}
                                <KnowledgeGraph
                                    nodes={nodes}
                                    edges={edges}
                                    onNodeClick={handleNodeClick}
                                    selectedNodeId={selectedNode?.id}
                                />
                            </>
                        )}
                    </div>

                    {/* Node Detail Panel — Slide in from right */}
                    <AnimatePresence>
                        {selectedNode && (
                            <motion.div
                                key="node-panel"
                                initial={{ x: 420, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 420, opacity: 0 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className="absolute right-0 top-0 h-full overflow-y-auto"
                                style={{
                                    width: '100%',
                                    maxWidth: 400,
                                    background: 'var(--bg-secondary)',
                                    borderLeft: '1px solid var(--border)',
                                    zIndex: 20,
                                }}
                            >
                                {/* Panel header */}
                                <div className="sticky top-0 z-10 px-5 py-4"
                                    style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold"
                                                style={{
                                                    background: `${selectedNode.data.color}20`,
                                                    border: `2px solid ${selectedNode.data.color}40`,
                                                    color: selectedNode.data.color,
                                                    boxShadow: `0 0 16px ${selectedNode.data.color}25`,
                                                }}>
                                                {selectedNode.data.label.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                                                    {selectedNode.data.label}
                                                </h2>
                                                {selectedNode.data.cluster && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                                                        style={{ background: `${selectedNode.data.color}15`, color: selectedNode.data.color }}>
                                                        {selectedNode.data.cluster}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={closePanel}
                                            className="p-1.5 rounded-lg transition-all hover:opacity-70"
                                            style={{ color: 'var(--text-muted)' }}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {detailLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--accent)' }} />
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                            Searching memory for this concept...
                                        </p>
                                    </div>
                                ) : detailError ? (
                                    <div className="p-5">
                                        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                            {detailError}
                                        </div>
                                    </div>
                                ) : nodeDetail ? (
                                    <div className="p-5 space-y-6">
                                        {/* Concept stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Frequency</span>
                                                </div>
                                                <div className="text-xl font-bold" style={{ color: '#10b981' }}>
                                                    {nodeDetail.concept.weight}x
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Link2 className="w-3.5 h-3.5" style={{ color: '#06b6d4' }} />
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Connections</span>
                                                </div>
                                                <div className="text-xl font-bold" style={{ color: '#06b6d4' }}>
                                                    {nodeDetail.relationships.length}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Related concepts */}
                                        {nodeDetail.relatedConcepts.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Layers className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                        Connected Concepts ({nodeDetail.relatedConcepts.length})
                                                    </h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {nodeDetail.relatedConcepts.map(rc => {
                                                        // Find the relationship type for this connection
                                                        const rel = nodeDetail.relationships.find(r =>
                                                            r.target_id === rc.id || r.source_id === rc.id
                                                        );
                                                        const relType = rel?.relationship_type || 'related';
                                                        const relColor = REL_COLORS[relType] || '#6366f1';
                                                        return (
                                                            <div key={rc.id}
                                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
                                                                style={{
                                                                    background: `${relColor}12`,
                                                                    border: `1px solid ${relColor}30`,
                                                                    color: relColor,
                                                                }}
                                                                onClick={() => {
                                                                    // Find the node in graph and click it
                                                                    const n = nodes.find(node => node.id === rc.id);
                                                                    if (n) handleNodeClick(n);
                                                                }}
                                                            >
                                                                <Hash className="w-2.5 h-2.5" />
                                                                {rc.label}
                                                                <span className="opacity-50">·</span>
                                                                <span className="opacity-70">{relType}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Memory chunks */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Database className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                    Related Memories ({nodeDetail.memories.length})
                                                </h3>
                                            </div>
                                            {nodeDetail.memories.length === 0 ? (
                                                <div className="p-4 rounded-xl text-sm text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    No memory chunks found for this concept yet.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {nodeDetail.memories.map(mem => (
                                                        <motion.div key={mem.id}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="p-3.5 rounded-xl group cursor-default"
                                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                            {/* Source badge + similarity */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                        style={{
                                                                            background: `${SOURCE_COLORS[mem.source_type] || '#6366f1'}15`,
                                                                            color: SOURCE_COLORS[mem.source_type] || '#6366f1',
                                                                        }}>
                                                                        {SOURCE_LABELS[mem.source_type] || mem.source_type}
                                                                    </span>
                                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                        {mem.source_label.length > 24
                                                                            ? mem.source_label.slice(0, 22) + '…'
                                                                            : mem.source_label}
                                                                    </span>
                                                                </div>
                                                                {mem.similarity != null && (
                                                                    <span className="text-xs font-bold" style={{ color: '#10b981' }}>
                                                                        {(mem.similarity * 100).toFixed(0)}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Content preview */}
                                                            <p className="text-xs leading-relaxed"
                                                                style={{ color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                {mem.content}
                                                            </p>
                                                            {/* Importance bar */}
                                                            <div className="flex items-center gap-2 mt-2.5">
                                                                <div className="flex-1 h-1 rounded-full overflow-hidden"
                                                                    style={{ background: 'var(--border)' }}>
                                                                    <div className="h-full rounded-full"
                                                                        style={{
                                                                            width: `${(mem.importance_score || 0.5) * 100}%`,
                                                                            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                                                        }} />
                                                                </div>
                                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                    importance
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Open in workspace CTA */}
                                        <button
                                            onClick={() => router.push(`/dashboard/workspace/${projectId}`)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                                            style={{
                                                background: 'rgba(99,102,241,0.08)',
                                                border: '1px solid rgba(99,102,241,0.2)',
                                                color: 'var(--accent-light)',
                                            }}>
                                            <BookOpen className="w-4 h-4" />
                                            Research this concept in workspace
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
