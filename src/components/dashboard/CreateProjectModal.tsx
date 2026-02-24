'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Brain } from 'lucide-react';
import type { Project } from '@/types';

const ICONS = ['🔬', '📚', '💡', '🧠', '📊', '🌍', '⚡', '🎯', '🔭', '🧬', '💻', '🌱'];
const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#ef4444', '#f97316'];

interface Props {
    onClose: () => void;
    onCreated: (project: Project) => void;
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('🔬');
    const [selectedColor, setSelectedColor] = useState('#6366f1');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), description: description.trim(), icon: selectedIcon, color: selectedColor }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onCreated(data.project);
        } catch (err: unknown) {
            // ── local-first fallback for demo ──
            // If API fails (no Supabase / missing table), create a local project
            // so the demo always works.
            const localProject = {
                id: crypto.randomUUID(),
                name: name.trim(),
                description: description.trim(),
                icon: selectedIcon,
                color: selectedColor,
                user_id: 'local',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                memory_count: 0,
                session_count: 0,
                concept_count: 0,
                depth_score: 0,
            };
            // Persist locally so workspace page can load it
            try {
                const existing = JSON.parse(localStorage.getItem('claribb_local_projects') || '[]');
                localStorage.setItem('claribb_local_projects', JSON.stringify([localProject, ...existing]));
            } catch { /* storage quota */ }
            onCreated(localProject as Parameters<typeof onCreated>[0]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg p-8 rounded-3xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${selectedColor}20` }}>
                            <span className="text-xl">{selectedIcon}</span>
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>New Research Project</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:scale-110" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Project Name *</label>
                        <input
                            type="text"
                            placeholder="e.g. AI Regulation Research"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
                        <textarea
                            placeholder="What are you researching? (optional)"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Icon</label>
                        <div className="flex gap-2 flex-wrap">
                            {ICONS.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => setSelectedIcon(icon)}
                                    className="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all hover:scale-110"
                                    style={{
                                        background: selectedIcon === icon ? `${selectedColor}30` : 'var(--bg-elevated)',
                                        border: `2px solid ${selectedIcon === icon ? selectedColor : 'transparent'}`,
                                    }}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Color</label>
                        <div className="flex gap-2">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className="w-8 h-8 rounded-full transition-all hover:scale-110"
                                    style={{
                                        background: color,
                                        boxShadow: selectedColor === color ? `0 0 0 3px ${color}40, 0 0 0 2px var(--bg-card)` : 'none',
                                        transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || loading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${selectedColor}, ${selectedColor}cc)`, boxShadow: `0 0 20px ${selectedColor}40` }}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            Create Project
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
