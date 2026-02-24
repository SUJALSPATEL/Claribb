'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Telescope, Loader2, RefreshCw, ChevronRight, AlertCircle, X, TrendingUp } from 'lucide-react';

interface PredictedQuestion {
    question: string;
    confidence: number;
    reason: string;
}

interface PredictedConclusion {
    conclusion: string;
    confidence: number;
    timeline: string;
}

interface PredictedRoadblock {
    roadblock: string;
    severity: 'high' | 'medium' | 'low';
}

interface PredictionData {
    next_questions: PredictedQuestion[];
    likely_conclusions: PredictedConclusion[];
    predicted_roadblocks: PredictedRoadblock[];
    final_position_prediction: string;
    research_maturity: 'early' | 'developing' | 'maturing' | 'near-complete';
    estimated_sessions_to_completion: number;
    trajectory_type: 'converging' | 'diverging' | 'stuck' | 'accelerating';
    sessionCount: number;
    message?: string;
}

interface Props {
    projectId: string;
    onClose: () => void;
}

const MATURITY = {
    'early': { color: '#fbbf24', label: 'Early Stage', pct: 15 },
    'developing': { color: '#67e8f9', label: 'Developing', pct: 40 },
    'maturing': { color: '#a5b4fc', label: 'Maturing', pct: 70 },
    'near-complete': { color: '#6ee7b7', label: 'Near Complete', pct: 90 },
};

const TRAJECTORY = {
    'converging': { color: '#6ee7b7', label: '📍 Converging toward conclusion' },
    'diverging': { color: '#fbbf24', label: '🌐 Expanding into new territory' },
    'stuck': { color: '#f87171', label: '🔄 Circular — needs new angle' },
    'accelerating': { color: '#a5b4fc', label: '⚡ Accelerating rapidly' },
};

const SEVERITY_COLOR = { high: '#f87171', medium: '#fbbf24', low: '#6ee7b7' };

export default function TrajectoryPanel({ projectId, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PredictionData | null>(null);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/predict?projectId=${projectId}`);
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
                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}>
                        <Telescope className="w-3.5 h-3.5" style={{ color: '#c084fc' }} />
                    </div>
                    <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Research Trajectory</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Where your research is heading</div>
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
                        <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: '#c084fc' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Predicting your research path...</p>
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
                            {data.message && (
                                <div className="text-center py-6">
                                    <Telescope className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.message}</p>
                                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Start researching and CLARIBB will predict your trajectory.</p>
                                </div>
                            )}

                            {!data.message && (
                                <>
                                    {/* Maturity + Trajectory */}
                                    <div className="p-3 rounded-xl space-y-3"
                                        style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Research Maturity</span>
                                                <span className="text-[11px] font-bold" style={{ color: MATURITY[data.research_maturity]?.color }}>
                                                    {MATURITY[data.research_maturity]?.label}
                                                </span>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${MATURITY[data.research_maturity]?.pct ?? 20}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className="h-full rounded-full"
                                                    style={{ background: `linear-gradient(90deg, #a855f7, ${MATURITY[data.research_maturity]?.color})` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-medium" style={{ color: TRAJECTORY[data.trajectory_type]?.color }}>
                                            {TRAJECTORY[data.trajectory_type]?.label}
                                        </div>
                                        {data.estimated_sessions_to_completion > 0 && (
                                            <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                <TrendingUp className="w-3 h-3" />
                                                ~{data.estimated_sessions_to_completion} more sessions to completion
                                            </div>
                                        )}
                                    </div>

                                    {/* Predicted Next Questions */}
                                    {data.next_questions?.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                🔮 CLARIBB Predicts You'll Ask
                                            </div>
                                            {data.next_questions.map((q, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.08 }}
                                                    className="p-2.5 rounded-xl"
                                                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                                            style={{ background: 'rgba(165,180,252,0.1)', color: '#a5b4fc' }}>
                                                            #{i + 1}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="text-[11px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                                                                "{q.question}"
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                                    <div className="h-full rounded-full" style={{ width: `${q.confidence * 100}%`, background: '#a5b4fc' }} />
                                                                </div>
                                                                <span className="text-[9px] shrink-0 font-bold" style={{ color: '#a5b4fc' }}>
                                                                    {Math.round(q.confidence * 100)}%
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{q.reason}</p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Likely Conclusions */}
                                    {data.likely_conclusions?.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                📍 Predicted Conclusions
                                            </div>
                                            {data.likely_conclusions.map((c, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.08 + 0.3 }}
                                                    className="p-2.5 rounded-xl flex items-start gap-2"
                                                    style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}
                                                >
                                                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#6ee7b7' }} />
                                                    <div>
                                                        <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{c.conclusion}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{c.timeline}</span>
                                                            <span className="text-[9px] font-bold" style={{ color: '#6ee7b7' }}>{Math.round(c.confidence * 100)}% likely</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Predicted Roadblocks */}
                                    {data.predicted_roadblocks?.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                ⚠️ Incoming Roadblocks
                                            </div>
                                            {data.predicted_roadblocks.map((r, i) => (
                                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg text-[10px]"
                                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                                                        style={{ background: SEVERITY_COLOR[r.severity] }} />
                                                    <span style={{ color: 'var(--text-secondary)' }}>{r.roadblock}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Final Position */}
                                    {data.final_position_prediction && (
                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c084fc' }}>
                                                🎯 Where You'll Land
                                            </div>
                                            <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                                                {data.final_position_prediction}
                                            </p>
                                        </div>
                                    )}

                                    <p className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
                                        Predictions stored — CLARIBB will verify accuracy later
                                    </p>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
