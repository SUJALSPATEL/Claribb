'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Loader2, GitBranch, Sparkles, Building2, X } from 'lucide-react';

interface SerendipityInsight {
    from_project: string;
    connection: string;
    why_it_matters: string;
    strength: number;
    type: 'analogy' | 'evidence' | 'contradiction' | 'method' | 'framework';
}

interface Props {
    projectId: string;
    currentQuery: string;
    onClose: () => void;
}

const TYPE_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
    analogy: { color: '#a5b4fc', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', label: 'Analogy' },
    evidence: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Evidence' },
    contradiction: { color: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Contradiction' },
    method: { color: '#67e8f9', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', label: 'Method' },
    framework: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', label: 'Framework' },
};

export default function SerendipityPanel({ projectId, currentQuery, onClose }: Props) {
    const [query, setQuery] = useState(currentQuery);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<SerendipityInsight[]>([]);
    const [metaInsight, setMetaInsight] = useState('');
    const [projectsSearched, setProjectsSearched] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const run = async () => {
        if (!query.trim() || loading) return;
        setLoading(true);
        setInsights([]);
        setMetaInsight('');
        setMessage('');
        setError('');
        try {
            const res = await fetch('/api/serendipity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, query }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            setInsights(data.insights || []);
            setMetaInsight(data.metaInsight || '');
            setProjectsSearched(data.projectsSearched || 0);
            setMessage(data.message || '');
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)', width: '100%' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
                        <Shuffle className="w-3.5 h-3.5" style={{ color: '#67e8f9' }} />
                    </div>
                    <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Cross-Project Serendipity</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Insights from your other research projects</div>
                    </div>
                </div>
                <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-3">
                    <label className="text-xs font-medium block" style={{ color: 'var(--text-secondary)' }}>
                        What are you researching? CLARIBB will search ALL your other projects.
                    </label>
                    <textarea
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl resize-none outline-none"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    {error && <p className="text-[10px]" style={{ color: '#f87171' }}>{error}</p>}
                    <button
                        onClick={run}
                        disabled={loading || !query.trim()}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.7), rgba(99,102,241,0.8))', color: 'white', boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}
                    >
                        {loading
                            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching {projectsSearched} projects...</span>
                            : '🌌 Find Cross-Project Connections'}
                    </button>
                </div>

                <AnimatePresence>
                    {message && insights.length === 0 && !loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-6"
                        >
                            <Shuffle className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{message}</p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                Research more across multiple projects first.
                            </p>
                        </motion.div>
                    )}

                    {metaInsight && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl"
                            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles className="w-3 h-3" style={{ color: '#fbbf24' }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Meta Insight</span>
                            </div>
                            <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{metaInsight}</p>
                        </motion.div>
                    )}

                    {insights.map((ins, i) => {
                        const cfg = TYPE_COLORS[ins.type] || TYPE_COLORS.analogy;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-xl space-y-2"
                                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="w-3 h-3" style={{ color: cfg.color }} />
                                        <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{ins.from_project}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                                            style={{ background: `${cfg.color}20`, color: cfg.color }}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-[9px] font-bold" style={{ color: cfg.color }}>
                                            {Math.round(ins.strength * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <GitBranch className="w-3 h-3 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                                    <p className="text-[11px] leading-snug" style={{ color: 'var(--text-primary)' }}>{ins.connection}</p>
                                </div>
                                <p className="text-[10px] leading-snug pl-4" style={{ color: 'var(--text-muted)' }}>
                                    → {ins.why_it_matters}
                                </p>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
