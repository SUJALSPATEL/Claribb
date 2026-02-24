'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Globe, Plus, Loader2, CheckCircle, X, Link } from 'lucide-react';

interface Props {
    projectId: string;
}

type MemoryType = 'text' | 'url';

export default function MemoryFeed({ projectId }: Props) {
    const [type, setType] = useState<MemoryType>('text');
    const [content, setContent] = useState('');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<{ label: string; chunks: number } | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (type === 'text' && !content.trim()) return;
        if (type === 'url' && !url.trim()) return;

        setLoading(true);
        setError('');
        setSuccess(null);

        try {
            const body = type === 'text'
                ? { type: 'text', content: content.trim(), projectId }
                : { type: 'url', url: url.trim(), projectId };

            const res = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add memory');

            setSuccess({ label: data.label, chunks: data.chunksStored });
            setContent('');
            setUrl('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Add to Memory Graph</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Feed your research into CLARIBB. Paste notes, articles, papers, or URLs — they&apos;ll be chunked, embedded, and made available in your research conversations.
                </p>
            </div>

            {/* Type toggle */}
            <div className="flex p-1 rounded-xl mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {([
                    { id: 'text', label: 'Text / Notes', icon: FileText },
                    { id: 'url', label: 'URL / Article', icon: Globe },
                ] as const).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => { setType(id); setError(''); setSuccess(null); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                            background: type === id ? 'var(--accent)' : 'transparent',
                            color: type === id ? 'white' : 'var(--text-secondary)',
                        }}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {type === 'text' ? (
                    <motion.div key="text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Research Notes
                            </label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Paste your notes, article text, research summaries, paper excerpts...

CLARIBB will automatically:
• Chunk it into semantic segments
• Embed each chunk for retrieval
• Extract key concepts for your knowledge graph
• Make it searchable in future sessions"
                                rows={12}
                                className="w-full px-5 py-4 rounded-2xl text-sm leading-relaxed resize-none"
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-strong)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {content.length > 0 ? `~${Math.ceil(content.split(' ').length / 100)} chunks estimated` : 'Min. 20 characters'}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{content.length} chars</span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="url" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Article or Web Page URL</label>
                            <div className="relative">
                                <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    placeholder="https://example.com/research-paper"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-strong)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                CLARIBB will extract the text content, chunk it, and add it to your memory graph.
                            </p>
                        </div>

                        {/* Tips */}
                        <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Works best with:</p>
                            <div className="space-y-1">
                                {['Academic papers & preprints', 'News articles & blog posts', 'Wikipedia pages', 'Research reports & whitepapers'].map(tip => (
                                    <p key={tip} className="text-xs" style={{ color: 'var(--text-muted)' }}>✓ {tip}</p>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error / Success */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-4 rounded-xl mb-4"
                        style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e' }}
                    >
                        <X className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{error}</span>
                    </motion.div>
                )}
                {success && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="flex items-start gap-3 p-4 rounded-xl mb-4"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
                    >
                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                        <div>
                            <p className="text-sm font-medium" style={{ color: '#10b981' }}>Added to memory graph!</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                &quot;{success.label}&quot; → {success.chunks} chunk{success.chunks !== 1 ? 's' : ''} embedded
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={handleSubmit}
                disabled={loading || (type === 'text' ? !content.trim() : !url.trim())}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 0 25px rgba(99,102,241,0.35)',
                }}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {loading ? 'Processing & Embedding...' : 'Add to Memory Graph'}
            </button>
        </div>
    );
}
