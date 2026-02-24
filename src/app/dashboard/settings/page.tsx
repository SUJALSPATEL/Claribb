'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Database, Loader2, CheckCircle } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export default function SettingsPage() {
    const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const supabase = createClientSupabaseClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser({ email: user.email || '', full_name: user.user_metadata?.full_name });
                setName(user.user_metadata?.full_name || '');
                setDomain(user.user_metadata?.research_domain || '');
            }
        });
    }, [supabase]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.auth.updateUser({ data: { full_name: name, research_domain: domain } });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    const Section = ({ icon: Icon, title, color, children }: {
        icon: React.ElementType; title: string; color: string; children: React.ReactNode;
    }) => (
        <div className="p-6 rounded-2xl mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            </div>
            {children}
        </div>
    );

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your CLARIBB workspace preferences</p>
            </motion.div>

            <Section icon={User} title="Profile" color="#6366f1">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 rounded-xl text-sm opacity-50 cursor-not-allowed"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Research Domain</label>
                        <input
                            type="text"
                            value={domain}
                            onChange={e => setDomain(e.target.value)}
                            placeholder="e.g. AI Policy, Computational Biology..."
                            className="w-full px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                            Helps CLARIBB tailor its responses to your field
                        </p>
                    </div>
                </div>
            </Section>

            <Section icon={Database} title="Memory & Storage" color="#06b6d4">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-save chat responses</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Store CLARIBB answers as memory chunks</p>
                        </div>
                        <div className="w-10 h-6 rounded-full flex items-center px-1 cursor-pointer" style={{ background: 'var(--accent)' }}>
                            <div className="w-4 h-4 rounded-full bg-white ml-auto transition-all" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-extract concepts</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Build knowledge graph from conversations</p>
                        </div>
                        <div className="w-10 h-6 rounded-full flex items-center px-1 cursor-pointer" style={{ background: 'var(--accent)' }}>
                            <div className="w-4 h-4 rounded-full bg-white ml-auto transition-all" />
                        </div>
                    </div>
                </div>
            </Section>

            <Section icon={Shield} title="AI Agents (5 Active)" color="#10b981">
                <div className="space-y-3">
                    {[
                        { name: 'Recall Agent', desc: 'Searches your semantic memory for relevant context', color: '#6366f1' },
                        { name: 'Explorer Agent', desc: 'Web search when memory confidence is low', color: '#06b6d4' },
                        { name: 'Critique Agent', desc: 'Identifies weaknesses and counterarguments', color: '#f59e0b' },
                        { name: 'Connector Agent', desc: 'Finds non-obvious cross-topic connections', color: '#10b981' },
                        { name: 'Conflict Detector', desc: 'Spots contradictions between your memories and new findings', color: '#f43f5e' },
                    ].map(agent => (
                        <div key={agent.name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
                                <div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{agent.desc}</p>
                                </div>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${agent.color}15`, color: agent.color }}>Active</span>
                        </div>
                    ))}
                </div>
            </Section>

            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
                    {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
                </button>
                {saved && <span className="text-sm" style={{ color: '#10b981' }}>✓ Profile updated</span>}
            </div>
        </div>
    );
}
