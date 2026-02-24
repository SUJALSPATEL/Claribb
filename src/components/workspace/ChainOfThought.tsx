'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Brain, Zap, Globe, AlertTriangle, Network, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export interface ThinkingStep {
    id: string;
    step: string;
    message: string;
    detail?: string;
    ts: number;
}

interface Props {
    steps: ThinkingStep[];
    isThinking: boolean;
}

const STEP_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    start: { icon: Sparkles, color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)' },
    embedding: { icon: Brain, color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)' },
    recall: { icon: Brain, color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)' },
    parallel: { icon: Zap, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    explorer: { icon: Globe, color: '#67e8f9', bg: 'rgba(6,182,212,0.1)' },
    critique: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    connector: { icon: Network, color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)' },
    conflict: { icon: AlertTriangle, color: '#fca5a5', bg: 'rgba(239,68,68,0.1)' },
    synthesize: { icon: CheckCircle2, color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)' },
};

export default function ChainOfThought({ steps, isThinking }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [steps]);

    if (steps.length === 0 && !isThinking) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-2xl overflow-hidden"
            style={{
                background: 'rgba(6, 6, 20, 0.8)',
                border: '1px solid rgba(99,102,241,0.2)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.06)' }}
            >
                <motion.div
                    animate={isThinking ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                >
                    <Brain className="w-3 h-3 text-white" />
                </motion.div>
                <span className="text-[11px] font-semibold" style={{ color: '#a5b4fc' }}>
                    CLARIBB Chain of Thought
                </span>
                {isThinking && (
                    <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="ml-auto text-[10px] flex items-center gap-1"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        thinking...
                    </motion.div>
                )}
            </div>

            {/* Steps */}
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
                <AnimatePresence initial={false}>
                    {steps.map((step, i) => {
                        const cfg = STEP_CONFIG[step.step] ?? STEP_CONFIG.start;
                        const Icon = cfg.icon;
                        const isLast = i === steps.length - 1;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -12, scale: 0.97 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                className="flex items-start gap-2.5"
                            >
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center shrink-0 pt-0.5">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-5 h-5 rounded-md flex items-center justify-center"
                                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                                    >
                                        <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                                    </motion.div>
                                    {!isLast && (
                                        <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)', minHeight: 6 }} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pb-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[11px] font-medium" style={{ color: isLast ? cfg.color : 'var(--text-secondary)' }}>
                                            {step.message}
                                        </span>
                                        <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                                            {step.ts ? `+${((step.ts - steps[0].ts) / 1000).toFixed(1)}s` : ''}
                                        </span>
                                    </div>
                                    {step.detail && (
                                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {step.detail}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {isThinking && (
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex items-center gap-2 pl-7"
                    >
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className="w-1 h-1 rounded-full"
                                    style={{ background: '#6366f1' }}
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
                <div ref={endRef} />
            </div>
        </motion.div>
    );
}
