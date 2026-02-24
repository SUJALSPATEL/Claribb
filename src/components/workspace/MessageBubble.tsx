'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Zap, Network, Shield, Database, Globe, CheckCircle } from 'lucide-react';
import type { ChatMessage, MemoryChunk } from '@/types';

interface Props {
    message: ChatMessage;
}

// Simple markdown renderer
function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-light)">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="font-family:monospace;background:var(--bg-elevated);padding:0.1em 0.3em;border-radius:4px;color:var(--cyan);font-size:0.85em">$1</code>')
        .replace(/^### (.+)$/gm, '<h3 style="font-size:0.95rem;font-weight:600;color:var(--text-primary);margin:1rem 0 0.4rem">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="font-size:1.05rem;font-weight:700;color:var(--text-primary);margin:1.2rem 0 0.5rem">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="font-size:1.15rem;font-weight:800;color:var(--text-primary);margin:1.5rem 0 0.6rem">$1</h1>')
        .replace(/^- (.+)$/gm, '<li style="margin:0.2rem 0 0.2rem 1.2rem;list-style:disc">$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li style="margin:0.2rem 0 0.2rem 1.2rem;list-style:decimal">$1</li>')
        .replace(/\[Memory (\d+)\]/g, '<span style="font-size:0.75rem;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:var(--accent-light);padding:0.05em 0.4em;border-radius:4px;font-weight:600">[M$1]</span>')
        .replace(/\n\n/g, '</p><p style="margin-bottom:0.6rem">')
        .replace(/\n/g, '<br/>');
}

export default function MessageBubble({ message }: Props) {
    const [showMemories, setShowMemories] = useState(false);
    const [showAgents, setShowAgents] = useState(false);

    const isUser = message.role === 'user';
    const memCount = message.memories?.length || 0;
    const hasAgentData = !!message.agentOutputs;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}
        >
            {!isUser && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1" style={{
                    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                    boxShadow: '0 0 14px rgba(99,102,241,0.4)',
                }}>
                    <Brain className="w-4 h-4 text-white" />
                </div>
            )}

            <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                {/* Main bubble */}
                <div
                    className="px-5 py-4 rounded-2xl text-sm leading-relaxed"
                    style={isUser ? {
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.15))',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: 'var(--text-primary)',
                        borderBottomRightRadius: 4,
                    } : {
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderBottomLeftRadius: 4,
                    }}
                >
                    {isUser ? (
                        <p>{message.content}</p>
                    ) : (
                        <>
                            {message.content ? (
                                <div
                                    className="prose-sage"
                                    dangerouslySetInnerHTML={{
                                        __html: `<p style="margin-bottom:0.6rem">${renderMarkdown(message.content)}</p>`
                                    }}
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: 'var(--accent)' }}
                                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                                transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>CLARIBB is thinking...</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Agent metadata (for assistant messages) */}
                {!isUser && hasAgentData && !message.isStreaming && (
                    <div className="flex flex-col gap-1.5 w-full">
                        {/* Quick stats row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {memCount > 0 && (
                                <button
                                    onClick={() => setShowMemories(!showMemories)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all hover:scale-105"
                                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--accent-light)' }}
                                >
                                    <Database className="w-3 h-3" />
                                    {memCount} memories retrieved
                                    {showMemories ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                            )}

                            {message.agentOutputs?.explorer?.triggered && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}>
                                    <Globe className="w-3 h-3" />
                                    Web search used
                                </span>
                            )}

                            {message.agentOutputs?.connector?.connections && message.agentOutputs.connector.connections.length > 0 && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                                    <Network className="w-3 h-3" />
                                    {message.agentOutputs.connector.connections.length} connection{message.agentOutputs.connector.connections.length !== 1 ? 's' : ''} found
                                </span>
                            )}

                            {message.agentOutputs?.critique?.counterarguments && message.agentOutputs.critique.counterarguments.length > 0 && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                    <Shield className="w-3 h-3" />
                                    Critique: {message.agentOutputs.critique.counterarguments.length} points
                                </span>
                            )}
                        </div>

                        {/* Memory pills */}
                        <AnimatePresence>
                            {showMemories && message.memories && message.memories.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-1.5 pt-1"
                                >
                                    {message.memories.slice(0, 4).map((mem, i) => (
                                        <div key={mem.id} className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                            <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', fontSize: 10 }}>
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-medium mb-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{mem.source_label}</div>
                                                <div className="line-clamp-2" style={{ color: 'var(--text-muted)' }}>{mem.content.slice(0, 120)}...</div>
                                            </div>
                                            {mem.similarity && (
                                                <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--accent-light)' }}>
                                                    {(mem.similarity * 100).toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <span className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
}
