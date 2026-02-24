'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, ArrowRight, Zap, Shield, Users, Building2, ChevronDown, Star, X } from 'lucide-react';

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}
interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id: string;
    handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) => void;
    prefill?: { name?: string; email?: string };
    theme?: { color?: string };
    modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
    open(): void;
}

const PLANS = [
    {
        id: 'free',
        tier: '01',
        name: 'Free',
        price: 0,
        priceINR: 0,
        period: '/mo',
        tagline: 'For students and hobbyists',
        description: 'Start building your research memory. No credit card required.',
        color: '#6366f1',
        colorBg: 'rgba(99,102,241,0.06)',
        colorBorder: 'rgba(99,102,241,0.2)',
        icon: Brain,
        cta: 'Get Started Free',
        ctaLink: '/auth',
        features: [
            { text: '3 research projects', included: true },
            { text: '100 memory chunks', included: true },
            { text: '5 AI agents (Recall, Explorer, Critique, Connector, Conflict Detector)', included: true },
            { text: '10 sessions / month', included: true },
            { text: 'Knowledge Graph (basic)', included: true },
            { text: 'Community support', included: true },
            { text: 'Deep Research mode', included: false },
            { text: 'Steelman Engine', included: false },
            { text: 'Belief Evolution Tracker', included: false },
            { text: 'Trajectory Prediction', included: false },
            { text: 'Cross-project Serendipity', included: false },
            { text: 'Voice Research Mode', included: false },
            { text: 'Export Research Briefs', included: false },
            { text: 'Priority support', included: false },
        ],
    },
    {
        id: 'pro',
        tier: '02',
        name: 'Pro',
        price: 12,
        priceINR: 799,
        period: '/mo',
        tagline: 'For researchers and professionals',
        description: 'Everything you need to go deep on any research topic.',
        color: '#E83E8C',
        colorBg: 'rgba(232,62,140,0.08)',
        colorBorder: 'rgba(232,62,140,0.35)',
        icon: Zap,
        cta: 'Upgrade to Pro',
        popular: true,
        razorpayPlanId: 'plan_pro_monthly',
        features: [
            { text: 'Unlimited research projects', included: true },
            { text: 'Unlimited memory chunks', included: true },
            { text: 'All 5 AI agents', included: true },
            { text: 'Unlimited research sessions', included: true },
            { text: 'Full Knowledge Graph', included: true },
            { text: 'Deep Research mode', included: true },
            { text: 'Steelman Engine', included: true },
            { text: 'Belief Evolution Tracker', included: true },
            { text: 'Trajectory Prediction', included: true },
            { text: 'Cross-project Serendipity', included: true },
            { text: 'Voice Research Mode', included: true },
            { text: 'Export Research Briefs', included: true },
            { text: 'Priority email support', included: true },
            { text: 'Dedicated support channel', included: false },
        ],
    },
    {
        id: 'team',
        tier: '03',
        name: 'Team',
        price: 49,
        priceINR: 2100,
        period: '/mo',
        tagline: 'For labs and research groups',
        description: 'Shared memory banks and collaborative knowledge graphs for your team.',
        color: '#06b6d4',
        colorBg: 'rgba(6,182,212,0.06)',
        colorBorder: 'rgba(6,182,212,0.25)',
        icon: Users,
        cta: 'Upgrade to Team',
        razorpayPlanId: 'plan_team_monthly',
        features: [
            { text: 'Everything in Pro', included: true },
            { text: 'Up to 10 team members', included: true },
            { text: 'Shared memory banks', included: true },
            { text: 'Collaborative knowledge graph', included: true },
            { text: 'Team research sessions', included: true },
            { text: 'Admin dashboard', included: true },
            { text: 'Role-based access control', included: true },
            { text: 'Conflict detection across team', included: true },
            { text: 'Team analytics & insights', included: true },
            { text: 'Priority support (24h SLA)', included: true },
            { text: 'Onboarding call', included: true },
            { text: 'Custom knowledge domains', included: true },
            { text: 'Dedicated support channel', included: true },
            { text: 'Self-hosted option', included: false },
        ],
    },
    {
        id: 'enterprise',
        tier: '04',
        name: 'Enterprise',
        price: null,
        priceINR: null,
        period: '',
        tagline: 'For universities and corporates',
        description: 'Self-hosted deployment, private LLM, dedicated vector DB, and SSO.',
        color: '#a855f7',
        colorBg: 'rgba(168,85,247,0.06)',
        colorBorder: 'rgba(168,85,247,0.2)',
        icon: Building2,
        cta: 'Contact Sales',
        ctaLink: '/contact',
        features: [
            { text: 'Everything in Team', included: true },
            { text: 'Unlimited team members', included: true },
            { text: 'Self-hosted deployment', included: true },
            { text: 'Private LLM integration', included: true },
            { text: 'Dedicated vector database', included: true },
            { text: 'SSO / SAML authentication', included: true },
            { text: 'Custom data retention policies', included: true },
            { text: 'SLA guarantees (99.9% uptime)', included: true },
            { text: 'Dedicated account manager', included: true },
            { text: 'Custom AI model fine-tuning', included: true },
            { text: 'White-label options', included: true },
            { text: 'On-site training & setup', included: true },
            { text: 'Audit logs & compliance', included: true },
            { text: 'Custom billing terms', included: true },
        ],
    },
];

