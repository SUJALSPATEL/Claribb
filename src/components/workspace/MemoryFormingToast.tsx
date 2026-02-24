'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, GitBranch, CheckCircle2, Brain } from 'lucide-react';

export interface MemoryFormingEvent {
    chunksStored: number;
    conceptsAdded: number;
    conflictsFound: number;
    memoriesUsed: number;
    confidence: number;
}

interface Props {
    event: MemoryFormingEvent | null;
}

export default function MemoryFormingToast({ event }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!event) return;
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 4500);
        return () => clearTimeout(t);
    }, [event]);

    return (
        <AnimatePresence>
            {visible && event && (
                <motion.div
                    initial={{ opacity: 0, x: 60, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 60, scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 p-4 rounded-2xl min-w-[220px]"
                    style={{
                        background: 'rgba(10, 10, 20, 0.92)',
                        border: '1px solid rgba(99,102,241,0.35)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(99,102,241,0.25), 0 0 0 1px rgba(99,102,241,0.1)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 0.6, repeat: 2 }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                        >
                            <Brain className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                        <span className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>CLARIBB is learning</span>
                        <motion.div
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: 3 }}
                            className="ml-auto w-1.5 h-1.5 rounded-full"
                            style={{ background: '#6ee7b7' }}
                        />
                    </div>

                    {/* Stats */}
                    <div className="space-y-1.5">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2 text-[11px]"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <Database className="w-3 h-3 shrink-0" style={{ color: '#a5b4fc' }} />
                            <span>
                                <span className="font-semibold" style={{ color: '#a5b4fc' }}>{event.chunksStored} chunks</span> embedded into memory
                            </span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-2 text-[11px]"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <GitBranch className="w-3 h-3 shrink-0" style={{ color: '#6ee7b7' }} />
                            <span>
                                Knowledge graph <span className="font-semibold" style={{ color: '#6ee7b7' }}>updated</span>
                            </span>
                        </motion.div>

                        {event.memoriesUsed > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-2 text-[11px]"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: '#67e8f9' }} />
                                <span>
                                    <span className="font-semibold" style={{ color: '#67e8f9' }}>{event.memoriesUsed} memories</span> recalled · {Math.round(event.confidence * 100)}% match
                                </span>
                            </motion.div>
                        )}

                        {event.conflictsFound > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-2 text-[11px]"
                                style={{ color: '#fca5a5' }}
                            >
                                <span className="text-base leading-none">⚠️</span>
                                <span><span className="font-semibold">{event.conflictsFound}</span> conflict{event.conflictsFound > 1 ? 's' : ''} detected in memory</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-0.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #6366f1, #06b6d4)' }}
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 4.5, ease: 'linear' }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
