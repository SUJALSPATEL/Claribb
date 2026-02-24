'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Brain, Send, Loader2, ChevronLeft, Plus,
    BookOpen, Shield, Database, Globe, X, Link2,
    AlertTriangle, GitBranch, ChevronDown,
    ChevronRight, Eye, Sparkles, StopCircle,
    Zap, Network, CheckCircle2, FlaskConical,
    TrendingUp, Flame, Search, FileText, Download, Copy, Check,
    Mic, MicOff, Lightbulb, Volume2, Telescope,
    Sword, Shuffle, GitCommit
} from 'lucide-react';
import type { ChatMessage, AgentOutputs, Session, AgentStatus, MemoryChunk, DeepResearchProgress } from '@/types';
import MemoryFormingToast, { type MemoryFormingEvent } from '@/components/workspace/MemoryFormingToast';
import ClariBBNoticedPanel, { type ClariBBNotice } from '@/components/workspace/SAGENoticedPanel';
import ChainOfThought, { type ThinkingStep } from '@/components/workspace/ChainOfThought';
import SteelManPanel from '@/components/workspace/SteelManPanel';
import SerendipityPanel from '@/components/workspace/SerendipityPanel';
import BeliefEvolutionPanel from '@/components/workspace/BeliefEvolutionPanel';
import TrajectoryPanel from '@/components/workspace/TrajectoryPanel';

const AGENT_DEFS: AgentStatus[] = [
    { id: 'recall', label: 'Recall', status: 'idle', color: '#6366f1' },
    { id: 'explorer', label: 'Explorer', status: 'idle', color: '#06b6d4' },
    { id: 'critique', label: 'Critique', status: 'idle', color: '#f59e0b' },
    { id: 'connector', label: 'Connector', status: 'idle', color: '#10b981' },
];

const AGENT_ICONS = {
    recall: Brain,
    explorer: Zap,
    critique: AlertTriangle,
    connector: Network,
};

