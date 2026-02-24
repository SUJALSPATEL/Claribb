'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, AlertTriangle, Target, HelpCircle, BookOpen, Sword, X } from 'lucide-react';

interface SteelmanResult {
    steelman: string;
    strongest_point: string;
    required_evidence: string;
    confidence_dent: number;
    intellectual_tradition: string;
    concede_points: string[];
    pivot_question: string;
}

interface Props {
    projectId: string;
    onClose: () => void;
}

export default function SteelManPanel({ projectId, onClose }: Props) {
    const [position, setPosition] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SteelmanResult | null>(null);
    const [memoriesUsed, setMemoriesUsed] = useState(0);
    const [error, setError] = useState('');

    const run = async () => {
        if (!position.trim() || loading) return;
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const res = await fetch('/api/steelman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, position }),
            });
            const data = await res.json();
            if (data.steelman) {
                setResult(data.steelman);
                setMemoriesUsed(data.memoriesAnalyzed || 0);
            } else {
                setError(data.error || 'Failed to generate steelman');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex flex-col h-full"
            style={{ background: 'var(--bg-secondary)', width: '100%' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <Sword className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                    </div>
                    <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Steel Manning</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Strongest counterargument to your position</div>
                    </div>
                </div>
                <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Input */}
                {!result && (
                    <div className="space-y-3">
                        <label className="text-xs font-medium block" style={{ color: 'var(--text-secondary)' }}>
                            State your research position or conclusion
                        </label>
                        <textarea
                            value={position}
                            onChange={e => setPosition(e.target.value)}
                            placeholder='e.g. "AI regulation will stifle innovation and should be minimal" or "Remote work increases productivity for knowledge workers"'
                            rows={4}
                            className="w-full text-xs p-3 rounded-xl resize-none outline-none"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                        {error && <p className="text-[10px]" style={{ color: '#f87171' }}>{error}</p>}
                        <button
                            onClick={run}
                            disabled={loading || !position.trim()}
                            className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.9))', color: 'white', boxShadow: '0 0 20px rgba(239,68,68,0.25)' }}
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Building strongest counterargument...</span>
                                : '⚔️ Steelman This Position'}
                        </button>
                    </div>
                )}

                {/* Result */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {/* Confidence Dent Warning */}
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>Threat Level</span>
                                    <span className="text-lg font-black" style={{ color: '#f87171' }}>-{result.confidence_dent}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${result.confidence_dent}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full rounded-full"
                                        style={{ background: 'linear-gradient(90deg, #f87171, #ef4444)' }}
                                    />
                                </div>
                                <div className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                    From {result.intellectual_tradition}
                                </div>
                            </div>

                            {/* Steelman */}
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <AlertTriangle className="w-3 h-3" style={{ color: '#f87171' }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>The Steel Argument</span>
                                </div>
                                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                    "{result.steelman}"
                                </p>
                            </div>

                            {/* Strongest Point */}
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Target className="w-3 h-3" style={{ color: '#fbbf24' }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Strongest Point</span>
                                </div>
                                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{result.strongest_point}</p>
                            </div>

                            {/* Pivot Question */}
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <HelpCircle className="w-3 h-3" style={{ color: '#a5b4fc' }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#a5b4fc' }}>You Must Answer</span>
                                </div>
                                <p className="text-[11px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>"{result.pivot_question}"</p>
                            </div>

                            {/* Required Evidence */}
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <BookOpen className="w-3 h-3" style={{ color: '#6ee7b7' }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6ee7b7' }}>Research Needed to Rebut</span>
                                </div>
                                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{result.required_evidence}</p>
                            </div>

                            {/* Concessions */}
                            {result.concede_points?.length > 0 && (
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Shield className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>What They Concede</span>
                                    </div>
                                    <div className="space-y-1">
                                        {result.concede_points.map((p, i) => (
                                            <div key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                                <span className="shrink-0 mt-0.5">✓</span>
                                                <span>{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
                                Built from {memoriesUsed} research memories
                            </div>

                            <button
                                onClick={() => { setResult(null); setPosition(''); }}
                                className="w-full py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
                                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            >
                                Steel-man a new position
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
