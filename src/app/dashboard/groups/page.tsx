'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Plus, X, ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types';
import ProjectCard from '@/components/dashboard/ProjectCard';

interface Group {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: string;
}

const GROUP_ICONS = ['📁', '🔬', '📚', '🎯', '💡', '🌍', '🧪', '📊', '⚡', '🔭'];
const GROUP_COLORS = ['#E83E8C', '#888', '#aaa', '#666', '#999'];

const STORAGE_KEY = 'claribb_groups';
const MAPPING_KEY = 'claribb_group_projects'; // { projectId: groupId }

function loadGroups(): Group[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveGroups(g: Group[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }

function loadMapping(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(MAPPING_KEY) || '{}'); } catch { return {}; }
}
function saveMapping(m: Record<string, string>) { localStorage.setItem(MAPPING_KEY, JSON.stringify(m)); }

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('📁');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setGroups(loadGroups());
        setMapping(loadMapping());
        fetch('/api/projects')
            .then(r => r.json())
            .then(d => {
                const apiProjects = d.projects || [];
                let local: Project[] = [];
                try { local = JSON.parse(localStorage.getItem('claribb_local_projects') || '[]'); } catch { /* */ }
                const apiIds = new Set(apiProjects.map((p: Project) => p.id));
                setProjects([...apiProjects, ...local.filter((p: Project) => !apiIds.has(p.id))]);
            })
            .finally(() => setLoading(false));
    }, []);

    const createGroup = () => {
        if (!newName.trim()) return;
        const g: Group = { id: crypto.randomUUID(), name: newName.trim(), icon: newIcon, color: '#E83E8C', createdAt: new Date().toISOString() };
        const updated = [...groups, g];
        setGroups(updated);
        saveGroups(updated);
        setNewName(''); setNewIcon('📁'); setShowCreate(false);
    };

    const deleteGroup = (id: string) => {
        const updated = groups.filter(g => g.id !== id);
        setGroups(updated);
        saveGroups(updated);
        // unassign projects from this group
        const newMapping = { ...mapping };
        Object.keys(newMapping).forEach(pid => { if (newMapping[pid] === id) delete newMapping[pid]; });
        setMapping(newMapping);
        saveMapping(newMapping);
    };

    const assignToGroup = (projectId: string, groupId: string | null) => {
        const newMapping = { ...mapping };
        if (groupId === null) { delete newMapping[projectId]; }
        else { newMapping[projectId] = groupId; }
        setMapping(newMapping);
        saveMapping(newMapping);
    };

    // Drag events
    const onDragStart = (pid: string) => setDragging(pid);
    const onDragOver = (e: React.DragEvent, gid: string) => { e.preventDefault(); setDragOver(gid); };
    const onDrop = (e: React.DragEvent, gid: string) => {
        e.preventDefault();
        if (dragging) assignToGroup(dragging, gid);
        setDragging(null); setDragOver(null);
    };
    const onDragEnd = () => { setDragging(null); setDragOver(null); };

    const ungrouped = projects.filter(p => !mapping[p.id]);
    const grouped = (gid: string) => projects.filter(p => mapping[p.id] === gid);

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '2.5rem 2.5rem 4rem' }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Groups</h1>
                    <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 6 }}>
                        Organize your research projects into groups — drag & drop to assign
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.1rem',
                        borderRadius: 10, background: '#E83E8C', color: '#fff', border: 'none',
                        fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 0 16px rgba(232,62,140,0.3)',
                    }}>
                    <Plus size={14} /> New Group
                </button>
            </motion.div>

            {/* Create Group Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
                        <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }}
                            style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 360 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ color: '#fff', fontWeight: 700, margin: 0 }}>Create New Group</h3>
                                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Icon picker */}
                            <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: 8 }}>Pick an icon</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {GROUP_ICONS.map(ic => (
                                    <button key={ic} onClick={() => setNewIcon(ic)}
                                        style={{
                                            width: 36, height: 36, borderRadius: 8, fontSize: '1.1rem',
                                            background: newIcon === ic ? '#1e1e1e' : 'transparent',
                                            border: newIcon === ic ? '1px solid #333' : '1px solid #1a1a1a',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}>{ic}</button>
                                ))}
                            </div>

                            <input
                                autoFocus
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createGroup()}
                                placeholder="Group name..."
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '0.6rem 0.75rem', borderRadius: 8,
                                    background: '#0a0a0a', border: '1px solid #222',
                                    color: '#e0e0e0', fontSize: '0.9rem', outline: 'none',
                                    marginBottom: '1rem',
                                }}
                            />
                            <button onClick={createGroup} disabled={!newName.trim()}
                                style={{
                                    width: '100%', padding: '0.65rem', borderRadius: 8,
                                    background: newName.trim() ? '#E83E8C' : '#1a1a1a',
                                    color: newName.trim() ? '#fff' : '#444', border: 'none',
                                    fontWeight: 600, fontSize: '0.85rem', cursor: newName.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                }}>
                                Create Group
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {[1, 2].map(i => <div key={i} style={{ height: 120, borderRadius: 12, background: '#111', border: '1px solid #1a1a1a' }} />)}
                </div>
            ) : (
                <>
                    {/* Groups */}
                    {groups.map(group => {
                        const gProjects = grouped(group.id);
                        const isCollapsed = collapsed[group.id];
                        const isDragOver = dragOver === group.id;

                        return (
                            <motion.div key={group.id}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                onDragOver={e => onDragOver(e, group.id)}
                                onDrop={e => onDrop(e, group.id)}
                                onDragLeave={() => setDragOver(null)}
                                style={{
                                    background: '#0f0f0f', border: `1px solid ${isDragOver ? '#E83E8C' : '#1e1e1e'}`,
                                    borderRadius: 12, marginBottom: '1rem', overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                    boxShadow: isDragOver ? '0 0 20px rgba(232,62,140,0.1)' : 'none',
                                }}>
                                {/* Group header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.2rem', cursor: 'pointer' }}
                                    onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}>
                                    {isCollapsed ? <ChevronRight size={14} style={{ color: '#444' }} /> : <ChevronDown size={14} style={{ color: '#444' }} />}
                                    <span style={{ fontSize: '1.1rem' }}>{group.icon}</span>
                                    <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{group.name}</span>
                                    <span style={{ color: '#444', fontSize: '0.72rem' }}>{gProjects.length} project{gProjects.length !== 1 ? 's' : ''}</span>
                                    <button onClick={e => { e.stopPropagation(); deleteGroup(group.id); }}
                                        style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#333')}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {/* Drop hint */}
                                {isDragOver && (
                                    <div style={{ padding: '0.5rem 1.2rem', background: 'rgba(232,62,140,0.06)', color: '#E83E8C', fontSize: '0.75rem', textAlign: 'center' }}>
                                        Drop here to add to group
                                    </div>
                                )}

                                {/* Projects inside group */}
                                {!isCollapsed && gProjects.length > 0 && (
                                    <div style={{ padding: '0 1.2rem 1.2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                        {gProjects.map(p => (
                                            <div key={p.id} style={{ position: 'relative' }}>
                                                <ProjectCard project={p} onClick={() => router.push(`/dashboard/workspace/${p.id}`)} />
                                                <button onClick={() => assignToGroup(p.id, null)}
                                                    title="Remove from group"
                                                    style={{
                                                        position: 'absolute', top: 8, right: 8, background: '#1a1a1a', border: '1px solid #2a2a2a',
                                                        color: '#666', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', zIndex: 2,
                                                    }}>remove</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!isCollapsed && gProjects.length === 0 && (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#333', fontSize: '0.8rem' }}>
                                        Drag projects here to add them to this group
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    {/* Empty groups state */}
                    {groups.length === 0 && (
                        <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '2rem' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#111', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <FolderOpen size={22} style={{ color: '#333' }} />
                            </div>
                            <p style={{ color: '#555', fontSize: '0.88rem' }}>No groups yet — create your first group above</p>
                        </div>
                    )}

                    {/* Ungrouped projects */}
                    {ungrouped.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <p style={{ color: '#444', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                                Ungrouped Projects — drag to add to a group
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                {ungrouped.map(p => (
                                    <div key={p.id}
                                        draggable
                                        onDragStart={() => onDragStart(p.id)}
                                        onDragEnd={onDragEnd}
                                        style={{
                                            cursor: 'grab', position: 'relative',
                                            opacity: dragging === p.id ? 0.5 : 1,
                                            transition: 'opacity 0.2s',
                                        }}>
                                        {/* Drag handle */}
                                        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, color: '#333', cursor: 'grab' }}>
                                            <GripVertical size={14} />
                                        </div>
                                        <ProjectCard project={p} onClick={() => router.push(`/dashboard/workspace/${p.id}`)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
