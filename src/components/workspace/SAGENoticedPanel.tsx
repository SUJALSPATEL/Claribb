'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, GitBranch, Lightbulb, Sparkles } from 'lucide-react';

export interface ClariBBNotice {
    id: string;
    type: 'growing' | 'conflict' | 'connection' | 'insight' | 'milestone';
    text: string;
    timestamp: Date;
    color: string;
}

interface Props {
    notices: ClariBBNotice[];
    memoryCount: number;
    sessionCount: number;
    depthScore: number;
}

const TYPE_CONFIG = {
    growing: { icon: TrendingUp, color: '#6ee7b7', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Growing' },
    conflict: { icon: AlertTriangle, color: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Conflict' },
    connection: { icon: GitBranch, color: '#67e8f9', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', label: 'Connected' },
    insight: { icon: Lightbulb, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', label: 'Insight' },
    milestone: { icon: Sparkles, color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', label: 'Milestone' },
};

export default function ClariBBNoticedPanel({ notices, memoryCount, sessionCount, depthScore }: Props) {
    const displayNotices = notices.slice(-8).reverse();

    return (
        <div
            className="flex flex-col h-full shrink-0"
            style={{ width: '100%', background: 'var(--bg-secondary)' }}
        >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}
                    >
                        <Brain className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                    <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Claribb.AI Noticed</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Live intelligence feed</div>
                    </div>
                    <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: '#6ee7b7' }}
                    />
                </div>

                {/* Depth Score */}
                <div
                    className="p-3 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Research Depth</span>
                        <motion.span
                            key={depthScore}
                            initial={{ scale: 1.3, color: '#a5b4fc' }}
                            animate={{ scale: 1, color: '#a5b4fc' }}
                            transition={{ duration: 0.4 }}
                            className="text-lg font-black"
                            style={{ color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}
                        >
                            {depthScore}
                        </motion.span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #6366f1, #06b6d4, #6ee7b7)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${depthScore}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{memoryCount} memories</span>
                        <span>{sessionCount} sessions</span>
                    </div>
                </div>
            </div>

            {/* Notices Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {displayNotices.length === 0 ? (
                    <div className="text-center py-8">
                        <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            Claribb.AI will surface insights as you research...
                        </p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {displayNotices.map((notice) => {
                            const cfg = TYPE_CONFIG[notice.type];
                            const Icon = cfg.icon;
                            return (
                                <motion.div
                                    key={notice.id}
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    className="p-2.5 rounded-xl"
                                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                                >
                                    <div className="flex items-start gap-2">
                                        <div
                                            className="shrink-0 w-5 h-5 rounded-lg flex items-center justify-center mt-0.5"
                                            style={{ background: `${cfg.color}20` }}
                                        >
                                            <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: cfg.color }}>
                                                {cfg.label}
                                            </div>
                                            <p className="text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                                                {notice.text}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer hint */}
            <div className="p-3 border-t text-[9px] text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Updates after every response
            </div>
        </div>
    );
}