const FAQ = [
    { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades take effect at the end of your billing cycle.' },
    { q: 'Is my research data private?', a: 'Absolutely. Your memory bank, knowledge graph, and research sessions are completely private. We never train on your data. Enterprise plans support self-hosted deployments for maximum control.' },
    { q: 'What payment methods are accepted?', a: 'We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay. All transactions are secured and encrypted.' },
    { q: 'What happens to my data if I downgrade?', a: 'Your data is never deleted. If you exceed free tier limits after downgrading, read access is maintained but new additions are paused until you re-upgrade or prune.' },
    { q: 'Is there a free trial for Pro?', a: 'New users get a 7-day free trial of Pro features automatically. No credit card required for the trial.' },
    { q: 'How does the memory limit work?', a: 'Each memory chunk is one saved piece of knowledge (a web page summary, a note, a conversation insight). Free tier allows 100 chunks across 3 projects. Pro and above have no limit.' },
];

export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [paying, setPaying] = useState<string | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    };

    const loadRazorpay = () => new Promise<boolean>((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    const handleUpgrade = async (plan: typeof PLANS[0]) => {
        if (!plan.priceINR || plan.priceINR === 0) return;
        setPaying(plan.id);
        try {
            const loaded = await loadRazorpay();
            if (!loaded) { showToast('Payment gateway failed to load. Please try again.'); return; }

            const billingKey = billingCycle === 'annual' ? 'annual' : 'monthly';

            // Step 1: Create order server-side
            const orderRes = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id, billingCycle: billingKey }),
            });

            if (!orderRes.ok) {
                const err = await orderRes.json().catch(() => ({}));
                showToast(err.error || 'Could not create order. Please try again.');
                return;
            }

            const { orderId, amount, currency, key } = await orderRes.json();

            // Step 2: Open Razorpay checkout with real order_id
            const options: RazorpayOptions = {
                key: key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                amount,
                currency,
                name: 'Claribb.AI',
                description: `${plan.name} Plan — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
                image: '/favicon.svg',
                order_id: orderId,
                handler: async (response) => {
                    // Step 3: Verify payment signature server-side
                    try {
                        const verifyRes = await fetch('/api/payments/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: plan.id,
                                billingCycle: billingKey,
                            }),
                        });
                        if (verifyRes.ok) {
                            showToast(`✅ Payment successful! Welcome to ${plan.name} plan.`);
                        } else {
                            const errData = await verifyRes.json().catch(() => ({}));
                            showToast(`Payment received but verification failed: ${errData.error || 'Please contact support.'}`);
                        }
                    } catch {
                        showToast('Payment received. Please refresh to see your updated plan.');
                    }
                },
                prefill: {},
                theme: { color: plan.color },
                modal: {
                    ondismiss: () => setPaying(null),
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch {
            showToast('Something went wrong. Please try again.');
        } finally {
            setPaying(null);
        }
    };

    const annualDiscount = (price: number) => Math.round(price * 10 * 0.83); // 17% off

    return (
        <div style={{ background: '#08080a', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            {/* Nav */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                background: 'rgba(8,8,10,0.92)', backdropFilter: 'blur(18px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <Brain size={18} style={{ color: '#E83E8C' }} />
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>Claribb.AI</span>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <Link href="/" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Home</Link>
                        <Link href="/contact" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Contact</Link>
                        <Link href="/auth" style={{
                            fontSize: 13.5, fontWeight: 500, color: '#fff',
                            background: '#E83E8C', padding: '6px 16px', borderRadius: 8, textDecoration: 'none',
                        }}>Get started</Link>
                    </div>
                </div>
            </nav>

            <div style={{ paddingTop: 80 }}>
                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
                        borderRadius: 100, border: '1px solid rgba(232,62,140,0.3)',
                        background: 'rgba(232,62,140,0.08)', marginBottom: 20,
                    }}>
                        <Star size={11} style={{ color: '#E83E8C' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#E83E8C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Simple, Transparent Pricing</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.08, margin: '0 0 16px' }}>
                        Research intelligence,<br />
                        <span style={{ background: 'linear-gradient(135deg, #E83E8C, #A78BD4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            priced for everyone
                        </span>
                    </h1>
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
                        Start free. Upgrade when you're ready. No hidden fees, no surprise charges.
                    </p>

                    {/* Billing toggle */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 0,
                        background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.08)', padding: 3,
                    }}>
                        {(['monthly', 'annual'] as const).map(c => (
                            <button key={c} onClick={() => setBillingCycle(c)}
                                style={{
                                    padding: '7px 20px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                    background: billingCycle === c ? '#fff' : 'transparent',
                                    color: billingCycle === c ? '#09090b' : 'rgba(255,255,255,0.45)',
                                }}>
                                {c === 'monthly' ? 'Monthly' : 'Annual'}
                                {c === 'annual' && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: billingCycle === 'annual' ? '#16a34a' : '#6ee7b7', background: billingCycle === 'annual' ? 'rgba(22,163,74,0.12)' : 'rgba(110,231,183,0.12)', padding: '2px 6px', borderRadius: 4 }}>-17%</span>}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Pricing Cards */}
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
                    {PLANS.map((plan, i) => {
                        const Icon = plan.icon;
                        const isPaying = paying === plan.id;
                        return (
                            <motion.div key={plan.id}
                                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                style={{
                                    border: `1px solid ${plan.popular ? plan.color : plan.colorBorder}`,
                                    borderRadius: 20,
                                    background: plan.popular ? `linear-gradient(160deg, ${plan.colorBg}, rgba(8,8,10,0.9))` : 'rgba(255,255,255,0.02)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: plan.popular ? `0 0 60px ${plan.color}20` : 'none',
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                {plan.popular && (
                                    <div style={{
                                        position: 'absolute', top: 16, right: 16,
                                        background: plan.color, color: '#fff', fontSize: 10,
                                        fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em',
                                    }}>MOST POPULAR</div>
                                )}

                                {/* Card Header */}
                                <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: `${plan.color}18`, border: `1px solid ${plan.color}35`,
                                        }}>
                                            <Icon size={17} style={{ color: plan.color }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: plan.color, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>TIER {plan.tier}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{plan.name}</div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div style={{ marginBottom: 8 }}>
                                        {plan.price === null ? (
                                            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>Custom</div>
                                        ) : plan.price === 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                                <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>₹0</span>
                                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>/mo</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                                    <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>
                                                        ₹{billingCycle === 'annual' ? Math.round(annualDiscount(plan.priceINR!) / 12) : plan.priceINR}
                                                    </span>
                                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>/mo</span>
                                                </div>
                                                {billingCycle === 'annual' && (
                                                    <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 3 }}>
                                                        ₹{annualDiscount(plan.priceINR!)} billed annually · 2 months free
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>{plan.description}</p>
                                </div>

                                {/* Features */}
                                <div style={{ padding: '20px 28px', flex: 1 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                                        What&apos;s included
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                        {plan.features.map((f, fi) => (
                                            <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, opacity: f.included ? 1 : 0.35 }}>
                                                <div style={{
                                                    width: 16, height: 16, borderRadius: 5, flexShrink: 0, marginTop: 1,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: f.included ? `${plan.color}20` : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${f.included ? plan.color + '40' : 'rgba(255,255,255,0.08)'}`,
                                                }}>
                                                    {f.included
                                                        ? <Check size={9} style={{ color: plan.color }} strokeWidth={3} />
                                                        : <X size={9} style={{ color: 'rgba(255,255,255,0.3)' }} strokeWidth={2.5} />
                                                    }
                                                </div>
                                                <span style={{ fontSize: 12.5, color: f.included ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{f.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* CTA */}
                                <div style={{ padding: '0 28px 28px' }}>
                                    {plan.ctaLink ? (
                                        <Link href={plan.ctaLink} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                                            textDecoration: 'none', transition: 'all 0.2s',
                                            background: (plan as { popular?: boolean }).popular ? plan.color : 'transparent',
                                            color: (plan as { popular?: boolean }).popular ? '#fff' : plan.color,
                                            border: `1px solid ${(plan as { popular?: boolean }).popular ? 'transparent' : plan.color + '60'}`,
                                        }}>
                                            {plan.cta} <ArrowRight size={14} />
                                        </Link>
                                    ) : (
                                        <button onClick={() => handleUpgrade(plan)} disabled={isPaying}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                                                border: 'none', cursor: isPaying ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                                background: plan.popular ? plan.color : 'transparent',
                                                color: plan.popular ? '#fff' : plan.color,
                                                outline: plan.popular ? 'none' : `1px solid ${plan.color}60`,
                                                opacity: isPaying ? 0.7 : 1,
                                            }}>
                                            {isPaying ? 'Processing…' : <>{plan.cta} <ArrowRight size={14} /></>}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Trust bar */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                        {[
                            { icon: '🔒', text: 'Secured by Razorpay' },
                            { icon: '🔄', text: 'Cancel anytime' },
                            { icon: '🇮🇳', text: 'GST compliant invoices' },
                            { icon: '🌐', text: 'Also billed in USD' },
                        ].map(({ icon, text }) => (
                            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                                <span>{icon}</span>
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Compare section */}
                <div style={{ maxWidth: 900, margin: '80px auto', padding: '0 24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
                            Every plan runs all 5 agents
                        </h2>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            Recall · Explorer · Critique · Connector · Conflict Detector
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        {[
                            { name: 'Recall Agent', desc: 'Semantic memory search across all your sessions', color: '#6366f1' },
                            { name: 'Explorer Agent', desc: 'Live web research when memory has gaps', color: '#06b6d4' },
                            { name: 'Critique Agent', desc: "Devil's advocate — surfaces your blind spots", color: '#f59e0b' },
                            { name: 'Connector Agent', desc: 'Cross-topic pattern discovery', color: '#10b981' },
                            { name: 'Conflict Detector', desc: 'Catches contradictions in your knowledge base', color: '#f43f5e' },
                        ].map((a) => (
                            <div key={a.name} style={{
                                padding: '18px 20px', borderRadius: 14,
                                background: `${a.color}08`, border: `1px solid ${a.color}25`,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: a.color, marginBottom: 5 }}>{a.name}</div>
                                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{a.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px' }}>
                    <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.03em', marginBottom: 40 }}>
                        Frequently asked
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {FAQ.map((item, i) => (
                            <div key={i} style={{
                                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
                                background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
                            }}>
                                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    style={{
                                        width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                                    }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{item.q}</span>
                                    <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }} />
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                            <div style={{ padding: '0 20px 18px', fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{item.a}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Bottom */}
                <div style={{ textAlign: 'center', padding: '0 24px 80px' }}>
                    <div style={{
                        maxWidth: 600, margin: '0 auto', padding: '48px 40px', borderRadius: 24,
                        background: 'linear-gradient(135deg, rgba(232,62,140,0.08), rgba(167,139,212,0.06))',
                        border: '1px solid rgba(232,62,140,0.2)',
                    }}>
                        <h3 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 10px' }}>Still deciding?</h3>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px', lineHeight: 1.6 }}>
                            Start free — upgrade whenever you hit a wall. Our team is happy to help you find the right plan.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link href="/auth" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                                background: '#E83E8C', color: '#fff', textDecoration: 'none',
                            }}>
                                Start for free <ArrowRight size={14} />
                            </Link>
                            <Link href="/contact" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
                            }}>
                                Talk to us
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Brain size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Claribb.AI © 2026 — Multi-Agent Research Intelligence</span>
                    </div>
                </footer>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
                            background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                            padding: '12px 24px', borderRadius: 12, fontSize: 13.5, maxWidth: 480,
                            textAlign: 'center', zIndex: 100, boxShadow: '0 4px 40px rgba(0,0,0,0.5)',
                        }}>
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