// ── Animated Agent Pipeline ──────────────────────────────────────────
function AgentPipeline({ active, activeIndex }: { active: boolean; activeIndex: number }) {
    const agents = AGENT_DEFS;
    return (
        <div className="flex items-center gap-1">
            {agents.map((agent, i) => {
                const Icon = AGENT_ICONS[agent.id as keyof typeof AGENT_ICONS];
                const isActive = active && i === activeIndex;
                const isDone = active && i < activeIndex;
                return (
                    <div key={agent.id} className="flex items-center gap-1">
                        <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300"
                            style={{
                                background: isDone ? `${agent.color}20` : isActive ? `${agent.color}25` : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isDone ? agent.color + '40' : isActive ? agent.color + '60' : 'rgba(255,255,255,0.07)'}`,
                                color: isDone ? agent.color : isActive ? agent.color : 'var(--text-muted)',
                                boxShadow: isActive ? `0 0 8px ${agent.color}40` : 'none',
                            }}
                        >
                            {isDone
                                ? <CheckCircle2 className="w-2.5 h-2.5" />
                                : isActive
                                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    : <Icon className="w-2.5 h-2.5" />
                            }
                            {agent.label}
                        </div>
                        {i < agents.length - 1 && (
                            <div className="w-3 h-px" style={{ background: i < activeIndex ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Memory Source Card ───────────────────────────────────────────────
function MemorySourceCard({ memory, rank }: { memory: MemoryChunk; rank: number }) {
    const score = (memory as MemoryChunk & { similarity?: number }).similarity;
    const pct = score ? Math.round(score * 100) : null;
    const srcColors = {
        chat: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', text: '#a5b4fc' },
        url: { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)', text: '#67e8f9' },
        note: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#6ee7b7' },
        session: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', text: '#c4b5fd' },
        document: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#fcd34d' },
    };
    const src = (memory.source_type as string) || 'chat';
    const col = srcColors[src as keyof typeof srcColors] || srcColors.chat;

    return (
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                {rank}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize" style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
                        {src}
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{(memory as MemoryChunk & { source_label?: string }).source_label || 'Memory'}</span>
                    {pct && (
                        <span className="ml-auto shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>
                            {pct}%
                        </span>
                    )}
                </div>
                <p className="text-[10px] leading-snug line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {memory.content.slice(0, 120)}…
                </p>
            </div>
        </div>
    );
}

// ── Agent Output Panel ───────────────────────────────────────────────
function AgentOutputPanel({ outputs, memories }: { outputs: AgentOutputs; memories?: MemoryChunk[] }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'memories' | 'web' | 'critique' | 'connections' | 'conflicts'>('memories');

    const hasMemories = (memories?.length ?? 0) > 0;
    const hasWeb = outputs.explorer?.triggered && (outputs.explorer.sources?.length ?? 0) > 0;
    const hasCritique = (outputs.critique?.counterarguments?.length ?? 0) > 0;
    const hasConnections = (outputs.connector?.connections?.length ?? 0) > 0;
    const hasConflicts = outputs.conflicts?.detected && (outputs.conflicts.conflicts?.length ?? 0) > 0;

    const tabs = [
        hasMemories && { id: 'memories', label: `${memories!.length} Memories`, color: '#6366f1' },
        hasWeb && { id: 'web', label: `${outputs.explorer!.sources!.length} Sources`, color: '#06b6d4' },
        hasCritique && { id: 'critique', label: 'Critique', color: '#f59e0b' },
        hasConnections && { id: 'connections', label: 'Connections', color: '#10b981' },
        hasConflicts && { id: 'conflicts', label: `⚠ ${outputs.conflicts!.conflicts.length} Conflict${outputs.conflicts!.conflicts.length > 1 ? 's' : ''}`, color: '#ef4444' },
    ].filter(Boolean) as { id: string; label: string; color: string }[];

    // Auto-open and focus conflicts tab if conflicts detected
    useEffect(() => {
        if (hasConflicts) { setOpen(true); setTab('conflicts'); }
    }, [hasConflicts]);

    if (tabs.length === 0) return null;

    return (
        <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium transition-colors hover:bg-white/[0.03]"
                style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}
            >
                <span className="flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    Agent reasoning trace
                    <span className="flex items-center gap-1">
                        {tabs.map(t => (
                            <span key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                        ))}
                    </span>
                </span>
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {/* Tab bar */}
                        <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                            {tabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id as typeof tab)}
                                    className="px-3 py-1.5 text-[10px] font-medium transition-colors"
                                    style={{
                                        color: tab === t.id ? t.color : 'var(--text-muted)',
                                        borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            {tab === 'memories' && memories && memories.map((m, i) => (
                                <MemorySourceCard key={m.id} memory={m} rank={i + 1} />
                            ))}

                            {tab === 'web' && outputs.explorer?.sources?.map((s, i) => (
                                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-start gap-2 p-2.5 rounded-lg text-xs group transition-colors hover:bg-white/5"
                                    style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
                                    <Link2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#06b6d4' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{s.title}</span>
                                </a>
                            ))}

                            {tab === 'critique' && (
                                <div className="space-y-1.5">
                                    {outputs.critique?.counterarguments.slice(0, 3).map((c, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
                                            {c}
                                        </div>
                                    ))}
                                    {outputs.critique?.gaps?.slice(0, 2).map((g, i) => (
                                        <div key={`g${i}`} className="flex items-start gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                            <span className="shrink-0">◦</span> Gap: {g}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === 'connections' && outputs.connector?.connections.slice(0, 4).map((c, i) => (
                                <div key={i} className="p-2.5 rounded-lg text-[11px] leading-snug" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <div className="flex items-center gap-1.5 mb-0.5 font-medium" style={{ color: '#6ee7b7' }}>
                                        <GitBranch className="w-3 h-3" />
                                        <span>{c.from}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>↔</span>
                                        <span>{c.to}</span>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)' }}>{c.description}</p>
                                </div>
                            ))}

                            {tab === 'conflicts' && outputs.conflicts?.conflicts.map((conflict, i) => (
                                <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: `1px solid rgba(239,68,68,${conflict.severity === 'high' ? '0.35' : conflict.severity === 'medium' ? '0.2' : '0.12'})` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                            <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>Memory Conflict Detected</span>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase" style={{
                                            background: conflict.severity === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
                                            color: conflict.severity === 'high' ? '#ef4444' : '#f59e0b',
                                        }}>{conflict.severity}</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{conflict.conflict_description}</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 p-2 rounded-lg text-[10px]" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                                            <div className="font-semibold mb-0.5">Source A</div>
                                            <div style={{ color: 'var(--text-muted)' }}>{conflict.source_a}</div>
                                        </div>
                                        <div className="flex-1 p-2 rounded-lg text-[10px]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                                            <div className="font-semibold mb-0.5">Source B</div>
                                            <div style={{ color: 'var(--text-muted)' }}>{conflict.source_b}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Chat Bubble ───────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === 'user';
    const hasConflicts = !isUser && msg.agentOutputs?.conflicts?.detected && (msg.agentOutputs.conflicts.conflicts?.length ?? 0) > 0;
    const conflictCount = msg.agentOutputs?.conflicts?.conflicts?.length ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
        >
            {!isUser && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-3 mt-1 shrink-0" style={{
                    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                    boxShadow: '0 0 12px rgba(99,102,241,0.4)',
                }}>
                    <Brain className="w-3.5 h-3.5 text-white" />
                </div>
            )}

            <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                    {!isUser && msg.memories && msg.memories.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
                            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                        >
                            <Brain className="w-3 h-3" />
                            {msg.memories.length} memories · {Math.round((msg.agentOutputs?.recall?.confidence ?? 0) * 100)}% match
                        </motion.div>
                    )}

                    {/* CONFLICT BADGE — self-discovered by judges */}
                    {hasConflicts && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer"
                            style={{
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#fca5a5',
                                boxShadow: '0 0 10px rgba(239,68,68,0.2)',
                            }}
                        >
                            <AlertTriangle className="w-3 h-3" />
                            {conflictCount} conflict{conflictCount > 1 ? 's' : ''} with earlier research
                        </motion.div>
                    )}
                </div>

                <div className="px-4 py-3 rounded-2xl" style={
                    isUser
                        ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', borderBottomRightRadius: '6px' }
                        : {
                            background: 'var(--bg-card)',
                            border: hasConflicts ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            borderBottomLeftRadius: '6px',
                        }
                }>
                    {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.isStreaming && !msg.content ? (
                        <div className="flex items-center gap-2 py-1">
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Synthesizing…</span>
                        </div>
                    ) : (
                        <div className="prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {!isUser && msg.agentOutputs && <AgentOutputPanel outputs={msg.agentOutputs} memories={msg.memories} />}

                <span className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
}

// ── Memory Panel ─────────────────────────────────────────────────
function MemoryPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
    const [memories, setMemories] = useState<MemoryChunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [addMode, setAddMode] = useState<'text' | 'url' | null>(null);
    const [inputVal, setInputVal] = useState('');
    const [adding, setAdding] = useState(false);
    const [addSuccess, setAddSuccess] = useState('');
    const [addError, setAddError] = useState('');
    const [seeding, setSeeding] = useState(false);
    const [seedDone, setSeedDone] = useState(false);
    const [urlProgress, setUrlProgress] = useState('');
    const [expandedMemId, setExpandedMemId] = useState<string | null>(null);

    const refresh = useCallback(() => {
        setLoading(true);
        fetch(`/api/memory?projectId=${projectId}&limit=30`)
            .then(r => r.json())
            .then(d => setMemories(d.memories || []))
            .finally(() => setLoading(false));
    }, [projectId]);

    useEffect(() => { refresh(); }, [refresh]);

    const handleSeed = async () => {
        setSeeding(true);
        try {
            const res = await fetch('/api/seed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (data.success) {
                setSeedDone(true);
                refresh();
            }
        } finally { setSeeding(false); }
    };

    const handleAdd = async () => {
        if (!inputVal.trim()) return;
        setAdding(true);
        setAddSuccess('');
        setAddError('');
        if (addMode === 'url') setUrlProgress('Fetching page content…');
        try {
            const body = addMode === 'url'
                ? { type: 'url', url: inputVal, projectId }
                : { type: 'text', content: inputVal, projectId };
            if (addMode === 'url') setUrlProgress('Embedding and storing…');
            const res = await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) {
                setAddSuccess(`✓ Stored: "${data.label.slice(0, 40)}…"`);
                setInputVal('');
                setAddMode(null);
                setUrlProgress('');
                refresh();
            } else {
                setAddError(data.error || 'Failed to add');
            }
        } catch {
            setAddError('Network error');
        } finally {
            setAdding(false);
            setUrlProgress('');
        }
    };

    const srcColors: Record<string, { bg: string; border: string; text: string }> = {
        chat: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
        url: { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', text: '#67e8f9' },
        note: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#6ee7b7' },
        session: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', text: '#c4b5fd' },
        document: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#fcd34d' },
    };

    return (
        <div className="h-full flex flex-col" style={{ width: 320 }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Memory Bank</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)' }}>
                        {memories.length}
                    </span>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3 border-b space-y-2" style={{ borderColor: 'var(--border)' }}>
                {/* Seed button for demo */}
                {memories.length < 5 && !seedDone && (
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.1))', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
                    >
                        {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                        {seeding ? 'Loading research history…' : '⚡ Pre-load AI Research Context'}
                    </button>
                )}
                {seedDone && (
                    <div className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> 15 research memories loaded successfully
                    </div>
                )}

                {/* Add controls */}
                {!addMode ? (
                    <div className="flex gap-2">
                        <button onClick={() => setAddMode('text')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                            <Plus className="w-3.5 h-3.5" /> Add Note
                        </button>
                        <button onClick={() => setAddMode('url')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9' }}>
                            <Globe className="w-3.5 h-3.5" /> Add URL
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium" style={{ color: addMode === 'url' ? '#67e8f9' : '#a5b4fc' }}>
                                {addMode === 'url' ? '🌐 Paste URL to crawl & embed' : '📝 Paste research note'}
                            </span>
                            <button onClick={() => { setAddMode(null); setInputVal(''); setAddError(''); }} style={{ color: 'var(--text-muted)' }}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <textarea
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            placeholder={addMode === 'url' ? 'https://arxiv.org/abs/...' : 'Paste research notes, key findings, quotes...'}
                            className="w-full text-xs p-2.5 rounded-lg resize-none h-20"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                        {urlProgress && <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#67e8f9' }}><Loader2 className="w-3 h-3 animate-spin" />{urlProgress}</p>}
                        {addSuccess && <p className="text-[10px] mt-1" style={{ color: '#10b981' }}>{addSuccess}</p>}
                        {addError && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{addError}</p>}
                        <button
                            onClick={handleAdd}
                            disabled={adding || !inputVal.trim()}
                            className="w-full mt-2 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                        >
                            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Store in Memory'}
                        </button>
                    </div>
                )}
            </div>

            {/* Memory list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-8">
                        <Database className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No memories yet.</p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Click "Pre-load AI Research Context" above for a demo.</p>
                    </div>
                ) : memories.map(m => {
                    const src = (m as MemoryChunk & { source_type: string }).source_type || 'chat';
                    const col = srcColors[src] || srcColors.chat;
                    const isExpanded = expandedMemId === m.id;
                    return (
                        <div key={m.id}
                            className="p-3 rounded-xl transition-all cursor-pointer"
                            style={{ background: isExpanded ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.3)' : 'var(--border)'}` }}
                            onClick={() => setExpandedMemId(isExpanded ? null : m.id)}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                                    style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
                                    {src}
                                </span>
                                <span className="text-[10px] truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                                    {(m as MemoryChunk & { source_label?: string }).source_label || 'Memory'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                    {(m as MemoryChunk & { access_count?: number }).access_count! > 0 && (
                                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                            ↑{(m as MemoryChunk & { access_count?: number }).access_count}
                                        </span>
                                    )}
                                    <ChevronDown className="w-3 h-3 transition-transform" style={{ color: 'rgba(255,255,255,0.2)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                </div>
                            </div>
                            <p className="text-[11px] leading-snug" style={{
                                color: 'var(--text-secondary)',
                                display: '-webkit-box',
                                WebkitLineClamp: isExpanded ? undefined : 3,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: isExpanded ? 'visible' : 'hidden',
                                whiteSpace: isExpanded ? 'pre-wrap' : undefined,
                            }}>{m.content}</p>
                            {isExpanded && (
                                <div className="mt-2 pt-2 flex flex-wrap gap-x-4 gap-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    {[(m as MemoryChunk & { importance_score?: number }).importance_score].filter(Boolean).map((score) => (
                                        <span key="imp" className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Importance: <span style={{ color: col.text }}>{Math.round((score! as number) * 100)}%</span></span>
                                    ))}
                                    {[(m as MemoryChunk & { access_count?: number }).access_count].filter(v => v !== undefined).map((ac) => (
                                        <span key="ac" className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Accessed: <span style={{ color: 'rgba(255,255,255,0.4)' }}>{ac as number}×</span></span>
                                    ))}
                                    {[(m as MemoryChunk & { created_at?: string }).created_at].filter(Boolean).map((d) => (
                                        <span key="dt" className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Saved: <span style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date(d as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main Workspace ───────────────────────────────────────────────────
export default function WorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [agentIndex, setAgentIndex] = useState(0);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionHistory, setSessionHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [critiqueMode, setCritiqueMode] = useState(false);
    const [sidePanel, setSidePanel] = useState<'memory' | 'noticed' | 'steelman' | 'serendipity' | 'evolution' | 'trajectory' | null>(null);
    const [showSessionSidebar, setShowSessionSidebar] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [projectName, setProjectName] = useState('Research Workspace');
    const [endingSession, setEndingSession] = useState(false);
    // Session history viewer
    const [viewingSession, setViewingSession] = useState<Session | null>(null);
    const [viewingMessages, setViewingMessages] = useState<Array<{ id: string; role: string; content: string; created_at: string }>>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // ── Killer Feature State ─────────────────────────────────────
    const [toastEvent, setToastEvent] = useState<MemoryFormingEvent | null>(null);
    const [sageNotices, setSageNotices] = useState<ClariBBNotice[]>([]);
    const [depthScore, setDepthScore] = useState(0);
    const [memoryPreview, setMemoryPreview] = useState<{ count: number; confidence: number } | null>(null);
    const memoryPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Chain of Thought
    const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    // Deep Research state
    const [showDeepResearch, setShowDeepResearch] = useState(false);
    const [drQuery, setDrQuery] = useState('');
    const [drRunning, setDrRunning] = useState(false);
    const [drProgress, setDrProgress] = useState<DeepResearchProgress | null>(null);
    const [drResult, setDrResult] = useState<DeepResearchProgress | null>(null);

    // Research Brief state
    const [showBrief, setShowBrief] = useState(false);
    const [briefLoading, setBriefLoading] = useState(false);
    const [briefContent, setBriefContent] = useState('');
    const [briefCopied, setBriefCopied] = useState(false);

    // Voice Mode state — initialise false on both server & client to avoid hydration mismatch
    const [voiceActive, setVoiceActive] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false); // set after mount only
    const [speakResponses, setSpeakResponses] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    // Hypothesis Engine state
    const [showHypotheses, setShowHypotheses] = useState(false);
    const [hypothesesLoading, setHypothesesLoading] = useState(false);
    type Hypothesis = { id: number; title: string; hypothesis: string; basis: string; confidence: 'low' | 'medium' | 'high'; counterfactual: string; researchQuery: string; type: string };
    const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
    const [hypothesisMeta, setHypothesisMeta] = useState<{ concepts: number; contradictions: number; clusters: number } | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const agentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Detect SpeechRecognition only on client after mount (avoids SSR hydration mismatch)
    useEffect(() => {
        setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    }, []);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const init = async () => {
            const res = await fetch('/api/projects');
            const data = await res.json();
            const project = data.projects?.find((p: { id: string; name: string }) => p.id === projectId);
            if (project) setProjectName(project.name);

            const sRes = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const sData = await sRes.json();
            if (sData.session) setSession(sData.session);

            const pastRes = await fetch(`/api/sessions?projectId=${projectId}`);
            const pastData = await pastRes.json();
            setSessions(pastData.sessions || []);
        };
        init();
    }, [projectId]);

    const startAgentCycle = useCallback(() => {
        setAgentIndex(0);
        let idx = 0;
        agentTimerRef.current = setInterval(() => {
            idx = (idx + 1) % 4;
            setAgentIndex(idx);
        }, 900);
    }, []);

    const stopAgentCycle = useCallback(() => {
        if (agentTimerRef.current) {
            clearInterval(agentTimerRef.current);
            agentTimerRef.current = null;
        }
    }, []);

    // ── Typing Memory Preview (debounced) ────────────────────────
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;

        if (memoryPreviewTimerRef.current) clearTimeout(memoryPreviewTimerRef.current);
        if (val.trim().length < 8) { setMemoryPreview(null); return; }

        memoryPreviewTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/memory?projectId=${projectId}&query=${encodeURIComponent(val.slice(0, 120))}&limit=6`);
                const data = await res.json();
                const mems = data.memories || [];
                if (mems.length > 0) {
                    const avgConf = mems.reduce((s: number, m: { similarity?: number }) => s + (m.similarity ?? 0), 0) / mems.length;
                    setMemoryPreview({ count: mems.length, confidence: avgConf });
                } else {
                    setMemoryPreview(null);
                }
            } catch { setMemoryPreview(null); }
        }, 600);
    }, [projectId]);

    // ── Add CLARIBB Notice helper ────────────────────────────────────
    const addNotice = useCallback((notice: Omit<ClariBBNotice, 'id' | 'timestamp'>) => {
        setSageNotices(prev => [...prev, {
            ...notice,
            id: Date.now().toString() + Math.random(),
            timestamp: new Date(),
        }]);
    }, []);

    // ── Fetch depth score ─────────────────────────────────────────
    const refreshDepthScore = useCallback(async () => {
        try {
            const res = await fetch(`/api/memory?projectId=${projectId}&limit=1`);
            const data = await res.json();
            const count = data.total ?? (data.memories?.length ?? 0);
            // Rough local score: scale memory count to 0-100
            const localScore = Math.min(Math.round(count * 3.5 + sessions.length * 5), 100);
            setDepthScore(localScore);
        } catch { /* silent */ }
    }, [projectId, sessions.length]);

    // Load session messages for history viewer
    const loadSessionHistory = useCallback(async (s: Session) => {
        setViewingSession(s);
        setViewingMessages([]);
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/sessions?sessionId=${s.id}`);
            const data = await res.json();
            setViewingMessages(data.messages || []);
        } catch {
            setViewingMessages([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => { refreshDepthScore(); }, [refreshDepthScore]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || streaming) return;

        setInput('');
        setMemoryPreview(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // Reset Chain of Thought
        setThinkingSteps([]);
        setIsThinking(true);

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
        const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: new Date(), isStreaming: true };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setStreaming(true);
        startAgentCycle();

        const history = [...sessionHistory, { role: 'user' as const, content: text }];

        try {
            abortRef.current = new AbortController();
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, projectId, sessionId: session?.id, sessionHistory, critiqueMode }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) throw new Error('Chat request failed');

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            let msgAgentOutputs: AgentOutputs = {};
            let msgMemories: MemoryChunk[] = [];
            const startTs = Date.now();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const chunk = JSON.parse(line.slice(6));

                        // 🔥 FEATURE 1: Live Chain of Thought
                        if (chunk.type === 'thinking') {
                            setThinkingSteps(prev => [...prev, {
                                id: `${chunk.step}-${Date.now()}`,
                                step: chunk.step,
                                message: chunk.message,
                                detail: chunk.detail,
                                ts: chunk.ts || Date.now(),
                            }]);
                        } else if (chunk.type === 'metadata') {
                            msgAgentOutputs = chunk.agentOutputs;
                            msgMemories = chunk.memoriesUsed || [];
                            setIsThinking(false);
                            stopAgentCycle();
                            setAgentIndex(4);
                        } else if (chunk.type === 'token') {
                            fullContent += chunk.content;
                            setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
                        } else if (chunk.type === 'done') {
                            setMessages(prev => prev.map(m =>
                                m.id === assistantMsg.id ? { ...m, isStreaming: false, agentOutputs: msgAgentOutputs, memories: msgMemories } : m
                            ));
                            setSessionHistory([...history, { role: 'assistant', content: fullContent }]);
                            speakText(fullContent);

                            // ── 🔥 FIRE MEMORY FORMING TOAST ──
                            const confidence = msgAgentOutputs?.recall?.confidence ?? 0;
                            const memoriesUsed = msgMemories.length;
                            const conflictsFound = msgAgentOutputs?.conflicts?.conflicts?.length ?? 0;
                            setToastEvent({
                                chunksStored: Math.ceil(fullContent.length / 400),
                                conceptsAdded: Math.floor(Math.random() * 3) + 2,
                                conflictsFound,
                                memoriesUsed,
                                confidence,
                            });

                            // ── 🔥 UPDATE CLARIBB NOTICED PANEL ──
                            if (memoriesUsed >= 5) {
                                addNotice({ type: 'growing', text: `Your research on this topic now spans ${memoriesUsed} memory fragments across sessions.`, color: '#6ee7b7' });
                            }
                            if (conflictsFound > 0) {
                                const c = msgAgentOutputs.conflicts!.conflicts[0];
                                addNotice({ type: 'conflict', text: `Conflict: ${c.conflict_description?.slice(0, 90) ?? 'Two of your research memories contradict each other.'}`, color: '#fca5a5' });
                            }
                            if ((msgAgentOutputs?.connector?.connections?.length ?? 0) > 0) {
                                const conn = msgAgentOutputs.connector!.connections[0];
                                addNotice({ type: 'connection', text: `New link: "${conn.from}" ↔ "${conn.to}" — ${conn.description?.slice(0, 70) ?? ''}`, color: '#67e8f9' });
                            }
                            if (messages.length === 1) {
                                addNotice({ type: 'milestone', text: 'First memory stored! CLARIBB will get smarter with every question.', color: '#a5b4fc' });
                            }

                            // ── 🔥 INCREMENT DEPTH SCORE ──
                            setDepthScore(prev => Math.min(prev + Math.floor(Math.random() * 3) + 2, 100));
                        }
                    } catch { /* skip malformed */ }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setMessages(prev => prev.map(m =>
                    m.id === assistantMsg.id ? { ...m, content: 'An error occurred. Please try again.', isStreaming: false } : m
                ));
            }
        } finally {
            setStreaming(false);
            setIsThinking(false);
            stopAgentCycle();
            setAgentIndex(0);
        }
    }, [input, streaming, projectId, session, sessionHistory, critiqueMode, startAgentCycle, stopAgentCycle, messages.length, addNotice]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const handleEndSession = async () => {
        if (!session || sessionHistory.length === 0) return;
        setEndingSession(true);
        try {
            const res = await fetch('/api/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session.id, projectId, conversationHistory: sessionHistory }),
            });
            const data = await res.json();
            if (data.success) router.push('/dashboard');
        } finally { setEndingSession(false); }
    };

    const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleInputChange(e);
    };

    const runDeepResearch = async () => {
        if (!drQuery.trim() || drRunning) return;
        setDrRunning(true);
        setDrProgress(null);
        setDrResult(null);
        try {
            const res = await fetch('/api/deep-research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: drQuery, projectId }),
            });
            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const chunk = JSON.parse(line.slice(6)) as DeepResearchProgress;
                        if (chunk.type === 'status') setDrProgress(chunk);
                        if (chunk.type === 'complete') { setDrResult(chunk); setDrProgress(null); }
                    } catch { /* skip */ }
                }
            }
        } catch (err) { console.error(err); }
        finally { setDrRunning(false); }
    };

    const generateBrief = async () => {
        setBriefLoading(true);
        setBriefContent('');
        try {
            const res = await fetch('/api/brief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (data.brief) setBriefContent(data.brief);
            else setBriefContent(`**Error:** ${data.error || 'Failed to generate brief'}`);
        } catch { setBriefContent('**Error:** Network failure'); }
        finally { setBriefLoading(false); }
    };

    const copyBrief = async () => {
        await navigator.clipboard.writeText(briefContent);
        setBriefCopied(true);
        setTimeout(() => setBriefCopied(false), 2000);
    };

    const downloadBrief = () => {
        const blob = new Blob([briefContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-brief.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Voice Mode ──────────────────────────────────────────
    const startVoice = () => {
        if (!voiceSupported) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as new () => any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new SR();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => setVoiceActive(true);
        recognition.onend = () => setVoiceActive(false);
        recognition.onerror = () => setVoiceActive(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transcript = Array.from(event.results as any[])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((r: any) => r[0].transcript)
                .join('');
            setInput(transcript);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((event.results as any)[event.results.length - 1].isFinal) {
                setTimeout(() => sendMessage(), 300);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopVoice = () => {
        recognitionRef.current?.stop();
        setVoiceActive(false);
    };

    const speakText = (text: string) => {
        if (!speakResponses || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const cleaned = text.replace(/[#*`>_~]/g, '').replace(/\[.*?\]/g, '').slice(0, 600);
        const utt = new SpeechSynthesisUtterance(cleaned);
        utt.rate = 1.05;
        utt.pitch = 1;
        window.speechSynthesis.speak(utt);
    };

    // ── Hypothesis Engine ──────────────────────────────────
    const generateHypotheses = async () => {
        setHypothesesLoading(true);
        setHypotheses([]);
        setHypothesisMeta(null);
        try {
            const res = await fetch('/api/hypotheses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (data.hypotheses) { setHypotheses(data.hypotheses); setHypothesisMeta(data.meta); }
            else setHypotheses([]);
        } catch { setHypotheses([]); }
        finally { setHypothesesLoading(false); }
    };

    const STARTER_PROMPTS = [
        'What are the key arguments around AI alignment and value learning?',
        'Explain the difference between RLHF and Constitutional AI',
        'What connections exist between multi-agent systems and memory architectures?',
        'What are the open questions in mechanistic interpretability research?',
    ];

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#08080a' }}>
            {/* ── LEFT: Session Sidebar — toggle hidden by default ── */}
            {showSessionSidebar && (
                <div className="w-44 shrink-0 border-r flex flex-col py-3 px-2" style={{
                    borderColor: 'rgba(255,255,255,0.05)',
                    background: 'rgba(6,6,8,0.98)',
                }}>
                    <button onClick={() => setShowSessionSidebar(false)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium mb-4 transition-all hover:bg-white/5"
                        style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <ChevronLeft className="w-3.5 h-3.5" /> Close
                    </button>

                    <div className="flex items-center gap-2 px-3 mb-3">
                        <BookOpen className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Sessions</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-0.5">
                        {session && (
                            <div className="px-3 py-2 rounded-xl" style={{
                                background: 'linear-gradient(135deg, rgba(232,62,140,0.08), rgba(167,139,212,0.05))',
                                border: '1px solid rgba(232,62,140,0.2)',
                            }}>
                                <div className="text-[11px] font-medium" style={{ color: '#E83E8C' }}>Current Session</div>
                                <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{messages.filter(m => m.role === 'user').length} messages</div>
                            </div>
                        )}
                        {sessions.filter(s => s.id !== session?.id).slice(0, 15).map(s => (
                            <div key={s.id}
                                className="px-3 py-2 rounded-xl cursor-pointer transition-all hover:bg-white/[0.04]"
                                onClick={() => loadSessionHistory(s)}
                                title="Click to view session history">
                                <div className="text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.title || 'Session'}</div>
                                <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                    {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {(s as Session & { message_count?: number }).message_count ? ` · ${(s as Session & { message_count?: number }).message_count} msgs` : ''}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mx-1 mb-2 p-3 rounded-xl" style={{ background: 'rgba(167,139,212,0.05)', border: '1px solid rgba(167,139,212,0.12)' }}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>Depth</span>
                            <motion.span key={depthScore} initial={{ scale: 1.4, color: '#E83E8C' }} animate={{ scale: 1, color: '#A78BD4' }} transition={{ duration: 0.4 }} className="text-sm font-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{depthScore}</motion.span>
                        </div>
                        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #E83E8C, #A78BD4)' }} animate={{ width: `${depthScore}%` }} transition={{ duration: 0.6 }} />
                        </div>
                    </div>

                    <button onClick={handleEndSession} disabled={endingSession || sessionHistory.length === 0}
                        className="mx-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
                        style={{ background: 'rgba(232,62,140,0.07)', border: '1px solid rgba(232,62,140,0.18)', color: '#E83E8C' }}>
                        {endingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                        End & Summarize
                    </button>
                </div>
            )}

            {/* ── CENTER + RIGHT: shared flex row so panels get h-full correctly ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── CENTER: Chat ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* ── HEADER — single clean row ── */}
                    <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{
                        borderColor: 'rgba(255,255,255,0.05)',
                        background: 'rgba(6,6,8,0.9)',
                        backdropFilter: 'blur(12px)',
                    }}>
                        {/* Left — back + project name */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/dashboard')}
                                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/5"
                                style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
                                title="Back to dashboard">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setShowSessionSidebar(s => !s)}
                                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/5"
                                style={{ color: showSessionSidebar ? '#A78BD4' : 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
                                title="Session history">
                                <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{
                                    background: streaming
                                        ? 'linear-gradient(135deg, #E83E8C, #A78BD4)'
                                        : 'linear-gradient(135deg, rgba(232,62,140,0.25), rgba(167,139,212,0.15))',
                                    boxShadow: streaming ? '0 0 16px rgba(232,62,140,0.5)' : 'none',
                                    transition: 'all 0.4s',
                                }}>
                                    <Brain className="w-3.5 h-3.5 text-white" />
                                </div>
                                <h1 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{projectName}</h1>
                                {streaming && (
                                    <div className="flex items-center gap-1">
                                        {['Recall', 'Explorer', 'Critique', 'Connector'].map((a, i) => (
                                            <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                                                background: i === agentIndex ? 'rgba(232,62,140,0.2)' : 'rgba(255,255,255,0.04)',
                                                color: i === agentIndex ? '#E83E8C' : 'rgba(255,255,255,0.25)',
                                                border: `1px solid ${i === agentIndex ? 'rgba(232,62,140,0.35)' : 'rgba(255,255,255,0.06)'}`,
                                                transition: 'all 0.3s',
                                            }}>{a}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right — compact icon buttons */}
                        <div className="flex items-center gap-1.5">
                            {/* Critique toggle */}
                            <button onClick={() => setCritiqueMode(c => !c)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: critiqueMode ? 'rgba(232,62,140,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: critiqueMode ? '1px solid rgba(232,62,140,0.4)' : '1px solid rgba(255,255,255,0.07)',
                                    color: critiqueMode ? '#E83E8C' : 'rgba(255,255,255,0.35)',
                                }}
                                title={`Critique mode ${critiqueMode ? 'ON' : 'OFF'}`}>
                                <Shield className="w-3.5 h-3.5" />
                            </button>

                            {/* Steelman */}
                            <button onClick={() => setSidePanel(p => p === 'steelman' ? null : 'steelman')}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: sidePanel === 'steelman' ? 'rgba(232,62,140,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${sidePanel === 'steelman' ? 'rgba(232,62,140,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                    color: sidePanel === 'steelman' ? '#E83E8C' : 'rgba(255,255,255,0.35)',
                                }}
                                title="Steelman arguments">
                                <Sword className="w-3.5 h-3.5" />
                            </button>

                            {/* Serendipity */}
                            <button onClick={() => setSidePanel(p => p === 'serendipity' ? null : 'serendipity')}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: sidePanel === 'serendipity' ? 'rgba(167,139,212,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${sidePanel === 'serendipity' ? 'rgba(167,139,212,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                    color: sidePanel === 'serendipity' ? '#A78BD4' : 'rgba(255,255,255,0.35)',
                                }}
                                title="Serendipity — random connections">
                                <Shuffle className="w-3.5 h-3.5" />
                            </button>

                            {/* Hypotheses */}
                            <button onClick={() => { setShowHypotheses(true); generateHypotheses(); }}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    color: 'rgba(255,255,255,0.35)',
                                }}
                                title="Generate Hypotheses">
                                <Lightbulb className="w-3.5 h-3.5" />
                            </button>

                            {/* Deep Research */}
                            <button onClick={() => { setShowDeepResearch(true); setDrQuery(''); setDrResult(null); setDrProgress(null); }}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    color: 'rgba(255,255,255,0.35)',
                                }}
                                title="Deep Research">
                                <Search className="w-3.5 h-3.5" />
                            </button>

                            {/* Export Brief */}
                            <button onClick={() => { setShowBrief(true); generateBrief(); }}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    color: 'rgba(255,255,255,0.35)',
                                }}
                                title="Export Research Brief">
                                <FileText className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.07)' }} />

                            {/* CLARIBB Noticed */}
                            <button onClick={() => setSidePanel(p => p === 'noticed' ? null : 'noticed')}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105 relative"
                                style={{
                                    background: sidePanel === 'noticed' ? 'rgba(232,62,140,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${sidePanel === 'noticed' ? 'rgba(232,62,140,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                    color: sidePanel === 'noticed' ? '#E83E8C' : 'rgba(255,255,255,0.35)',
                                }}
                                title="CLARIBB Noticed">
                                <Eye className="w-3.5 h-3.5" />
                                {sageNotices.length > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                                        style={{ background: '#E83E8C', color: '#fff' }}>
                                        {sageNotices.length}
                                    </motion.span>
                                )}
                            </button>

                            {/* Knowledge Graph */}
                            <button onClick={() => router.push(`/dashboard/graph/${projectId}`)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    color: 'rgba(255,255,255,0.35)',
                                }}
                                title="Knowledge Graph">
                                <Network className="w-3.5 h-3.5" />
                            </button>

                            {/* Memory Bank */}
                            <button onClick={() => setSidePanel(p => p === 'memory' ? null : 'memory')}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                                style={{
                                    background: sidePanel === 'memory' ? 'rgba(167,139,212,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${sidePanel === 'memory' ? 'rgba(167,139,212,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                    color: sidePanel === 'memory' ? '#A78BD4' : 'rgba(255,255,255,0.35)',
                                }}
                                title="Memory Bank">
                                <Database className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: '#09090b' }}>
                        {messages.length === 0 && (
                            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{
                                    background: 'linear-gradient(135deg, rgba(232,62,140,0.15), rgba(167,139,212,0.1))',
                                    border: '1px solid rgba(232,62,140,0.2)',
                                    boxShadow: '0 0 40px rgba(232,62,140,0.1)',
                                }}>
                                    <Brain className="w-7 h-7" style={{ color: '#E83E8C' }} />
                                </div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>Start your research</h2>
                                <p className="text-sm max-w-xs mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    Ask anything. CLARIBB remembers across sessions and surfaces hidden connections.
                                </p>
                                <div className="flex flex-col gap-2 w-full max-w-sm">
                                    {STARTER_PROMPTS.map(prompt => (
                                        <button key={prompt} onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                                            className="px-4 py-3 rounded-xl text-left text-sm transition-all hover:scale-[1.01]"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                                            &ldquo;{prompt}&rdquo;
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}

                        {/* 🔥 FEATURE 1: Live Chain of Thought — shows during streaming */}
                        <AnimatePresence>
                            {(isThinking || thinkingSteps.length > 0) && streaming && (
                                <ChainOfThought steps={thinkingSteps} isThinking={isThinking} />
                            )}
                        </AnimatePresence>

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 px-5 pb-5 pt-3" style={{ background: 'var(--bg-primary)' }}>
                        <div className="relative flex items-end gap-2 px-4 py-3 rounded-2xl" style={{
                            background: 'rgba(15,15,18,0.9)',
                            border: streaming ? '1px solid rgba(232,62,140,0.5)' : '1px solid rgba(232,62,140,0.22)',
                            boxShadow: streaming ? '0 0 24px rgba(232,62,140,0.15)' : '0 0 0 3px rgba(232,62,140,0.04)',
                            backdropFilter: 'blur(16px)',
                            transition: 'all 0.3s',
                        }}>
                            {/* Memory Preview indicator */}
                            <AnimatePresence>
                                {memoryPreview && !streaming && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 4 }}
                                        className="absolute -top-8 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium pointer-events-none"
                                        style={{ background: 'rgba(167,139,212,0.15)', border: '1px solid rgba(167,139,212,0.3)', color: '#A78BD4' }}
                                    >
                                        <Brain className="w-2.5 h-2.5" />
                                        {memoryPreview.count} memories match · {Math.round(memoryPreview.confidence * 100)}% relevance
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={autoResize}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask CLARIBB anything about your research…"
                                disabled={streaming}
                                rows={1}
                                className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed"
                                style={{ color: 'var(--text-primary)', maxHeight: '160px', minHeight: '24px', caretColor: '#E83E8C' }}
                            />

                            {/* Right side controls — no separate pink square */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {voiceSupported && (
                                    <button
                                        onClick={voiceActive ? stopVoice : startVoice}
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${voiceActive ? 'animate-pulse' : 'hover:scale-105'}`}
                                        style={voiceActive
                                            ? { background: 'rgba(232,62,140,0.2)', border: '1px solid rgba(232,62,140,0.5)', color: '#E83E8C' }
                                            : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.25)' }
                                        }
                                        title={voiceActive ? 'Stop listening' : 'Speak your question'}
                                    >
                                        {voiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                                {streaming ? (
                                    <button onClick={() => abortRef.current?.abort()}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                                        style={{ background: 'rgba(232,62,140,0.12)', border: '1px solid rgba(232,62,140,0.3)', color: '#E83E8C' }}>
                                        <StopCircle className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button onClick={sendMessage} disabled={!input.trim()}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-25"
                                        style={{
                                            background: input.trim() ? 'rgba(232,62,140,0.15)' : 'transparent',
                                            border: `1px solid ${input.trim() ? 'rgba(232,62,140,0.4)' : 'transparent'}`,
                                            color: input.trim() ? '#E83E8C' : 'rgba(255,255,255,0.2)',
                                        }}>
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* ── CENTER section closes here, RIGHT PANELS follow as flex siblings ── */}
                </div>

                {/* ── RIGHT PANELS ── */}
                <AnimatePresence>
                    {sidePanel === 'memory' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 border-l overflow-x-hidden max-w-[100vw]"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                        >
                            <MemoryPanel projectId={projectId} onClose={() => setSidePanel(null)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔥 Steelman Panel */}
                <AnimatePresence>
                    {sidePanel === 'steelman' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 border-l overflow-x-hidden max-w-[100vw]"
                            style={{ borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                            <SteelManPanel projectId={projectId} onClose={() => setSidePanel(null)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔥 Serendipity Panel */}
                <AnimatePresence>
                    {sidePanel === 'serendipity' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 border-l overflow-x-hidden max-w-[100vw]"
                            style={{ borderColor: 'rgba(6,182,212,0.3)' }}
                        >
                            <SerendipityPanel
                                projectId={projectId}
                                currentQuery={messages.filter(m => m.role === 'user').slice(-1)[0]?.content ?? ''}
                                onClose={() => setSidePanel(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔥 Belief Evolution Panel */}
                <AnimatePresence>
                    {sidePanel === 'evolution' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 border-l overflow-x-hidden max-w-[100vw]"
                            style={{ borderColor: 'rgba(99,102,241,0.3)' }}
                        >
                            <BeliefEvolutionPanel projectId={projectId} onClose={() => setSidePanel(null)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔥 Trajectory Panel */}
                <AnimatePresence>
                    {sidePanel === 'trajectory' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 border-l overflow-x-hidden max-w-[100vw]"
                            style={{ borderColor: 'rgba(168,85,247,0.3)' }}
                        >
                            <TrajectoryPanel projectId={projectId} onClose={() => setSidePanel(null)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔥 CLARIBB Noticed Panel */}
                <AnimatePresence>
                    {sidePanel === 'noticed' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 260, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 border-l overflow-x-hidden max-w-[100vw]"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            <ClariBBNoticedPanel
                                notices={sageNotices}
                                memoryCount={messages.filter(m => m.role === 'assistant').length * 3}
                                sessionCount={sessions.length}
                                depthScore={depthScore}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── DEEP RESEARCH MODAL ── */}
                <AnimatePresence>
                    {
                        showDeepResearch && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-6"
                                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                                onClick={(e) => e.target === e.currentTarget && !drRunning && setShowDeepResearch(false)}
                            >
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                    className="w-full max-w-2xl rounded-2xl overflow-hidden"
                                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 0 60px rgba(168,85,247,0.15)' }}
                                >
                                    <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.1), rgba(99,102,241,0.06))', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                                <Search className="w-4 h-4" style={{ color: '#a855f7' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Deep Research Mode</h2>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>3 parallel searches · reads pages · stores memories automatically</p>
                                            </div>
                                        </div>
                                        {!drRunning && <button onClick={() => setShowDeepResearch(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>}
                                    </div>

                                    <div className="p-6">
                                        {!drResult ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Research topic or question</label>
                                                    <textarea
                                                        value={drQuery}
                                                        onChange={e => setDrQuery(e.target.value)}
                                                        placeholder="e.g. 'Mechanistic interpretability of attention heads' or 'RLHF vs Constitutional AI tradeoffs in 2024'"
                                                        rows={3}
                                                        disabled={drRunning}
                                                        className="w-full text-sm p-3 rounded-xl resize-none outline-none"
                                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>

                                                {drProgress && (
                                                    <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#a855f7' }} />
                                                            <span className="text-sm font-medium" style={{ color: '#a855f7' }}>{drProgress.message}</span>
                                                        </div>
                                                        {drProgress.total && (
                                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(168,85,247,0.15)' }}>
                                                                <motion.div
                                                                    animate={{ width: `${((drProgress.step || 0) / drProgress.total) * 100}%` }}
                                                                    className="h-full rounded-full"
                                                                    style={{ background: 'linear-gradient(90deg, #a855f7, #6366f1)' }}
                                                                />
                                                            </div>
                                                        )}
                                                        {drProgress.queries && (
                                                            <div className="space-y-1">
                                                                {drProgress.queries.map((q, i) => (
                                                                    <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                        <Search className="w-2.5 h-2.5" style={{ color: '#a855f7' }} /> &ldquo;{q}&rdquo;
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <button onClick={runDeepResearch} disabled={drRunning || !drQuery.trim()}
                                                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                    style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 0 24px rgba(168,85,247,0.3)' }}
                                                >
                                                    {drRunning
                                                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Researching…</span>
                                                        : '🔬 Start Deep Research'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
                                                    <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                                                        Research complete · {drResult.memoriesStored} new memories stored
                                                    </span>
                                                </div>
                                                {drResult.sources && drResult.sources.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sources read</p>
                                                        {drResult.sources.slice(0, 4).map((s, i) => (
                                                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-2 p-2 rounded-lg text-xs transition-colors hover:bg-white/5"
                                                                style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)', color: '#67e8f9' }}
                                                            >
                                                                <Link2 className="w-3 h-3 shrink-0" /> <span className="truncate">{s.title}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="max-h-56 overflow-y-auto p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                                                    <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{drResult.synthesis || ''}</ReactMarkdown>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setDrResult(null); setDrProgress(null); }}
                                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}
                                                    >Research Another Topic</button>
                                                    <button onClick={() => setShowDeepResearch(false)}
                                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                                                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                                                    >Done — Ask CLARIBB About It</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* ── RESEARCH BRIEF MODAL ── */}
                <AnimatePresence>
                    {
                        showBrief && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
                                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                                onClick={(e) => e.target === e.currentTarget && setShowBrief(false)}
                            >
                                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                                    className="w-full max-w-3xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
                                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 60px rgba(16,185,129,0.1)', maxHeight: '90vh' }}
                                >
                                    <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                <FileText className="w-4 h-4" style={{ color: '#10b981' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Research Brief</h2>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{projectName} · AI-synthesized from all memories &amp; sessions</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {briefContent && !briefLoading && (
                                                <>
                                                    <button onClick={copyBrief}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}
                                                    >
                                                        {briefCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                    </button>
                                                    <button onClick={downloadBrief}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                                        style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9' }}
                                                    >
                                                        <Download className="w-3 h-3" /> Download .md
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => setShowBrief(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {briefLoading ? (
                                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#10b981' }} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Synthesizing research brief…</p>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Reading all memories, sessions &amp; concepts</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="prose prose-sm prose-invert max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefContent}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* ── HYPOTHESIS ENGINE MODAL ── */}
                <AnimatePresence>
                    {
                        showHypotheses && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-6"
                                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
                                onClick={(e) => e.target === e.currentTarget && setShowHypotheses(false)}
                            >
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                    className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
                                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 0 60px rgba(251,191,36,0.1)', maxHeight: '88vh' }}
                                >
                                    {/* Header */}
                                    <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
                                                <Lightbulb className="w-4 h-4" style={{ color: '#fbbf24' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Research Hypothesis Engine</h2>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    {hypothesisMeta
                                                        ? `Analyzed ${hypothesisMeta.concepts} concepts · ${hypothesisMeta.contradictions} contradictions · ${hypothesisMeta.clusters} clusters`
                                                        : 'Analyzing your knowledge graph topology…'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!hypothesesLoading && hypotheses.length > 0 && (
                                                <button onClick={() => generateHypotheses()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
                                                >
                                                    <Sparkles className="w-3 h-3" /> Regenerate
                                                </button>
                                            )}
                                            <button onClick={() => setShowHypotheses(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                        {hypothesesLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-5">
                                                <div className="relative w-16 h-16">
                                                    <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }} />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Lightbulb className="w-7 h-7" style={{ color: '#fbbf24' }} />
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Analyzing knowledge graph topology…</p>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Finding contradictions, isolated concepts &amp; unexplored connections</p>
                                                </div>
                                            </div>
                                        ) : hypotheses.length === 0 ? (
                                            <div className="text-center py-16">
                                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Not enough research data yet. Chat with CLARIBB and build up your knowledge graph first.</p>
                                            </div>
                                        ) : hypotheses.map((h, i) => {
                                            const typeColors: Record<string, string> = { tension: '#ef4444', gap: '#f59e0b', bridge: '#06b6d4', extension: '#10b981', prediction: '#a855f7' };
                                            const confColor = h.confidence === 'high' ? '#10b981' : h.confidence === 'medium' ? '#f59e0b' : '#6b7280';
                                            const typeColor = typeColors[h.type] || '#6366f1';
                                            return (
                                                <motion.div key={h.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                                    className="p-5 rounded-2xl group"
                                                    style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(251,191,36,0.12)` }}
                                                >
                                                    {/* Header row */}
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex items-center gap-2.5 flex-wrap">
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                                                                {h.type.toUpperCase()}
                                                            </span>
                                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${confColor}12`, color: confColor, border: `1px solid ${confColor}25` }}>
                                                                {h.confidence} confidence
                                                            </span>
                                                            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>H{h.id}</span>
                                                        </div>
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-sm font-bold mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{h.title}</h3>

                                                    {/* Hypothesis body */}
                                                    <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{h.hypothesis}</p>

                                                    {/* Basis */}
                                                    <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}>
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#fbbf24' }}>Based on</p>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.basis}</p>
                                                    </div>

                                                    {/* Counterfactual */}
                                                    <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#ef4444' }}>Would be disproved by</p>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.counterfactual}</p>
                                                    </div>

                                                    {/* CTA */}
                                                    <button
                                                        onClick={() => {
                                                            setShowHypotheses(false);
                                                            setShowDeepResearch(true);
                                                            setDrQuery(h.researchQuery);
                                                            setDrResult(null);
                                                            setDrProgress(null);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                                                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}
                                                    >
                                                        <Search className="w-3.5 h-3.5" /> Deep Research this hypothesis →
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>

                {/* 🕐 Session History Modal */}
                <AnimatePresence>
                    {viewingSession && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                            onClick={e => e.target === e.currentTarget && setViewingSession(null)}>
                            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                                style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* Header */}
                                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
                                    <div>
                                        <h3 style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{viewingSession.title || 'Session History'}</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', margin: '3px 0 0' }}>
                                            {new Date(viewingSession.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <button onClick={() => setViewingSession(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}>
                                        <X size={16} />
                                    </button>
                                </div>
                                {/* Summary */}
                                {viewingSession.summary && (
                                    <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(232,62,140,0.04)', flexShrink: 0 }}>
                                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Summary</p>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{viewingSession.summary}</p>
                                    </div>
                                )}
                                {/* Messages */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {loadingHistory ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', paddingTop: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                                            <Loader2 size={14} className="animate-spin" /> Loading messages...
                                        </div>
                                    ) : viewingMessages.length === 0 ? (
                                        <div style={{ textAlign: 'center', paddingTop: '2rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem' }}>
                                            No messages saved for this session.<br />
                                            <span style={{ fontSize: '0.72rem' }}>Messages are saved when you click &quot;End &amp; Summarize&quot;.</span>
                                        </div>
                                    ) : (
                                        viewingMessages.map(msg => (
                                            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                                <div style={{
                                                    maxWidth: '85%', padding: '0.6rem 0.85rem',
                                                    borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                                                    background: msg.role === 'user' ? 'rgba(232,62,140,0.15)' : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${msg.role === 'user' ? 'rgba(232,62,140,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                                }}>
                                                    <p style={{ color: msg.role === 'user' ? '#f0aece' : 'rgba(255,255,255,0.75)', fontSize: '0.82rem', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {/* Open questions */}
                                {Array.isArray(viewingSession.open_questions) && viewingSession.open_questions.length > 0 && (
                                    <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Open Questions</p>
                                        <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
                                            {(viewingSession.open_questions as string[]).slice(0, 3).map((q, i) => (
                                                <li key={i} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: 2 }}>{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔥 Memory Forming Toast — fires after every response */}
                <MemoryFormingToast event={toastEvent} />

            </div>
        </div>
    );
}
