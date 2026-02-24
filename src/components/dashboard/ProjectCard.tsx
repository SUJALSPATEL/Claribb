'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Brain, MessageSquare, Layers } from 'lucide-react';
import type { Project } from '@/types';

interface Props {
    project: Project;
    onClick: () => void;
}

const PROJECT_ICONS: Record<string, string> = {
    '🔬': '🔬', '📚': '📚', '💡': '💡', '🧠': '🧠', '📊': '📊',
    '🌍': '🌍', '⚡': '⚡', '🎯': '🎯', '🔭': '🔭', '🧬': '🧬',
};

// Deterministic accent color per project
function accentHue(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    const hues = [338, 262, 199, 158, 38]; // pink, purple, cyan, emerald, amber
    return hues[Math.abs(h) % hues.length];
}

export default function ProjectCard({ project, onClick }: Props) {
    const hue = accentHue(project.name);
    const accent = `hsl(${hue}, 70%, 60%)`;
    const accentBg = `hsla(${hue}, 70%, 60%, 0.07)`;
    const accentBorder = `hsla(${hue}, 70%, 60%, 0.18)`;

    const stats = [
        { icon: Brain, value: project.memory_count || 0, label: 'Memories' },
        { icon: MessageSquare, value: project.session_count || 0, label: 'Sessions' },
        { icon: Layers, value: project.concept_count || 0, label: 'Concepts' },
    ];

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ y: -4, scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="cursor-pointer group"
            style={{
                background: 'linear-gradient(145deg, #111, #0d0d0d)',
                border: `1px solid ${accentBorder}`,
                borderRadius: 16,
                padding: '1.4rem 1.5rem',
                transition: 'border-color 0.25s, box-shadow 0.25s',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 0 0 0 ${accentBg}`,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = `hsla(${hue}, 70%, 60%, 0.4)`;
                e.currentTarget.style.boxShadow = `0 8px 32px hsla(${hue}, 70%, 30%, 0.18)`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = accentBorder;
                e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
            }}
        >
            {/* Subtle top accent line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                opacity: 0.5,
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 11,
                        background: accentBg,
                        border: `1px solid ${accentBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0,
                        boxShadow: `0 0 12px hsla(${hue}, 70%, 50%, 0.12)`,
                    }}>
                        {PROJECT_ICONS[project.icon] || '🔬'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h3 style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.92rem', margin: 0, lineHeight: 1.3 }}>
                            {project.name}
                        </h3>
                        <p style={{ color: '#4a4a4a', fontSize: '0.72rem', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                            {project.description || 'Research Project'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', marginBottom: '1.1rem' }} />

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {stats.map(({ icon: Icon, value, label }) => (
                    <div key={label} style={{
                        flex: 1, padding: '0.6rem 0', borderRadius: 10, textAlign: 'center',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <Icon size={11} style={{ color: accent, marginBottom: 4, display: 'block', margin: '0 auto 4px' }} />
                        <div style={{ color: '#e0e0e0', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1 }}>{value}</div>
                        <div style={{ color: '#3e3e3e', fontSize: '0.62rem', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#333', fontSize: '0.67rem' }}>
                    {new Date(project.updated_at || project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: '0.72rem', fontWeight: 600,
                    color: accent, opacity: 0.6,
                    transition: 'opacity 0.2s',
                }}
                    className="group-hover:opacity-100">
                    Open <ArrowUpRight size={11} />
                </div>
            </div>
        </motion.div>
    );
}
