'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Loader2, ArrowRight, RefreshCw, GitCommit, Zap, X, AlertCircle } from 'lucide-react';

interface EvolutionStep {
    session_num: number;
    date: string;
    position: string;
    trigger: string | null;
    confidence: number;
    shift_type: 'reinforced' | 'questioned' | 'reversed' | 'refined' | 'expanded';
}

interface EvolutionData {
    initial_position: string;
    current_position: string;
    certainty_trend: 'increasing' | 'decreasing' | 'oscillating' | 'stable';
    evolution_steps: EvolutionStep[];
    total_shifts: number;
    biggest_shift: string;
    unresolved_tension: string;
    convergence_prediction: string;
    sessionCount: number;
    message?: string;
}

interface Props {
    projectId: string;
    onClose: () => void;
}

const SHIFT_CONFIG = {
    reinforced: { color: '#6ee7b7', label: 'Reinforced', icon: '✓' },
    questioned: { color: '#fbbf24', label: 'Questioned', icon: '?' },
    reversed: { color: '#f87171', label: 'Reversed', icon: '↺' },
    refined: { color: '#67e8f9', label: 'Refined', icon: '→' },
    expanded: { color: '#a5b4fc', label: 'Expanded', icon: '↗' },
};

const TREND_CONFIG = {
    increasing: { color: '#6ee7b7', label: 'Confidence Growing' },
    decreasing: { color: '#f87171', label: 'Confidence Declining' },
    oscillating: { color: '#fbbf24', label: 'Still Oscillating' },
    stable: { color: '#67e8f9', label: 'Position Stable' },
};

export default function BeliefEvolutionPanel({ projectId, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EvolutionData | null>(null);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/evolution?projectId=${projectId}`);
            const d = await res.json();
            if (d.error) { setError(d.error); return; }
            setData(d);
        } catch {
            setError('Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [projectId]);

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)', width: '100%' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: '#a5b4fc' }} />
                    </div>
                    <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Belief Evolution</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>How your thinking has changed over time</div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={load} style={{ color: 'var(--text-muted)' }} className="p-1 hover:text-white transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {loading && (
                    <div className="flex flex-col items-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: 'var(--accent)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Analyzing your research journey...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-8">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: '#f87171' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
                    </div>
                )}

                {!loading && data && (
                    <AnimatePresence>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            {/* Not enough data */}
                            {data.message && (
                                <div className="text-center py-6">
                                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.message}</p>
                                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Complete more research sessions and end them with "End & Summarize" to track evolution.
                                    </p>
                                </div>
                            )}

                            {!data.message && (
                                <>
                                    {/* Certainty Trend */}
                                    {data.certainty_trend && (
                                        <div className="p-3 rounded-xl flex items-center justify-between"
                                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Trend</span>
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: `${TREND_CONFIG[data.certainty_trend]?.color}15`,
                                                    color: TREND_CONFIG[data.certainty_trend]?.color,
                                                    border: `1px solid ${TREND_CONFIG[data.certainty_trend]?.color}30`,
                                                }}>
                                                {TREND_CONFIG[data.certainty_trend]?.label}
                                            </span>
                                        </div>
                                    )}

                                    {/* Position comparison */}
                                    <div className="p-3 rounded-xl space-y-2"
                                        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Initial Position</div>
                                            <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{data.initial_position}</p>
                                        </div>
                                        <div className="flex justify-center">
                                            <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#a5b4fc' }}>Current Position</div>
                                            <p className="text-[11px] leading-snug font-medium" style={{ color: 'var(--text-primary)' }}>{data.current_position}</p>
                                        </div>
                                    </div>

                                    {/* Evolution Timeline */}
                                    {data.evolution_steps?.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                                Journey — {data.total_shifts} shift{data.total_shifts !== 1 ? 's' : ''}
                                            </div>
                                            {data.evolution_steps.map((step, i) => {
                                                const cfg = SHIFT_CONFIG[step.shift_type] || SHIFT_CONFIG.refined;
                                                return (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.07 }}
                                                        className="flex items-start gap-2.5"
                                                    >
                                                        <div className="flex flex-col items-center shrink-0">
                                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                                style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`, color: cfg.color }}>
                                                                {cfg.icon}
                                                            </div>
                                                            {i < data.evolution_steps.length - 1 && (
                                                                <div className="w-px bg-white/5 mt-1" style={{ height: 16 }} />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 pb-2">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>
                                                                    {cfg.label}
                                                                </span>
                                                                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Session {step.session_num}</span>
                                                            </div>
                                                            <p className="text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                                                                {step.position}
                                                            </p>
                                                            {step.trigger && (
                                                                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                                    ↳ {step.trigger}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Unresolved Tension */}
                                    {data.unresolved_tension && (
                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Zap className="w-3 h-3" style={{ color: '#fbbf24' }} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Open Tension</span>
                                            </div>
                                            <p className="text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{data.unresolved_tension}</p>
                                        </div>
                                    )}

                                    {/* Convergence Prediction */}
                                    {data.convergence_prediction && (
                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <GitCommit className="w-3 h-3" style={{ color: '#6ee7b7' }} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6ee7b7' }}>Convergence</span>
                                            </div>
                                            <p className="text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{data.convergence_prediction}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
