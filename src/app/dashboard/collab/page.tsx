'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Search, Users, Lock, Globe, Copy, Check, LogIn, Hash, ChevronRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Server {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    invite_code: string;
    is_public?: boolean;
    members_count?: number;
    owner_id?: string;
    my_role?: string;
}

const SERVER_ICONS = ['🔬', '📚', '🧠', '🌍', '⚡', '🎯', '📊', '🔭', '🧬', '💡', '🏛️', '🚀'];

type Tab = 'my' | 'discover' | 'join';

export default function CollabPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('my');
    const [myServers, setMyServers] = useState<Server[]>([]);
    const [publicServers, setPublicServers] = useState<Server[]>([]);
    const [loadingMine, setLoadingMine] = useState(true);
    const [loadingPublic, setLoadingPublic] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [serverName, setServerName] = useState('');
    const [serverDesc, setServerDesc] = useState('');
    const [serverIcon, setServerIcon] = useState('🔬');
    const [isPublic, setIsPublic] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [searchQ, setSearchQ] = useState('');
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [copiedCode, setCopiedCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [createError, setCreateError] = useState('');

    // Fetch user's own servers from Supabase
    const fetchMyServers = useCallback(async () => {
        setLoadingMine(true);
        try {
            const res = await fetch('/api/servers?mine=true');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setMyServers(data.servers || []);
        } catch {
            setMyServers([]);
        } finally {
            setLoadingMine(false);
        }
    }, []);

    // Fetch public servers
    const fetchPublicServers = useCallback(async (q = '') => {
        setLoadingPublic(true);
        try {
            const params = new URLSearchParams({ public: 'true', ...(q ? { q } : {}) });
            const res = await fetch(`/api/servers?${params}`);
            const data = await res.json();
            setPublicServers(data.servers || []);
        } catch {
            setPublicServers([]);
        } finally {
            setLoadingPublic(false);
        }
    }, []);

    useEffect(() => {
        fetchMyServers();
    }, [fetchMyServers]);

    useEffect(() => {
        if (tab === 'discover') fetchPublicServers(searchQ);
    }, [tab, fetchPublicServers, searchQ]);

    const createServer = async () => {
        if (!serverName.trim()) return;
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/servers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: serverName.trim(), description: serverDesc, icon: serverIcon, is_public: isPublic }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create');
            setShowCreate(false);
            setServerName(''); setServerDesc(''); setServerIcon('🔬'); setIsPublic(false);
            await fetchMyServers();
            setTab('my');
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : 'Failed to create server');
        } finally {
            setCreating(false);
        }
    };

    const joinByCode = async () => {
        const code = joinCode.trim().toUpperCase();
        if (!code) return;
        setJoining(true);
        setJoinError('');
        try {
            const res = await fetch('/api/servers/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invite_code: code }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid invite code');
            if (data.already_member) {
                setJoinError('You are already a member of this server!');
                setJoining(false);
                return;
            }
            setJoinCode('');
            setShowJoin(false);
            await fetchMyServers();
            setTab('my');
        } catch (e) {
            setJoinError(e instanceof Error ? e.message : 'Invalid invite code. Please check and try again.');
        } finally {
            setJoining(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    const TABS: { id: Tab; label: string }[] = [
        { id: 'my', label: 'My Servers' },
        { id: 'discover', label: 'Discover' },
        { id: 'join', label: 'Join by Code' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: 'clamp(1rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2.5rem) 5rem' }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Collab</h1>
                    <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 6 }}>
                        Create or join research servers — synced across all your devices
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowJoin(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.1rem', borderRadius: 10, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                        <LogIn size={14} /> Join Server
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.1rem', borderRadius: 10, background: '#E83E8C', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 16px rgba(232,62,140,0.3)' }}>
                        <Plus size={14} /> Create Server
                    </button>
                </div>
            </motion.div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                            color: tab === t.id ? '#e0e0e0' : '#555', fontSize: '0.82rem', fontWeight: tab === t.id ? 600 : 400,
                            borderBottom: tab === t.id ? '2px solid #E83E8C' : '2px solid transparent',
                            transition: 'all 0.15s', marginBottom: -1,
                        }}>{t.label}</button>
                ))}
            </div>

            {/* === MY SERVERS === */}
            {tab === 'my' && (
                <div>
                    {loadingMine ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3rem 0', color: '#444', fontSize: '0.85rem' }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading your servers...
                        </div>
                    ) : myServers.length === 0 ? (
                        <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#111', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <Users size={22} style={{ color: '#333' }} />
                            </div>
                            <p style={{ color: '#555', fontSize: '0.88rem', marginBottom: '1rem' }}>No servers yet</p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button onClick={() => setShowCreate(true)} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: '#E83E8C', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Create Server</button>
                                <button onClick={() => setShowJoin(true)} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: '0.82rem', cursor: 'pointer' }}>Join with Code</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Refresh button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                                <button onClick={fetchMyServers}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 8, background: 'transparent', border: '1px solid #222', color: '#555', fontSize: '0.72rem', cursor: 'pointer' }}>
                                    <RefreshCw size={11} /> Refresh
                                </button>
                            </div>
                            {myServers.map(server => (
                                <motion.div key={server.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    onClick={() => router.push(`/dashboard/collab/${server.id}`)}
                                    style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                                        {server.icon || '🔬'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{server.name}</span>
                                            {server.my_role === 'owner' && (
                                                <span style={{ fontSize: '0.6rem', color: '#E83E8C', background: 'rgba(232,62,140,0.08)', border: '1px solid rgba(232,62,140,0.2)', padding: '1px 6px', borderRadius: 99 }}>Owner</span>
                                            )}
                                            {server.is_public
                                                ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#888', background: '#1a1a1a', border: '1px solid #2a2a2a', padding: '1px 6px', borderRadius: 99 }}><Globe size={9} />Public</span>
                                                : <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', padding: '1px 6px', borderRadius: 99 }}><Lock size={9} />Private</span>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Hash size={11} style={{ color: '#444' }} />
                                            <code style={{ color: '#555', fontSize: '0.72rem', fontFamily: 'monospace' }}>{server.invite_code}</code>
                                            <button onClick={e => { e.stopPropagation(); copyCode(server.invite_code); }}
                                                style={{ background: 'none', border: 'none', color: copiedCode === server.invite_code ? '#E83E8C' : '#333', cursor: 'pointer', padding: 2 }}>
                                                {copiedCode === server.invite_code ? <Check size={11} /> : <Copy size={11} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#555', fontSize: '0.75rem', marginRight: 8 }}>
                                        <Users size={12} /> {server.members_count || 1}
                                    </div>
                                    <ChevronRight size={14} style={{ color: '#333' }} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === DISCOVER === */}
            {tab === 'discover' && (
                <div>
                    <form onSubmit={e => { e.preventDefault(); fetchPublicServers(searchQ); }} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search public servers..."
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem 0.55rem 2rem', borderRadius: 8, background: '#111', border: '1px solid #222', color: '#ddd', fontSize: '0.83rem', outline: 'none' }} />
                        </div>
                        <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: 8, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: '0.8rem', cursor: 'pointer' }}>Search</button>
                    </form>

                    {loadingPublic ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#444', fontSize: '0.85rem' }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                        </div>
                    ) : publicServers.length === 0 ? (
                        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#444', fontSize: '0.88rem' }}>
                            No public servers found.{' '}
                            <span style={{ color: '#E83E8C', cursor: 'pointer' }} onClick={() => setShowCreate(true)}>Create the first one!</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {publicServers.map(server => (
                                <motion.div key={server.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{server.icon || '🔬'}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{server.name}</div>
                                        {server.description && <p style={{ color: '#555', fontSize: '0.75rem', margin: 0 }}>{server.description}</p>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#555', fontSize: '0.75rem', marginRight: 8 }}>
                                        <Users size={12} />{server.members_count || 1}
                                    </div>
                                    <button onClick={() => { setJoinCode(server.invite_code); setTab('join'); }}
                                        style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'rgba(232,62,140,0.08)', border: '1px solid rgba(232,62,140,0.2)', color: '#E83E8C', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                        Join
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === JOIN BY CODE === */}
            {tab === 'join' && (
                <div style={{ maxWidth: 420 }}>
                    <p style={{ color: '#666', fontSize: '0.82rem', marginBottom: '1rem' }}>
                        Enter an invite code (format: <code style={{ color: '#888', fontFamily: 'monospace' }}>CLR-XXXXXX</code>) shared by another researcher
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && joinByCode()}
                            placeholder="CLR-XXXXXX"
                            style={{ flex: 1, padding: '0.65rem 0.75rem', borderRadius: 8, background: '#111', border: '1px solid #222', color: '#e0e0e0', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none', textTransform: 'uppercase' }} />
                        <button onClick={joinByCode} disabled={!joinCode.trim() || joining}
                            style={{ padding: '0.65rem 1.2rem', borderRadius: 8, background: '#E83E8C', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', opacity: (!joinCode.trim() || joining) ? 0.5 : 1 }}>
                            {joining ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Join'}
                        </button>
                    </div>
                    {joinError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#ef4444', fontSize: '0.78rem' }}>
                            <AlertCircle size={13} /> {joinError}
                        </div>
                    )}
                </div>
            )}

            {/* === CREATE SERVER MODAL === */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
                        <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }}
                            style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: 'clamp(1rem, 4vw, 1.75rem)', width: '90vw', maxWidth: 380 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ color: '#fff', fontWeight: 700, margin: 0 }}>Create Research Server</h3>
                                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                            <p style={{ color: '#555', fontSize: '0.73rem', marginBottom: 6 }}>Server Icon</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {SERVER_ICONS.map(ic => (
                                    <button key={ic} onClick={() => setServerIcon(ic)}
                                        style={{ width: 34, height: 34, borderRadius: 8, fontSize: '1rem', background: serverIcon === ic ? '#1e1e1e' : 'transparent', border: serverIcon === ic ? '1px solid #333' : '1px solid #1a1a1a', cursor: 'pointer' }}>{ic}</button>
                                ))}
                            </div>
                            <input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="Server name *"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#0a0a0a', border: '1px solid #222', color: '#e0e0e0', fontSize: '0.88rem', outline: 'none', marginBottom: 8 }} />
                            <textarea value={serverDesc} onChange={e => setServerDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#0a0a0a', border: '1px solid #222', color: '#e0e0e0', fontSize: '0.85rem', outline: 'none', marginBottom: '1rem', resize: 'none', fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', padding: '0.75rem', borderRadius: 8, background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
                                <div>
                                    <div style={{ color: '#d0d0d0', fontSize: '0.85rem', fontWeight: 500 }}>Public Server</div>
                                    <div style={{ color: '#555', fontSize: '0.72rem' }}>Anyone can discover and join</div>
                                </div>
                                <div onClick={() => setIsPublic(!isPublic)} style={{ width: 36, height: 20, borderRadius: 99, background: isPublic ? '#E83E8C' : '#1e1e1e', border: `1px solid ${isPublic ? '#E83E8C' : '#2a2a2a'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                                    <div style={{ position: 'absolute', top: 2, left: isPublic ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                                </div>
                            </div>
                            {createError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#ef4444', fontSize: '0.78rem' }}>
                                    <AlertCircle size={13} /> {createError}
                                </div>
                            )}
                            <button onClick={createServer} disabled={!serverName.trim() || creating}
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 8, background: serverName.trim() ? '#E83E8C' : '#1a1a1a', color: serverName.trim() ? '#fff' : '#444', border: 'none', fontWeight: 600, fontSize: '0.88rem', cursor: serverName.trim() ? 'pointer' : 'default', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {creating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Server'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === QUICK JOIN MODAL === */}
            <AnimatePresence>
                {showJoin && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={e => e.target === e.currentTarget && setShowJoin(false)}>
                        <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }}
                            style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: 'clamp(1rem, 4vw, 1.75rem)', width: '90vw', maxWidth: 360 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <h3 style={{ color: '#fff', fontWeight: 700, margin: 0 }}>Join a Server</h3>
                                <button onClick={() => setShowJoin(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1rem' }}>Enter invite code from another researcher</p>
                            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && joinByCode()}
                                placeholder="CLR-XXXXXX"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#0a0a0a', border: '1px solid #222', color: '#e0e0e0', fontSize: '0.95rem', fontFamily: 'monospace', outline: 'none', marginBottom: 8, letterSpacing: '0.05em' }} />
                            {joinError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#ef4444', fontSize: '0.78rem' }}>
                                    <AlertCircle size={13} /> {joinError}
                                </div>
                            )}
                            <button onClick={joinByCode} disabled={!joinCode.trim() || joining}
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 8, background: joinCode.trim() ? '#E83E8C' : '#1a1a1a', color: joinCode.trim() ? '#fff' : '#444', border: 'none', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {joining ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Joining...</> : 'Join Server'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
