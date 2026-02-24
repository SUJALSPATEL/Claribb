'use client';

import { motion } from 'framer-motion';
import { Brain, Zap, Network, Shield, CheckCircle, Loader2 } from 'lucide-react';
import type { AgentOutputs } from '@/types';

interface Props {
    status: 'idle' | 'running' | 'done';
    outputs?: AgentOutputs | null;
}

const AGENTS = [
    { id: 'recall', name: 'Recall', icon: Brain, color: '#6366f1', desc: 'Searching memory...' },
    { id: 'explorer', name: 'Explorer', icon: Zap, color: '#06b6d4', desc: 'Checking web...' },
    { id: 'critique', name: 'Critique', icon: Shield, color: '#f59e0b', desc: 'Analyzing gaps...' },
    { id: 'connector', name: 'Connector', icon: Network, color: '#10b981', desc: 'Finding links...' },
];

export default function AgentStatusBar({ status, outputs }: Props) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
                Agents running:
            </span>
            <div className="flex items-center gap-3">
                {AGENTS.map((agent, i) => {
                    const Icon = agent.icon;
                    const isDone = status === 'done';
                    const isActive = status === 'running';

                    return (
                        <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-1.5"
                        >
                            <div
                                className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                style={{
                                    background: isDone ? `${agent.color}20` : isActive ? `${agent.color}15` : 'var(--bg-elevated)',
                                    border: `1px solid ${isDone ? `${agent.color}40` : isActive ? `${agent.color}25` : 'var(--border)'}`,
                                }}
                            >
                                {isDone ? (
                                    <CheckCircle className="w-3 h-3" style={{ color: agent.color }} />
                                ) : isActive ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Loader2 className="w-3 h-3" style={{ color: agent.color }} />
                                    </motion.div>
                                ) : (
                                    <Icon className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                )}
                            </div>
                            <span className="text-xs font-medium" style={{ color: isDone ? agent.color : 'var(--text-muted)' }}>
                                {agent.name}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {outputs?.recall && (
                <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {outputs.recall.used_count} memories · {(outputs.recall.confidence * 100).toFixed(0)}% confidence
                </span>
            )}
        </div>
    );
}
