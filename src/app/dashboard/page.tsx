'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Plus, Brain, Loader2, BookOpen, Database, Network,
    ChevronRight, Sparkles, X, Layers,
    Zap, Link2, AlertTriangle, HelpCircle, RefreshCw,
    CheckCircle2
} from 'lucide-react';
import type { Project, ResearchDigest } from '@/types';
import ProjectCard from '@/components/dashboard/ProjectCard';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';

function DashboardContent() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [digest, setDigest] = useState<ResearchDigest | null>(null);
    const [digestLoading, setDigestLoading] = useState(false);
    const [digestError, setDigestError] = useState('');
    const [digestGenerated, setDigestGenerated] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auto-open create modal when ?create=1 in URL (from sidebar New Project link)
    useEffect(() => {
        if (searchParams.get('create') === '1') {
            setShowCreateModal(true);
            // Remove param from URL without re-render
            router.replace('/dashboard');
        }
    }, [searchParams, router]);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            const apiProjects = data.projects || [];

            // Merge with any locally-created projects (demo fallback)
            let localProjects: Project[] = [];
            try {
                localProjects = JSON.parse(localStorage.getItem('claribb_local_projects') || '[]');
            } catch { /* ignore */ }

            // Deduplicate by id — API projects take priority
            const apiIds = new Set(apiProjects.map((p: Project) => p.id));
            const onlyLocal = localProjects.filter((p: Project) => !apiIds.has(p.id));
            const loaded = [...apiProjects, ...onlyLocal];
            setProjects(loaded);

            // Auto-fetch existing (unread) digest for first project
            if (loaded.length > 0 && loaded[0].user_id !== 'local') {
                try {
                    const dRes = await fetch(`/api/digest?projectId=${loaded[0].id}`);
                    const dData = await dRes.json();
                    if (dData.digest) setDigest(dData.digest);
                } catch { /* digest is optional */ }
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            // Still try to load local projects
            try {
                const localProjects = JSON.parse(localStorage.getItem('claribb_local_projects') || '[]');
                setProjects(localProjects);
            } catch { /* ignore */ }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const generateDigest = async (projectId: string) => {
        setDigestLoading(true);
        setDigestError('');
        setDigest(null);
        setDigestGenerated(false);
        try {
            const res = await fetch('/api/digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate digest');
            if (data.digest) {
                setDigest(data.digest);
                setDigestGenerated(true);
            } else {
                setDigestError(data.reason || 'Not enough session data to synthesize a digest yet. Complete at least one research session first.');
            }
        } catch (err) {
            setDigestError(err instanceof Error ? err.message : 'Failed to generate digest');
        } finally {
            setDigestLoading(false);
        }
    };

    const totalMemories = projects.reduce((sum, p) => sum + (p.memory_count || 0), 0);
    const totalSessions = projects.reduce((sum, p) => sum + (p.session_count || 0), 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3"
            >
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        Research Workspace
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Your persistent AI research intelligence system
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {projects.length > 0 && (
                        <button
                            onClick={() => generateDigest(projects[0].id)}
                            disabled={digestLoading}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'rgba(232,62,140,0.08)',
                                border: '1px solid rgba(232,62,140,0.2)',
                                color: '#E83E8C',
                            }}
                        >
                            {digestLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Synthesizing...</>
                            ) : (
                                <><Zap className="w-4 h-4" /> Generate Digest</>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                        style={{
                            background: '#E83E8C',
                            color: '#fff',
                            boxShadow: '0 0 18px rgba(232,62,140,0.3)',
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                </div>
            </motion.div>

            {/* Stats bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8"
            >
                {[
                    { label: 'Total Memories', value: totalMemories, icon: Database },
                    { label: 'Research Sessions', value: totalSessions, icon: BookOpen },
                    { label: 'Active Projects', value: projects.length, icon: Layers },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} style={{ padding: '1.25rem 1.5rem', borderRadius: 12, background: '#111111', border: '1px solid #1e1e1e' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                <Icon size={13} style={{ color: '#555' }} />
                                <span style={{ fontSize: '0.7rem', color: '#555', fontWeight: 500 }}>{stat.label}</span>
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#e8e8e8' }}>{stat.value}</div>
                        </div>
                    );
                })}
            </motion.div>

            {/* Digest error state */}
            <AnimatePresence>
                {digestError && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-6 p-4 rounded-xl flex items-start gap-3"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                        <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>Digest generation failed</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{digestError}</p>
                        </div>
                        <button onClick={() => setDigestError('')} style={{ color: 'var(--text-muted)' }}>
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Research Digest Card */}
            <AnimatePresence>
                {digest && (
                    <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                        className="mb-8 rounded-2xl overflow-hidden"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid rgba(232,62,140,0.18)',
                            boxShadow: '0 0 32px rgba(232,62,140,0.05)',
                        }}
                    >
                        {/* Digest header */}
                        <div className="px-6 py-4 flex items-center justify-between"
                            style={{
                                background: 'rgba(232,62,140,0.04)',
                                borderBottom: '1px solid rgba(232,62,140,0.12)',
                            }}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(232,62,140,0.1)', border: '1px solid rgba(232,62,140,0.2)' }}>
                                    <Zap className="w-4 h-4" style={{ color: '#E83E8C' }} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                            AI Research Synthesis
                                        </h3>
                                        {digestGenerated && (
                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(232,62,140,0.1)', color: '#E83E8C', border: '1px solid rgba(232,62,140,0.2)' }}>
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                Just generated
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(digest.created_at).toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'long', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => projects[0] && generateDigest(projects[0].id)}
                                    disabled={digestLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                    style={{ background: 'rgba(232,62,140,0.08)', border: '1px solid rgba(232,62,140,0.18)', color: '#E83E8C' }}>
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate
                                </button>
                                <button onClick={() => setDigest(null)} style={{ color: 'var(--text-muted)' }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* Connections Found */}
                            {digest.connections_found && digest.connections_found.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Link2 className="w-4 h-4" style={{ color: '#666' }} />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Connections Found
                                        </h4>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                            style={{ background: 'rgba(232,62,140,0.1)', color: '#E83E8C' }}>
                                            {digest.connections_found.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {digest.connections_found.slice(0, 3).map((conn, i) => (
                                            <div key={i} className="p-3 rounded-xl"
                                                style={{ background: 'rgba(232,62,140,0.03)', border: '1px solid rgba(232,62,140,0.1)' }}>
                                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                                        style={{ background: 'rgba(232,62,140,0.1)', color: '#E83E8C' }}>
                                                        {conn.concept_a}
                                                    </span>
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>↔</span>
                                                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                                        style={{ background: 'rgba(255,255,255,0.05)', color: '#aaa' }}>
                                                        {conn.concept_b}
                                                    </span>
                                                </div>
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                                    {conn.description}
                                                </p>
                                                {conn.similarity != null && (
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border)' }}>
                                                            <div className="h-full rounded-full"
                                                                style={{ width: `${conn.similarity * 100}%`, background: '#E83E8C' }} />
                                                        </div>
                                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {(conn.similarity * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gaps Detected */}
                            {digest.gaps_detected && digest.gaps_detected.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Research Gaps
                                        </h4>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                            {digest.gaps_detected.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {digest.gaps_detected.map((gap, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
                                                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#f59e0b' }} />
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{gap}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Open Questions */}
                            {digest.open_questions && digest.open_questions.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <HelpCircle className="w-4 h-4" style={{ color: '#a855f7' }} />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Open Questions
                                        </h4>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                            style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                                            {digest.open_questions.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {digest.open_questions.slice(0, 4).map((q, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                                                style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.12)' }}
                                                onClick={() => projects[0] && router.push(`/dashboard/workspace/${projects[0].id}`)}>
                                                <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: '#a855f7' }}>{i + 1}.</span>
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{q}</p>
                                                <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 opacity-40" style={{ color: '#a855f7' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CTA Footer */}
                        {projects[0] && (
                            <div className="px-6 pb-5">
                                <button
                                    onClick={() => router.push(`/dashboard/workspace/${projects[0].id}`)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01]"
                                    style={{
                                        background: 'rgba(232,62,140,0.08)',
                                        border: '1px solid rgba(232,62,140,0.18)',
                                        color: '#E83E8C',
                                    }}
                                >
                                    <Brain className="w-4 h-4" />
                                    Explore these questions in workspace
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>



            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-56 rounded-2xl shimmer" />
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-24"
                >
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{
                        background: 'rgba(232,62,140,0.07)',
                        border: '1px solid rgba(232,62,140,0.18)',
                    }}>
                        <Brain className="w-10 h-10" style={{ color: '#E83E8C' }} />
                    </div>
                    <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                        Create your first research project
                    </h3>
                    <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        Start building your persistent research brain. CLARIBB will remember everything across every session.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
                            style={{ background: '#E83E8C', boxShadow: '0 0 18px rgba(232,62,140,0.3)' }}
                        >
                            <Plus className="w-4 h-4" />
                            Create Project
                        </button>
                        <button
                            disabled={seeding}
                            onClick={async () => {
                                setSeeding(true);
                                try {
                                    const createRes = await fetch('/api/projects', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            name: 'AI Research Intelligence',
                                            description: 'Multi-agent systems, cognitive science, and the future of research.',
                                            color: '#6366f1',
                                            icon: '🧠',
                                        }),
                                    });
                                    const { project } = await createRes.json();
                                    if (!project?.id) throw new Error('Failed to create project');
                                    await fetch('/api/seed', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ projectId: project.id }),
                                    });
                                    router.push(`/dashboard/workspace/${project.id}`);
                                } catch (err) {
                                    console.error('Demo seed failed:', err);
                                    setSeeding(false);
                                }
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: 'rgba(232,62,140,0.06)',
                                border: '1px solid rgba(232,62,140,0.2)',
                                color: '#E83E8C',
                            }}
                        >
                            {seeding ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Loading 28 research memories...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Try Demo Project</>
                            )}
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                        >
                            <ProjectCard
                                project={project}
                                onClick={() => router.push(`/dashboard/workspace/${project.id}`)}
                            />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateProjectModal
                        onClose={() => setShowCreateModal(false)}
                        onCreated={(project) => {
                            setProjects(prev => [project, ...prev]);
                            setShowCreateModal(false);
                            router.push(`/dashboard/workspace/${project.id}`);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
                <Loader2 size={20} style={{ color: '#444', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
