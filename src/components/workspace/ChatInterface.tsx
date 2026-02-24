'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Loader2, Brain, Square, RotateCcw, Shield,
    ChevronDown, ChevronUp
} from 'lucide-react';
import type { ChatMessage, AgentOutputs, MemoryChunk, Session } from '@/types';
import MessageBubble from './MessageBubble';
import AgentStatusBar from './AgentStatusBar';

interface Props {
    projectId: string;
    sessionId?: string;
    lastSession?: Session | null;
    onSessionEnd: (messages: ChatMessage[]) => void;
    onMessagesUpdate: (messages: ChatMessage[]) => void;
}

export default function ChatInterface({ projectId, sessionId, lastSession, onSessionEnd, onMessagesUpdate }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [critiqueMode, setCritiqueMode] = useState(false);
    const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'done'>('idle');
    const [currentAgentOutputs, setCurrentAgentOutputs] = useState<AgentOutputs | null>(null);
    const [currentMemories, setCurrentMemories] = useState<MemoryChunk[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        onMessagesUpdate(messages);
    }, [messages, onMessagesUpdate]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || loading) return;
        const userMessage = input.trim();
        setInput('');

        // Add user message
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setStreaming(false);
        setAgentStatus('running');
        setCurrentAgentOutputs(null);
        setCurrentMemories([]);

        // Prepare assistant placeholder
        const assistantId = crypto.randomUUID();
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
        };
        setMessages(prev => [...prev, assistantMsg]);

        try {
            abortRef.current = new AbortController();

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    projectId,
                    sessionId,
                    sessionHistory: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
                    sessionSummary: lastSession?.summary,
                    openQuestions: lastSession?.open_questions,
                    critiqueMode,
                }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) throw new Error('Chat request failed');

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            let agentOutputs: AgentOutputs | null = null;
            let memoriesUsed: MemoryChunk[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'metadata') {
                            agentOutputs = data.agentOutputs;
                            memoriesUsed = data.memoriesUsed || [];
                            setCurrentAgentOutputs(data.agentOutputs);
                            setCurrentMemories(memoriesUsed);
                            setAgentStatus('done');
                            setStreaming(true);
                        } else if (data.type === 'token') {
                            fullContent += data.content;
                            setMessages(prev => prev.map(msg =>
                                msg.id === assistantId ? { ...msg, content: fullContent } : msg
                            ));
                        } else if (data.type === 'done') {
                            setMessages(prev => prev.map(msg =>
                                msg.id === assistantId
                                    ? { ...msg, content: fullContent, isStreaming: false, memories: memoriesUsed, agentOutputs: agentOutputs || undefined }
                                    : msg
                            ));
                            setStreaming(false);
                        }
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setMessages(prev => prev.map(msg =>
                msg.id === assistantId
                    ? { ...msg, content: 'Something went wrong. Please try again.', isStreaming: false }
                    : msg
            ));
        } finally {
            setLoading(false);
            setAgentStatus('idle');
        }
    }, [input, loading, messages, projectId, sessionId, lastSession, critiqueMode]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
        setLoading(false);
        setStreaming(false);
        setAgentStatus('idle');
    };

    const handleEndSession = () => {
        onSessionEnd(messages);
    };

    const suggestedQuestions = lastSession?.open_questions?.slice(0, 3) || [
        'What are the most important aspects of this topic?',
        'What are the key counterarguments to consider?',
        'What connections exist between these concepts?',
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Empty state */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-8"
                        >
                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.1))',
                                border: '1px solid rgba(99,102,241,0.3)',
                                boxShadow: '0 0 40px rgba(99,102,241,0.2)',
                            }}>
                                <Brain className="w-10 h-10" style={{ color: 'var(--accent-light)' }} />
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                                CLARIBB is listening
                            </h3>
                            <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                                Ask anything about your research. CLARIBB will retrieve your memories,
                                search for gaps, and challenge your assumptions — in parallel.
                            </p>
                        </motion.div>

                        {/* Suggested questions */}
                        <div className="w-full max-w-lg space-y-2">
                            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                {lastSession ? '❓ Open questions from your last session:' : '💡 Try asking:'}
                            </p>
                            {suggestedQuestions.map((q, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    onClick={() => setInput(q)}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all hover:scale-[1.01]"
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {q}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <AnimatePresence>
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>

            {/* Agent Status Bar */}
            <AnimatePresence>
                {agentStatus === 'running' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="px-6 py-3 shrink-0"
                        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
                    >
                        <AgentStatusBar status={agentStatus} outputs={currentAgentOutputs} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input area */}
            <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {/* Controls row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCritiqueMode(!critiqueMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                                background: critiqueMode ? 'rgba(245,158,11,0.15)' : 'var(--bg-card)',
                                border: `1px solid ${critiqueMode ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                                color: critiqueMode ? '#f59e0b' : 'var(--text-muted)',
                            }}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Critique Mode {critiqueMode ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {messages.length >= 4 && (
                        <button
                            onClick={handleEndSession}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
                        >
                            <RotateCcw className="w-3 h-3" />
                            End & Summarize Session
                        </button>
                    )}
                </div>

                {/* Textarea + Send — unified bar with pink tint */}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask CLARIBB anything about your research..."
                        disabled={loading}
                        rows={1}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid rgba(232,62,140,0.28)',
                            boxShadow: '0 0 0 0px rgba(232,62,140,0)',
                            color: 'var(--text-primary)',
                            minHeight: '48px',
                            maxHeight: '160px',
                            paddingRight: '3rem',
                            outline: 'none',
                        }}
                        onFocus={e => { e.target.style.border = '1px solid rgba(232,62,140,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,62,140,0.08)'; }}
                        onBlur={e => { e.target.style.border = '1px solid rgba(232,62,140,0.28)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {/* Inline send / stop icon */}
                    <div className="absolute right-3 bottom-3">
                        {loading ? (
                            <button onClick={handleStop}
                                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
                                style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e' }}>
                                <Square className="w-3 h-3" />
                            </button>
                        ) : (
                            <button onClick={handleSend} disabled={!input.trim()}
                                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 disabled:opacity-30"
                                style={{
                                    background: input.trim() ? 'rgba(232,62,140,0.15)' : 'transparent',
                                    border: `1px solid ${input.trim() ? 'rgba(232,62,140,0.35)' : 'transparent'}`,
                                    color: input.trim() ? '#E83E8C' : 'rgba(255,255,255,0.2)',
                                }}>
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    Enter to send · Shift+Enter for new line · CLARIBB retrieves from {' '}
                    <span style={{ color: 'var(--accent-light)' }}>your memory graph</span>
                </p>
            </div>
        </div>
    );
}
