'use client';

import { motion } from 'framer-motion';
import { Sparkles, X, Link2, AlertCircle } from 'lucide-react';
import type { ResearchDigest } from '@/types';

interface Props {
    digest: ResearchDigest;
    onDismiss: () => void;
}

export default function DigestCard({ digest, onDismiss }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-2xl relative"
            style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.06) 100%)',
                border: '1px solid rgba(99,102,241,0.25)',
            }}
        >
            <button
                onClick={onDismiss}
                className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
            >
                <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-light)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--accent-light)' }}>
                    🌙 While You Were Away — CLARIBB Research Update
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {digest.connections_found?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Link2 className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                            <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>New Connections Found</span>
                        </div>
                        {digest.connections_found.slice(0, 2).map((c, i) => (
                            <p key={i} className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--text-primary)' }}>&quot;{c.concept_a}&quot;</span> connects to{' '}
                                <span style={{ color: 'var(--text-primary)' }}>&quot;{c.concept_b}&quot;</span>: {c.description}
                            </p>
                        ))}
                    </div>
                )}

                {digest.gaps_detected?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                            <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>Research Gaps Detected</span>
                        </div>
                        {digest.gaps_detected.slice(0, 3).map((g, i) => (
                            <p key={i} className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                • {g}
                            </p>
                        ))}
                    </div>
                )}

                {digest.open_questions?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs" style={{ color: '#10b981' }}>❓</span>
                            <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Open Research Questions</span>
                        </div>
                        {digest.open_questions.slice(0, 3).map((q, i) => (
                            <p key={i} className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {i + 1}. {q}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
