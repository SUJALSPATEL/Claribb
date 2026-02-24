'use client';

import { motion } from 'framer-motion';
import { BookOpen, X, HelpCircle, CheckCircle } from 'lucide-react';
import type { Session } from '@/types';

interface Props {
    session: Session;
    onDismiss: () => void;
}

export default function SessionSummaryCard({ session, onDismiss }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-6 py-3 flex items-start gap-4"
            style={{ background: 'rgba(99,102,241,0.05)' }}
        >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
            }}>
                <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent-light)' }} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent-light)' }}>
                        Last Session: {session.title}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        · {session.summary ? session.summary.slice(0, 80) + '...' : 'Summary available'}
                    </span>
                </div>

                {session.open_questions && session.open_questions.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Open questions:</span>
                        {session.open_questions.slice(0, 2).map((q, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                color: '#f59e0b',
                            }}>
                                <HelpCircle className="w-2.5 h-2.5" />
                                {q.length > 50 ? q.slice(0, 50) + '...' : q}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={onDismiss}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all hover:scale-110"
                style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}
