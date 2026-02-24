'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Copy, Check, Hash, Globe, Lock, ArrowLeft,
    Loader2, Send, Sparkles, X, Crown, UserCircle2,
    Wifi, Settings
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
    created_at?: string;
}

interface ChatMessage {
    id: string;
    server_id: string;
    user_id: string;
    user_name: string;
    role: 'user' | 'ai';
    content: string;
    created_at: string;
}

interface Member {
    user_id: string;
    name: string;
    role: string;
    online?: boolean;
}

// Stable avatar color per user
function avatarColor(userId: string) {
    const colors = ['#E83E8C', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function Avatar({ name, userId, size = 28 }: { name: string; userId: string; size?: number }) {
    const bg = avatarColor(userId);
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export default function ServerDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const supabase = createClientSupabaseClient();

    const [server, setServer] = useState<Server | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [askingAI, setAskingAI] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
    const [showMembers, setShowMembers] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [togglingVisibility, setTogglingVisibility] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const [aiError, setAiError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const bottomRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const presenceChannelRef = useRef<RealtimeChannel | null>(null);

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Researcher';
                setCurrentUser({ id: user.id, name });
            }
        });
    }, [supabase]);

    // Fetch server info
    useEffect(() => {
        const fetchServer = async () => {
            try {
                const res = await fetch('/api/servers?mine=true');
                const data = await res.json();
                const found = (data.servers || []).find((s: Server) => s.id === id);
                setServer(found || null);
            } catch { setServer(null); }
            finally { setLoading(false); }
        };
        fetchServer();
    }, [id]);

    // Fetch all members of this server
    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch(`/api/servers?members=${id}`);
            const data = await res.json();
            setMembers(data.members || []);
        } catch { /* silent */ }
    }, [id]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    // Fetch messages and MERGE with existing state (preserves optimistic temp messages)
    const fetchMessages = useCallback(async (replace = false) => {
        if (replace) setLoadingMsgs(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const res = await fetch(`/api/servers/${id}/messages?limit=100`, { headers });
            if (res.ok) {
                const data = await res.json();
                const incoming: ChatMessage[] = data.messages || [];
                if (replace) {
                    setMessages(incoming);
                } else {
                    // Merge: keep existing messages, add any new from DB, drop temp IDs that now have real DB counterparts
                    setMessages(prev => {
                        const existingRealIds = new Set(incoming.map((m: ChatMessage) => m.id));
                        // Remove temp messages that are duplicated in DB (matched by content+time proximity)
                        const withoutStaleTemps = prev.filter(m => {
                            if (!m.id.startsWith('temp_') && !m.id.startsWith('ai_temp_')) return true;
                            // Keep temp if not yet in DB (no real match)
                            return !incoming.some(r =>
                                r.content === m.content &&
                                r.user_id === m.user_id &&
                                Math.abs(new Date(r.created_at).getTime() - new Date(m.created_at).getTime()) < 10000
                            );
                        });
                        // Add new DB messages not already in state
                        const stateIds = new Set(withoutStaleTemps.map(m => m.id));
                        const newOnes = incoming.filter((m: ChatMessage) => !stateIds.has(m.id));
                        if (newOnes.length === 0 && withoutStaleTemps.length === prev.length) return prev;
                        return [...withoutStaleTemps, ...newOnes].sort(
                            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                    });
                }
            }
        } catch { /* silent */ }
        finally { if (replace) setLoadingMsgs(false); }
    }, [id, supabase]);

    useEffect(() => { fetchMessages(true); }, [fetchMessages]);

    // Supabase Realtime — chat messages (dedup by id using Set)
    useEffect(() => {
        const seenIds = new Set<string>();

        const channel = supabase
            .channel(`server_chat_${id}_${Date.now()}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'server_messages', filter: `server_id=eq.${id}` },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    if (seenIds.has(newMsg.id)) return;
                    seenIds.add(newMsg.id);
                    setMessages(prev => {
                        // also check existing state to be extra safe
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, [id, supabase]);

    // Supabase Presence — track who is online
    useEffect(() => {
        if (!currentUser) return;

        const presence = supabase.channel(`server_presence_${id}`, {
            config: { presence: { key: currentUser.id } },
        });

        presence
            .on('presence', { event: 'sync' }, () => {
                const state = presence.presenceState();
                const onlineIds = new Set(Object.keys(state));
                setOnlineUserIds(onlineIds);

                // Also update members list with any new online users not in DB yet
                const onlineUsersInState: Record<string, Array<{ user_id?: string; name?: string }>> = state as Record<string, Array<{ user_id?: string; name?: string }>>;
                setMembers(prev => {
                    const existingIds = new Set(prev.map(m => m.user_id));
                    const toAdd: Member[] = [];
                    Object.values(onlineUsersInState).flat().forEach((u) => {
                        if (u.user_id && !existingIds.has(u.user_id)) {
                            toAdd.push({ user_id: u.user_id, name: u.name || 'Researcher', role: 'member', online: true });
                        }
                    });
                    if (toAdd.length === 0) return prev;
                    return [...prev, ...toAdd];
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presence.track({
                        user_id: currentUser.id,
                        name: currentUser.name,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        presenceChannelRef.current = presence;
        return () => { supabase.removeChannel(presence); };
    }, [id, supabase, currentUser]);

    // Auto scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        };
    };

    const sendMessage = async () => {
        if (!input.trim() || sending || !currentUser) return;
        const content = input.trim();
        setInput('');
        setSending(true);

        // Optimistic update — show message immediately
        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            server_id: id,
            user_id: currentUser.id,
            user_name: currentUser.name,
            role: 'user',
            content,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/servers/${id}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content, user_name: currentUser.name }),
            });
            if (res.ok) {
                const data = await res.json();
                // Replace temp message with real one from DB
                if (data.message) {
                    setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
                }
            } else {
                // Remove optimistic on failure
                setMessages(prev => prev.filter(m => m.id !== tempId));
                console.error('[sendMessage] error:', res.status);
            }
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            console.error('[sendMessage]', err);
        } finally {
            setSending(false);
            // Fallback refresh to sync any missed realtime events
            setTimeout(() => fetchMessages(), 1500);
        }
    };

    const askAI = async () => {
        if (!input.trim() || askingAI || !currentUser || !server) return;
        const question = input.trim();
        setInput('');
        setAskingAI(true);
        setAiError(null);

        // Optimistic update for user's question
        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            server_id: id,
            user_id: currentUser.id,
            user_name: currentUser.name,
            role: 'user',
            content: question,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const headers = await getAuthHeaders();

            // Persist user message
            const msgRes = await fetch(`/api/servers/${id}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: question, user_name: currentUser.name }),
            });
            if (msgRes.ok) {
                const data = await msgRes.json();
                if (data.message) {
                    setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
                }
            }

            // Ask AI (returns AI message saved to DB)
            const res = await fetch(`/api/servers/${id}/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    question,
                    serverName: server.name,
                    history: messages.slice(-10),
                }),
            });

            if (res.ok) {
                // Merge fetch — gets real AI message from DB, no temp ID jitter
                await fetchMessages();
            } else {
                const errData = await res.json().catch(() => ({}));
                setAiError(`AI error (${res.status}): ${errData.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('[askAI]', err);
            setAiError('Failed to reach AI. Check your connection.');
        } finally {
            setAskingAI(false);
        }
    };

    const copyCode = () => {
        if (!server) return;
        navigator.clipboard.writeText(server.invite_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const toggleServerVisibility = async () => {
        if (!server || togglingVisibility) return;
        setTogglingVisibility(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const res = await fetch(`/api/servers?id=${server.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ is_public: !server.is_public }),
            });
            if (res.ok) {
                setServer(prev => prev ? { ...prev, is_public: !prev.is_public } : prev);
            }
        } catch (err) {
            console.error('[toggleVisibility]', err);
        } finally {
            setTogglingVisibility(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={20} style={{ color: '#444', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!server) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ color: '#555', fontSize: '0.9rem' }}>Server not found or you don&apos;t have access.</p>
            <button onClick={() => router.push('/dashboard/collab')}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: '0.82rem', cursor: 'pointer' }}>
                ← Back to Collab
            </button>
        </div>
    );

    const onlineCount = members.filter(m => onlineUserIds.has(m.user_id)).length;

    return (
        <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* ── TOP BAR ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#080808', flexShrink: 0 }}>
                <button onClick={() => router.push('/dashboard/collab')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#555', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                    <ArrowLeft size={13} />
                </button>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1a1a', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {server.icon || '🔬'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.88rem' }}>{server.name}</span>
                        {server.my_role === 'owner' && (
                            <span style={{ fontSize: '0.6rem', color: '#E83E8C', background: 'rgba(232,62,140,0.08)', border: '1px solid rgba(232,62,140,0.2)', padding: '1px 6px', borderRadius: 99 }}>Owner</span>
                        )}
                        {server.is_public
                            ? <Globe size={11} style={{ color: '#555' }} />
                            : <Lock size={11} style={{ color: '#444' }} />}
                        {/* Owner-only visibility quick toggle in top bar */}
                        {server.my_role === 'owner' && (
                            <button
                                onClick={toggleServerVisibility}
                                disabled={togglingVisibility}
                                title={server.is_public ? 'Make private' : 'Make public'}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 99, background: server.is_public ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${server.is_public ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`, color: server.is_public ? '#10b981' : '#555', fontSize: '0.6rem', cursor: 'pointer', transition: 'all 0.15s' }}
                            >
                                {togglingVisibility ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : server.is_public ? <Globe size={9} /> : <Lock size={9} />}
                                {server.is_public ? 'Public' : 'Private'}
                            </button>
                        )}
                    </div>
                    {server.description && <p style={{ color: '#444', fontSize: '0.7rem', margin: 0 }}>{server.description}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Online indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: onlineCount > 0 ? '#10b981' : '#444', fontSize: '0.72rem' }}>
                        <Wifi size={11} />
                        <span>{onlineCount} online</span>
                    </div>
                    {/* Invite code — hidden on small screens */}
                    {!isMobile && (
                        <button onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.6rem', borderRadius: 6, background: '#111', border: '1px solid #1e1e1e', color: copiedCode ? '#E83E8C' : '#555', fontSize: '0.72rem', cursor: 'pointer' }}>
                            {copiedCode ? <Check size={10} /> : <Copy size={10} />}
                            <code style={{ fontFamily: 'monospace' }}>{server.invite_code}</code>
                        </button>
                    )}
                    {/* Members toggle */}
                    <button onClick={() => setShowMembers(s => !s)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.6rem', borderRadius: 6, background: showMembers ? 'rgba(232,62,140,0.08)' : 'transparent', border: `1px solid ${showMembers ? 'rgba(232,62,140,0.2)' : '#1e1e1e'}`, color: showMembers ? '#E83E8C' : '#444', fontSize: '0.72rem', cursor: 'pointer' }}>
                        <Users size={11} /> {members.length}
                    </button>
                </div>
            </div>

            {/* ── MAIN AREA ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* ── CHAT ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Channel tag */}
                    <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <Hash size={12} style={{ color: '#333' }} />
                        <span style={{ color: '#444', fontSize: '0.75rem', fontWeight: 600 }}>general</span>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {loadingMsgs ? (
                            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem', color: '#333', fontSize: '0.8rem' }}>
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Loading messages...
                            </div>
                        ) : messages.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                style={{ textAlign: 'center', paddingTop: '4rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{server.icon || '🔬'}</div>
                                <p style={{ color: '#333', fontSize: '0.88rem', marginBottom: 4 }}>Welcome to <strong style={{ color: '#555' }}>{server.name}</strong>!</p>
                                <p style={{ color: '#2a2a2a', fontSize: '0.78rem' }}>Start the research conversation. Type a question or use <strong style={{ color: '#E83E8C' }}>Ask AI</strong> ✨</p>
                            </motion.div>
                        ) : (
                            <>
                                {messages.map((msg, i) => {
                                    const isMe = msg.user_id === currentUser?.id && msg.role === 'user';
                                    const isAI = msg.role === 'ai';
                                    const prevMsg = messages[i - 1];
                                    const showName = !prevMsg || prevMsg.user_id !== msg.user_id || prevMsg.role !== msg.role;

                                    return (
                                        <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: showName ? 8 : 1 }}>
                                            {/* Avatar */}
                                            {showName && !isMe && (
                                                <div style={{ flexShrink: 0, marginTop: 2 }}>
                                                    {isAI
                                                        ? <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #E83E8C, #A78BD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✦</div>
                                                        : <Avatar name={msg.user_name} userId={msg.user_id} size={28} />}
                                                </div>
                                            )}
                                            {!showName && !isMe && <div style={{ width: 28 }} />}

                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                {showName && !isMe && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isAI ? '#A78BD4' : avatarColor(msg.user_id), marginBottom: 2 }}>
                                                        {isAI ? '✦ Claribb.AI' : msg.user_name}
                                                    </span>
                                                )}
                                                <div style={{
                                                    maxWidth: isMobile ? '88%' : '75%',
                                                    padding: '0.55rem 0.85rem',
                                                    borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                                                    background: isMe ? 'rgba(232,62,140,0.14)' : isAI ? 'rgba(167,139,212,0.08)' : 'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${isMe ? 'rgba(232,62,140,0.22)' : isAI ? 'rgba(167,139,212,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                                }}>
                                                    <p style={{
                                                        color: isMe ? '#f0aece' : isAI ? 'rgba(200,180,240,0.9)' : 'rgba(255,255,255,0.75)',
                                                        fontSize: '0.82rem', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                                    }}>
                                                        {msg.content}
                                                    </p>
                                                </div>
                                                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', marginTop: 2 }}>
                                                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {askingAI && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #E83E8C, #A78BD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0 }}>✦</div>
                                        <div style={{ padding: '0.55rem 0.85rem', borderRadius: '12px 12px 12px 3px', background: 'rgba(167,139,212,0.08)', border: '1px solid rgba(167,139,212,0.2)' }}>
                                            <Loader2 size={12} style={{ color: '#A78BD4', animation: 'spin 1s linear infinite' }} />
                                        </div>
                                    </div>
                                )}
                                {aiError && (
                                    <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.75rem', color: '#f87171', marginTop: 4 }}>
                                        ⚠️ {aiError}
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* ── INPUT ── */}
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#080808', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        // Enter → Ask AI | Ctrl+Enter → Send to researchers | Shift+Enter → newline
                                        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                            e.preventDefault();
                                            askAI();
                                        } else if (e.key === 'Enter' && e.ctrlKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder={`Ask AI (Enter) or send to researchers (Ctrl+Enter)…`}
                                    rows={1}
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        padding: '0.65rem 0.85rem', borderRadius: 10,
                                        background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e0e0e0', fontSize: '0.85rem', outline: 'none',
                                        resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                                        maxHeight: 120, overflowY: 'auto',
                                    }}
                                />
                            </div>
                            {/* Ask AI button */}
                            <button
                                onClick={askAI}
                                disabled={!input.trim() || askingAI || sending}
                                title="Ask Claribb.AI"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '0.65rem 0.9rem', borderRadius: 10,
                                    background: input.trim() ? 'rgba(167,139,212,0.12)' : 'transparent',
                                    border: `1px solid ${input.trim() ? 'rgba(167,139,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                    color: input.trim() ? '#A78BD4' : '#333',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.15s', flexShrink: 0,
                                }}>
                                {askingAI ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
                                Ask AI
                            </button>
                            {/* Send button */}
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || sending || askingAI}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 38, height: 38, borderRadius: 10,
                                    background: input.trim() ? '#E83E8C' : '#111',
                                    border: `1px solid ${input.trim() ? '#E83E8C' : 'rgba(255,255,255,0.06)'}`,
                                    color: input.trim() ? '#fff' : '#333',
                                    cursor: input.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.15s', flexShrink: 0,
                                }}>
                                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                            </button>
                        </div>
                        {!isMobile && (
                            <p style={{ color: '#2a2a2a', fontSize: '0.65rem', marginTop: 5, marginLeft: 2 }}>
                                <span style={{ color: '#A78BD4' }}>Enter</span> → Ask AI &nbsp;·&nbsp; <span style={{ color: '#E83E8C' }}>Ctrl+Enter</span> → Send to researchers &nbsp;·&nbsp; Shift+Enter → newline
                            </p>
                        )}
                    </div>
                </div>

                {/* ── MEMBERS PANEL ── */}
                <AnimatePresence>
                    {showMembers && (
                        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: isMobile ? '100%' : 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={isMobile ? {
                                position: 'fixed', inset: 0, zIndex: 40,
                                background: 'rgba(0,0,0,0.85)',
                                backdropFilter: 'blur(8px)',
                                overflowY: 'auto',
                            } : {
                                borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#060608', overflowY: 'auto', flexShrink: 0
                            }}>
                            <div style={{ padding: '0.875rem 0.875rem 0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                                    <p style={{ color: '#444', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                                        Members — {members.length}
                                    </p>
                                    <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 0 }}>
                                        <X size={12} />
                                    </button>
                                </div>

                                {/* Online members */}
                                {members.filter(m => onlineUserIds.has(m.user_id)).length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <p style={{ color: '#10b981', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                                            Online — {members.filter(m => onlineUserIds.has(m.user_id)).length}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {members.filter(m => onlineUserIds.has(m.user_id)).map(member => (
                                                <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px', borderRadius: 7 }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <Avatar name={member.name} userId={member.user_id} size={24} />
                                                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '1.5px solid #060608' }} />
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <p style={{ color: member.user_id === currentUser?.id ? '#E83E8C' : '#aaa', fontSize: '0.75rem', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {member.name}{member.user_id === currentUser?.id ? ' (you)' : ''}
                                                        </p>
                                                        {member.role === 'owner' && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                                <Crown size={9} style={{ color: '#E83E8C' }} />
                                                                <span style={{ color: '#E83E8C', fontSize: '0.58rem' }}>Owner</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Offline members */}
                                {members.filter(m => !onlineUserIds.has(m.user_id)).length > 0 && (
                                    <div>
                                        <p style={{ color: '#333', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                                            Offline — {members.filter(m => !onlineUserIds.has(m.user_id)).length}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {members.filter(m => !onlineUserIds.has(m.user_id)).map(member => (
                                                <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px', borderRadius: 7, opacity: 0.5 }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <Avatar name={member.name} userId={member.user_id} size={24} />
                                                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#333', border: '1.5px solid #060608' }} />
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <p style={{ color: '#555', fontSize: '0.75rem', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {member.name}
                                                        </p>
                                                        {member.role === 'owner' && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                                <Crown size={9} style={{ color: '#555' }} />
                                                                <span style={{ color: '#555', fontSize: '0.58rem' }}>Owner</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {members.length === 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 20, color: '#333' }}>
                                        <UserCircle2 size={28} />
                                        <p style={{ fontSize: '0.72rem', margin: 0, textAlign: 'center' }}>Loading members…</p>
                                    </div>
                                )}
                            </div>

                            {/* Invite section */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', margin: '0.5rem 0.875rem', paddingTop: '0.875rem' }}>
                                <p style={{ color: '#333', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Invite</p>
                                <button onClick={copyCode} style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                    padding: '6px 0', borderRadius: 7, background: 'rgba(232,62,140,0.07)', border: '1px solid rgba(232,62,140,0.2)',
                                    color: '#E83E8C', fontSize: '0.72rem', cursor: 'pointer',
                                }}>
                                    {copiedCode ? <Check size={10} /> : <Copy size={10} />}
                                    {copiedCode ? 'Copied!' : server.invite_code}
                                </button>
                            </div>

                            {/* Owner-only: Server visibility toggle */}
                            {server.my_role === 'owner' && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', margin: '0 0.875rem', paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
                                    <p style={{ color: '#333', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Settings size={9} /> Server Settings
                                    </p>
                                    <button
                                        onClick={toggleServerVisibility}
                                        disabled={togglingVisibility}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '7px 10px', borderRadius: 7,
                                            background: server.is_public ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${server.is_public ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                            color: server.is_public ? '#10b981' : '#888',
                                            fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {server.is_public ? <Globe size={11} /> : <Lock size={11} />}
                                            {server.is_public ? 'Public Server' : 'Private Server'}
                                        </span>
                                        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>
                                            {togglingVisibility ? '…' : (server.is_public ? 'Make private →' : 'Make public →')}
                                        </span>
                                    </button>
                                    <p style={{ color: '#2a2a2a', fontSize: '0.6rem', marginTop: 5, marginBottom: 0 }}>
                                        {server.is_public ? 'Anyone can discover & join' : 'Only via invite code'}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
