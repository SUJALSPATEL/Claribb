'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FileText, Globe, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface MemoryItem {
    id: string;
    content: string;
    source_type: string;
    source_label: string;
    importance_score: number;
    access_count: number;
    created_at: string;
}

interface Props {
    projectId: string;
    messages: ChatMessage[];
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
    note: FileText,
    url: Globe,
    document: FileText,
    chat: Database,
    session: Clock,
};

const SOURCE_COLORS: Record<string, string> = {
    note: '#6366f1',
    url: '#06b6d4',
    document: '#a855f7',
    chat: '#10b981',
    session: '#f59e0b',
};

export default function MemoryPanel({ projectId, messages }: Props) {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMemoryIds, setActiveMemoryIds] = useState<Set<string>>(new Set());
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchMemories = useCallback(async () => {
        try {
            const res = await fetch(`/api/memory?projectId=${projectId}&limit=30`);
            const data = await res.json();
            setMemories(data.memories || []);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchMemories(); }, [fetchMemories]);

    // Track which memories were recently used in messages
    useEffect(() => {
        const latest = messages[messages.length - 1];
        if (latest?.memories) {
            const ids = new Set(latest.memories.map(m => m.id));
            setActiveMemoryIds(ids);
            setTimeout(() => setActiveMemoryIds(new Set()), 4000);
        }
    }, [messages]);

    // Poll for new memories every 15s
    useEffect(() => {
        const interval = setInterval(fetchMemories, 15000);
        return () => clearInterval(interval);
    }, [fetchMemories]);

    return (
        <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
            {/* Header */}
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Memory Graph</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)' }}>
                        {memories.length}
                    </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chunks indexed from your research</p>
            </div>

            {/* Memory list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 rounded-xl shimmer" />
                    ))
                ) : memories.length === 0 ? (
                    <div className="text-center py-12">
                        <Database className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No memories yet.</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add notes or start chatting to build your memory graph.</p>
                    </div>
                ) : (
                    memories.map((mem) => {
                        const Icon = SOURCE_ICONS[mem.source_type] || FileText;
                        const color = SOURCE_COLORS[mem.source_type] || '#6366f1';
                        const isActive = activeMemoryIds.has(mem.id);
                        const isExpanded = expandedId === mem.id;

                        return (
                            <motion.div
                                key={mem.id}
                                animate={isActive ? {
                                    borderColor: ['rgba(99,102,241,0.2)', 'rgba(99,102,241,0.6)', 'rgba(99,102,241,0.2)'],
                                    boxShadow: ['none', '0 0 12px rgba(99,102,241,0.3)', 'none'],
                                } : {}}
                                transition={{ duration: 0.8, repeat: isActive ? 2 : 0 }}
                                onClick={() => setExpandedId(isExpanded ? null : mem.id)}
                                className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/[0.03]"
                                style={{
                                    background: isExpanded ? 'rgba(99,102,241,0.06)' : isActive ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)',
                                    border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.35)' : isActive ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                                }}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                                                {mem.source_label}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {isActive && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent-light)', fontSize: 10 }}>
                                                        Used ✓
                                                    </span>
                                                )}
                                                <ChevronDown
                                                    className="w-3 h-3 transition-transform"
                                                    style={{ color: 'rgba(255,255,255,0.2)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                                />
                                            </div>
                                        </div>
                                        {/* Content — truncated, expands on click */}
                                        <p className="text-xs leading-relaxed" style={{
                                            color: 'var(--text-muted)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: isExpanded ? undefined : 2,
                                            WebkitBoxOrient: 'vertical' as const,
                                            overflow: isExpanded ? 'visible' : 'hidden',
                                            whiteSpace: isExpanded ? 'pre-wrap' : undefined,
                                        }}>
                                            {mem.content}
                                        </p>
                                        {/* Expanded metadata */}
                                        {isExpanded && (
                                            <div className="mt-2 pt-2 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Importance</span>
                                                    <span className="text-[10px]" style={{ color }}>{Math.round((mem.importance_score || 0.5) * 100)}%</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Accessed</span>
                                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{mem.access_count}×</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Saved</span>
                                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date(mem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* Importance bar (collapsed only) */}
                                        {!isExpanded && (
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    accessed {mem.access_count}×
                                                </span>
                                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${(mem.importance_score || 0.5) * 100}%`,
                                                            background: `linear-gradient(90deg, ${color}, ${color}80)`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
