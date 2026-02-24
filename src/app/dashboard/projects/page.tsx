'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, Brain } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { Project } from '@/types';
import ProjectCard from '@/components/dashboard/ProjectCard';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/projects')
            .then(r => r.json())
            .then(d => { setProjects(d.projects || []); setLoading(false); });
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>All Projects</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{projects.length} research project{projects.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                    style={{ background: '#E83E8C', boxShadow: '0 0 18px rgba(232,62,140,0.25)' }}>
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-56 rounded-2xl shimmer" />)}
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-24">
                    <Brain className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Create your first research project to get started.</p>
                    <button onClick={() => setShowCreate(true)}
                        className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                        style={{ background: '#E83E8C' }}>
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, i) => (
                        <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                            <ProjectCard project={project} onClick={() => router.push(`/dashboard/workspace/${project.id}`)} />
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showCreate && (
                    <CreateProjectModal
                        onClose={() => setShowCreate(false)}
                        onCreated={(project) => {
                            setProjects(prev => [project, ...prev]);
                            setShowCreate(false);
                            router.push(`/dashboard/workspace/${project.id}`);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
