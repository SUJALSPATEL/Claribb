'use client';

import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { Brain, ArrowRight, Network, Shield, Search, Send, X, ChevronDown, Database, GitBranch, TrendingUp, Zap, Lightbulb, Activity, Cpu, Sparkles, Copy, Check, AlertTriangle } from 'lucide-react';

/* ── SSR-safe mount guard ───────────────────
   Prevents hydration mismatch for browser-only components.
   Returns false on server, true only after first client paint. */
function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return mounted;
}

/* ── Typewriter ──────────────────────────── */
function useTypewriter(words: string[], speed = 48, pause = 2200) {
    const [text, setText] = useState('');
    const [wi, setWi] = useState(0);
    const [del, setDel] = useState(false);
    useEffect(() => {
        const cur = words[wi];
        let t: ReturnType<typeof setTimeout>;
        if (!del && text === cur) t = setTimeout(() => setDel(true), pause);
        else if (del && text === '') { setDel(false); setWi(i => (i + 1) % words.length); }
        else t = setTimeout(() => setText(del ? cur.slice(0, text.length - 1) : cur.slice(0, text.length + 1)), del ? 26 : speed);
        return () => clearTimeout(t);
    }, [text, wi, del, words, speed, pause]);
    return text;
}

/* ── Scroll-progress line ────────────────── */
function ScrollBar() {
    const mounted = useMounted();
    const { scrollYProgress } = useScroll();
    /* Don't render on server — scaleX MotionValue causes style mismatch */
    if (!mounted) return null;
    return <motion.div className="fixed top-0 left-0 right-0 z-[100] origin-left" style={{ height: 1.5, scaleX: scrollYProgress, background: '#E83E8C' }} />;
}

/* ── Fade-up wrapper ─────────────────────── */
function FadeUp({ children, className = '', delay = 0, id = '' }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
    const ref = useRef(null);
    const vis = useInView(ref, { once: true, margin: '-40px' });
    return (
        <motion.div id={id} ref={ref} initial={{ opacity: 0, y: 12 }} animate={vis ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.38, delay, ease: [0.22, 0.61, 0.36, 1] }} className={className}>
            {children}
        </motion.div>
    );
}

/* ── Eyebrow pill ────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.1em] uppercase mb-5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#A1A1AA' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E83E8C' }} />
            {children}
        </div>
    );
}

/* ── Hero grid — mouse-parallax ───────────────── */
function HeroGrid() {
    const mounted = useMounted();
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const gx = useSpring(mx, { stiffness: 40, damping: 20 });
    const gy = useSpring(my, { stiffness: 40, damping: 20 });
    const onMove = useCallback((e: MouseEvent) => {
        mx.set((e.clientX / window.innerWidth - 0.5) * 16);
        my.set((e.clientY / window.innerHeight - 0.5) * 10);
    }, [mx, my]);
    useEffect(() => {
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [onMove]);
    /* Don't render on server — avoids SSR/CSR window mismatch */
    if (!mounted) return null;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div className="absolute inset-[-8%]" style={{ x: gx, y: gy }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)`,
                    backgroundSize: '64px 64px',
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 42%, black 58%, transparent 100%)',
                }} />
            </motion.div>
        </div>
    );
}

/* ── Section divider grid ────────────────── */
function SGrid() {
    return (
        <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.072) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.072) 1px,transparent 1px)`,
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(ellipse 86% 78% at 50% 50%, black 22%, transparent 82%)',
        }} />
    );
}

/* ── Animated counter ────────────────────── */
function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const ref = useRef(null);
    const vis = useInView(ref, { once: true });
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!vis) return;
        let s = 0;
        const t = setInterval(() => { s = Math.min(s + target / 45, target); setN(Math.floor(s)); if (s >= target) clearInterval(t); }, 35);
        return () => clearInterval(t);
    }, [vis, target]);
    return <span ref={ref}>{n}{suffix}</span>;
}

/* ── Neural diagram ────────────────────────── */
function NeuralDiagram() {
    const mounted = useMounted();
    const nodes = [
        { x: 55, y: 140, r: 4 }, { x: 55, y: 215, r: 3 }, { x: 55, y: 290, r: 4 },
        { x: 175, y: 95, r: 5 }, { x: 175, y: 190, r: 4 }, { x: 175, y: 280, r: 3 }, { x: 175, y: 355, r: 4 },
        { x: 305, y: 128, r: 7 }, { x: 305, y: 240, r: 5 }, { x: 305, y: 340, r: 4 },
        { x: 425, y: 175, r: 5 }, { x: 425, y: 290, r: 6 },
        { x: 520, y: 232, r: 11 },
    ];
    const edges = [[0, 3], [0, 4], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [2, 6], [3, 7], [3, 8], [4, 7], [4, 8], [4, 9], [5, 8], [5, 9], [6, 9], [7, 10], [7, 11], [8, 10], [8, 11], [9, 11], [10, 12], [11, 12]];
    /* Don't render on server — framer-motion SVG cx/cy animate causes hydration mismatch */
    if (!mounted) return <svg viewBox="0 0 580 450" className="w-full h-full" />;
    return (
        <svg viewBox="0 0 580 450" className="w-full h-full">
            <defs>
                <radialGradient id="nd1"><stop offset="0%" stopColor="#fff" stopOpacity="0.55" /><stop offset="100%" stopColor="#fff" stopOpacity="0.04" /></radialGradient>
                <radialGradient id="nd2"><stop offset="0%" stopColor="#E83E8C" stopOpacity="0.85" /><stop offset="100%" stopColor="#fff" stopOpacity="0.06" /></radialGradient>
                <filter id="ndf"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {edges.map(([a, b], i) => (
                <motion.line key={`e${i}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                    stroke="rgba(255,255,255,0.035)" strokeWidth="1"
                    animate={{ opacity: [0.02, 0.1, 0.02] }} transition={{ duration: 2.8 + i * 0.08, delay: i * 0.04, repeat: Infinity }} />
            ))}
            {/* Particles — each travels its full path to node 12 (the big pink ball) */}
            {[
                { pts: [nodes[0], nodes[3], nodes[7], nodes[10], nodes[12]], delay: 0 },
                { pts: [nodes[1], nodes[4], nodes[8], nodes[11], nodes[12]], delay: 0.45 },
                { pts: [nodes[2], nodes[5], nodes[9], nodes[11], nodes[12]], delay: 0.9 },
                { pts: [nodes[0], nodes[4], nodes[8], nodes[10], nodes[12]], delay: 1.35 },
                { pts: [nodes[2], nodes[6], nodes[9], nodes[11], nodes[12]], delay: 1.8 },
                { pts: [nodes[1], nodes[3], nodes[7], nodes[11], nodes[12]], delay: 2.25 },
                // second wave — slightly different paths
                { pts: [nodes[0], nodes[3], nodes[8], nodes[10], nodes[12]], delay: 0.22 },
                { pts: [nodes[2], nodes[4], nodes[7], nodes[11], nodes[12]], delay: 0.67 },
                { pts: [nodes[1], nodes[5], nodes[8], nodes[10], nodes[12]], delay: 1.12 },
                { pts: [nodes[0], nodes[4], nodes[9], nodes[11], nodes[12]], delay: 1.57 },
                { pts: [nodes[2], nodes[5], nodes[8], nodes[11], nodes[12]], delay: 2.02 },
                { pts: [nodes[1], nodes[4], nodes[7], nodes[10], nodes[12]], delay: 2.47 },
            ].map(({ pts, delay }, pi) => {
                const seg = pts.length - 1;
                const dur = `${seg * 1.4}s`;
                const begin = `${delay.toFixed(2)}s`;
                // Build semicolon-joined keyframe values at equal intervals
                const cxVals = pts.map(p => p.x).join(';');
                const cyVals = pts.map(p => p.y).join(';');
                // opacity: 0 → 1 (after first 5%) → 1 (until last 8%) → 0
                const nPts = pts.length;
                const opVals = pts.map((_, i) => i === 0 ? 0 : i === 1 ? 1 : i === nPts - 1 ? 0 : 1).join(';');
                return (
                    <circle key={`p${pi}`} r="2.5" fill="#E83E8C" filter="url(#ndf)">
                        <animate attributeName="cx" calcMode="linear"
                            values={cxVals} dur={dur} begin={begin} repeatCount="indefinite" />
                        <animate attributeName="cy" calcMode="linear"
                            values={cyVals} dur={dur} begin={begin} repeatCount="indefinite" />
                        <animate attributeName="opacity" calcMode="linear"
                            values={opVals} dur={dur} begin={begin} repeatCount="indefinite" />
                    </circle>
                );
            })}
            {nodes.map((nd, i) => (
                <motion.circle key={`n${i}`} cx={nd.x} cy={nd.y} r={nd.r}
                    fill={i === 12 ? 'url(#nd2)' : 'url(#nd1)'} filter="url(#ndf)"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2.4 + i * 0.06, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: `${nd.x}px ${nd.y}px` }} />
            ))}
        </svg>
    );
}

/* ── Agent spread cards — scroll driven ───── */
function AgentSpreadCards() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 0.9', 'start 0.15'],   // animation plays as top of cards goes from 90%→15% of viewport
    });

    // Each card starts "stacked" on card 0:
    // Card 1: x = -100% of own width → 0  (slides right to its natural col)
    // Card 2: x = -200%              → 0
    // Card 3: x = -300%              → 0
    const x1 = useTransform(scrollYProgress, [0, 1], ['-100%', '0%']);
    const x2 = useTransform(scrollYProgress, [0, 1], ['-200%', '0%']);
    const x3 = useTransform(scrollYProgress, [0, 1], ['-300%', '0%']);
    // Stagger opacity so cards reveal in sequence
    const op1 = useTransform(scrollYProgress, [0, 0.3, 0.65], [0, 0, 1]);
    const op2 = useTransform(scrollYProgress, [0, 0.45, 0.78], [0, 0, 1]);
    const op3 = useTransform(scrollYProgress, [0, 0.58, 0.9], [0, 0, 1]);
    // Card 0 also fades in (from a slight y)
    const op0 = useTransform(scrollYProgress, [0, 0.15, 0.4], [0, 0, 1]);

    const BD = 'rgba(255,255,255,0.06)';

    type AgCard = typeof AGENTS[0];
    const Card = ({ ag, style }: { ag: AgCard; style?: React.CSSProperties }) => {
        const Icon = ag.icon;
        return (
            <div className="relative p-7 cursor-default h-full"
                style={{
                    background: '#08080a',
                    ...style,
                }}>
                <div className="absolute top-4 right-5 text-[26px] font-black select-none"
                    style={{ color: 'rgba(255,255,255,0.03)' }}>{ag.n}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BD}` }}>
                    <Icon style={{ color: ag.accentIcon, width: 18, height: 18 }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.015em' }}>{ag.name} Agent</h3>
                <p style={{ fontSize: 13, lineHeight: 1.72, color: '#71717A', marginBottom: 20 }}>{ag.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ag.tags.map(t => (
                        <span key={t} style={{ fontSize: 10.5, padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: '#52525B', border: `1px solid ${BD}` }}>{t}</span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div ref={ref} style={{ border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Mobile: plain stacked fade-in */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2">
                {AGENTS.map((ag, i) => (
                    <motion.div key={ag.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        style={{ borderBottom: i < 3 ? `1px solid ${BD}` : 'none' }}>
                        <Card ag={ag} />
                    </motion.div>
                ))}
            </div>
            {/* Desktop: scroll-driven spread */}
            <div className="hidden lg:grid grid-cols-4" style={{ overflow: 'hidden' }}>
                <motion.div style={{ opacity: op0, borderRight: `1px solid ${BD}` }}>
                    <Card ag={AGENTS[0]} />
                </motion.div>
                <motion.div style={{ x: x1, opacity: op1, borderRight: `1px solid ${BD}` }}>
                    <Card ag={AGENTS[1]} />
                </motion.div>
                <motion.div style={{ x: x2, opacity: op2, borderRight: `1px solid ${BD}` }}>
                    <Card ag={AGENTS[2]} />
                </motion.div>
                <motion.div style={{ x: x3, opacity: op3 }}>
                    <Card ag={AGENTS[3]} />
                </motion.div>
            </div>
        </div>
    );
}

/* ── Competitive Landscape ─────────────────── */
const COMPETITORS = ['Claribb.AI', 'ChatGPT', 'Perplexity', 'Notion AI', 'Obsidian+AI'];
const COMP_HEADER_COLORS = ['#E83E8C', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.5)'];

type CellValue = { icon: '✅' | '❌' | '⚠️'; note?: string };
interface CompRow { feature: string; sub?: string; cells: CellValue[] }

const COMP_ROWS: CompRow[] = [
    {
        feature: 'Persistent memory across sessions',
        cells: [
            { icon: '✅', note: 'Always' },
            { icon: '⚠️', note: 'Paid, limited' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '⚠️', note: 'Manual' },
        ],
    },
    {
        feature: 'Multi-agent parallel reasoning',
        cells: [
            { icon: '✅', note: '5 agents' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
        ],
    },
    {
        feature: 'Semantic memory search (RAG)',
        cells: [
            { icon: '✅', note: 'pgvector' },
            { icon: '❌' },
            { icon: '⚠️', note: 'Web only' },
            { icon: '❌' },
            { icon: '⚠️', note: 'Plugin' },
        ],
    },
    {
        feature: 'Auto knowledge graph',
        cells: [
            { icon: '✅' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '⚠️', note: 'Manual' },
        ],
    },
    {
        feature: 'Conflict detection & steel manning',
        cells: [
            { icon: '✅' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
        ],
    },
    {
        feature: 'Belief evolution tracking',
        cells: [
            { icon: '✅' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
        ],
    },
    {
        feature: 'Research trajectory prediction',
        cells: [
            { icon: '✅' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
        ],
    },
    {
        feature: '100% free-tier AI stack',
        cells: [
            { icon: '✅' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
            { icon: '❌' },
        ],
    },
];

function CompetitiveLandscape() {
    const ref = useRef(null);
    const vis = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section ref={ref} className="relative py-28 overflow-hidden" style={{ background: '#000' }}>
            <div className="relative z-10 max-w-screen-xl mx-auto px-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={vis ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-14">
                    <Eyebrow>Competitive Landscape</Eyebrow>
                    <h2 style={{ fontSize: 'clamp(36px,5vw,54px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 14 }}>
                        Claribb.AI occupies a category<br />
                        <em style={{ color: '#E83E8C', fontStyle: 'italic' }}>no competitor has entered</em>
                    </h2>
                    <p style={{ fontSize: 15, fontWeight: 300, maxWidth: 560, margin: '0 auto', color: C.sec, lineHeight: 1.7 }}>
                        <strong style={{ color: '#fff', fontWeight: 500 }}>Personal Research Intelligence</strong> — not a search engine, not a chatbot, not a note-taking app.
                    </p>
                </motion.div>

                {/* Table */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={vis ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.15 }}
                    style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                        {/* Header */}
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{
                                    padding: '16px 24px', textAlign: 'left', fontSize: 12,
                                    fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em',
                                    textTransform: 'uppercase', background: 'rgba(255,255,255,0.02)', width: '34%',
                                }}>Feature</th>
                                {COMPETITORS.map((c, i) => (
                                    <th key={c} style={{
                                        padding: '16px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700,
                                        color: COMP_HEADER_COLORS[i],
                                        background: i === 0 ? 'rgba(232,62,140,0.06)' : 'rgba(255,255,255,0.02)',
                                        borderLeft: i === 0 ? '1px solid rgba(232,62,140,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                        borderRight: i === 0 ? '1px solid rgba(232,62,140,0.2)' : 'none',
                                        position: 'relative',
                                    }}>
                                        {i === 0 && (
                                            <div style={{
                                                position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                                                background: '#E83E8C', color: '#fff', fontSize: 9, fontWeight: 800,
                                                padding: '2px 10px', borderRadius: '0 0 8px 8px', letterSpacing: '0.08em',
                                            }}>US</div>
                                        )}
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {COMP_ROWS.map((row, ri) => (
                                <tr key={ri} style={{
                                    borderBottom: ri < COMP_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    background: ri % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                                }}>
                                    {/* Feature name */}
                                    <td style={{ padding: '14px 24px', fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                                        {row.feature}
                                        {row.sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{row.sub}</div>}
                                    </td>
                                    {/* Cells */}
                                    {row.cells.map((cell, ci) => (
                                        <td key={ci} style={{
                                            padding: '14px 16px', textAlign: 'center',
                                            background: ci === 0 ? 'rgba(232,62,140,0.04)' : 'transparent',
                                            borderLeft: ci === 0 ? '1px solid rgba(232,62,140,0.15)' : '1px solid rgba(255,255,255,0.04)',
                                            borderRight: ci === 0 ? '1px solid rgba(232,62,140,0.15)' : 'none',
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                <span style={{ fontSize: 16 }}>{cell.icon}</span>
                                                {cell.note && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 500,
                                                        color: ci === 0 ? '#E83E8C' : 'rgba(255,255,255,0.35)',
                                                        letterSpacing: '0.02em',
                                                    }}>{cell.note}</span>
                                                )}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>

                {/* Footnote */}
                <motion.div initial={{ opacity: 0 }} animate={vis ? { opacity: 1 } : {}} transition={{ delay: 0.4, duration: 0.5 }}
                    style={{
                        marginTop: 24, padding: '16px 24px', borderRadius: 12,
                        background: 'rgba(167,139,212,0.06)', border: '1px solid rgba(167,139,212,0.18)',
                    }}>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>
                        💡 The closest alternative would be <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Perplexity + Notion AI + a PhD advisor with perfect recall</strong> — combined into one product. Claribb.AI does all three, without the cost or complexity.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}

/* ── FAQ Section ──────────────────────────── */
const FAQ_ITEMS = [
    {
        q: 'How does CLARIBB remember across sessions?',
        a: 'Every note, query, and response is embedded via pgvector and stored in your persistent memory graph. When you return weeks later, CLARIBB instantly surfaces the most relevant context — no manual tagging, no re-explaining yourself.',
        tags: ['pgvector', 'semantic memory', 'persistent context', 'embeddings'],
    },
    {
        q: 'What are the 5 agents and what do they each do?',
        a: 'Recall searches your memory graph for relevant past context. Explorer crawls live web sources to fill knowledge gaps. Critique acts as devil\'s advocate — surfacing counterarguments and weak assumptions. Connector finds non-obvious links between concepts across your entire research history. Conflict Detector spots contradictions between your stored memories and new incoming findings.',
        tags: ['Recall', 'Explorer', 'Critique', 'Connector', 'Conflict Detector', 'multi-agent'],
    },
    {
        q: 'Which AI models power CLARIBB?',
        a: 'CLARIBB is model-agnostic. It currently runs on Groq (for low-latency inference), with support for OpenAI and Cohere. The memory and orchestration layer is fully independent of the underlying LLM.',
        tags: ['Groq', 'OpenAI', 'Cohere', 'model-agnostic'],
    },
    {
        q: 'How is this different from ChatGPT or Perplexity?',
        a: 'ChatGPT resets after every conversation. Perplexity searches the web but forgets you exist. CLARIBB builds a compounding knowledge model from your research history — every session makes the system smarter, not just the output.',
        tags: ['persistent memory', 'knowledge compounding', 'differentiator'],
    },
    {
        q: 'Is my research data private and secure?',
        a: 'Your memory graph and research history are stored privately per user account. We do not train on your data or share it with third parties. Enterprise plans include dedicated isolated storage.',
        tags: ['privacy', 'data security', 'enterprise', 'isolation'],
    },
    {
        q: 'Can I use CLARIBB for team or collaborative research?',
        a: 'Currently CLARIBB is optimised for individual researchers with their own persistent memory graph. Team workspaces with shared knowledge graphs are on the roadmap for Q3 2026.',
        tags: ['individual', 'team', 'roadmap', 'collaboration'],
    },
];

function FAQSection() {
    const [open, setOpen] = useState<number | null>(0);
    return (
        <section className="relative py-28 overflow-hidden" style={{ background: C.black }}>
            <div className="relative z-10 max-w-screen-xl mx-auto px-8">
                {/* Big heading + items layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-16">
                    {/* Left — heading */}
                    <FadeUp>
                        <div className="lg:sticky" style={{ top: 120 }}>
                            <Eyebrow>FAQ</Eyebrow>
                            <h2 style={{ fontSize: 'clamp(52px,7vw,84px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 12 }}>
                                FAQ
                            </h2>
                            <p style={{ fontSize: 14, color: C.muted, marginTop: 16, lineHeight: 1.7, maxWidth: 220 }}>
                                Everything you need to know about CLARIBB.
                            </p>
                        </div>
                    </FadeUp>
                    {/* Right — accordion */}
                    <div>
                        {FAQ_ITEMS.map((item, i) => {
                            const isOpen = open === i;
                            return (
                                <FadeUp key={i} delay={i * 0.04}>
                                    <div style={{ borderBottom: `1px solid ${C.border}` }}>
                                        <button
                                            className="w-full flex items-center justify-between text-left py-6 gap-6 group"
                                            onClick={() => setOpen(isOpen ? null : i)}
                                        >
                                            <div className="flex items-center gap-5">
                                                {/* Number */}
                                                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#A78BD4', letterSpacing: '0.04em', flexShrink: 0 }}>
                                                    ({String(i + 1).padStart(3, '0')})
                                                </span>
                                                {/* Question */}
                                                <span style={{ fontSize: 17, fontWeight: 500, color: isOpen ? C.text : '#A0A0A0', letterSpacing: '-0.015em', transition: 'color 0.25s' }}>
                                                    {item.q}
                                                </span>
                                            </div>
                                            {/* Toggle icon */}
                                            <span style={{ color: isOpen ? '#A78BD4' : '#52525B', fontSize: 20, flexShrink: 0, transition: 'color 0.25s' }}>
                                                {isOpen ? '−' : '+'}
                                            </span>
                                        </button>
                                        {/* Answer */}
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    key="ans"
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div style={{ paddingBottom: 24, paddingLeft: 68 }}>
                                                        <p style={{ fontSize: 14, lineHeight: 1.78, color: C.sec, marginBottom: 16 }}>{item.a}</p>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {item.tags.map(t => (
                                                                <span key={t} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 999, background: 'rgba(167,139,212,0.07)', color: '#A78BD4', border: '1px solid rgba(167,139,212,0.18)' }}>{t}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </FadeUp>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── Pipeline flow animation ─────────────── */
const PIPELINE_STEPS = [
    { n: '01', icon: Cpu, title: 'Query arrives', desc: 'Intent understood. Context from every past session loaded instantly.', color: '#A78BD4' },
    { n: '02', icon: Activity, title: '5 agents activate', desc: 'Recall, Explorer, Critique, Connector, Conflict Detector — all run in parallel.', color: '#72B8CC' },
    { n: '03', icon: GitBranch, title: 'Synthesis happens', desc: 'Results merge. Memory graph updates. New relationships extracted.', color: '#C47AA0' },
    { n: '04', icon: Sparkles, title: 'Deep answer', desc: 'Response grounded in your full history. Knowledge compounds.', color: '#9BBFA8' },
];

function PipelineFlow() {
    const ref = useRef(null);
    const vis = useInView(ref, { once: false, margin: '-60px' });
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        if (!vis) return;
        const t = setInterval(() => setActiveStep(s => (s + 1) % 4), 850);
        return () => clearInterval(t);
    }, [vis]);

    const dotPct = activeStep === 0 ? 0 : activeStep === 1 ? 33.3 : activeStep === 2 ? 66.6 : 100;

    return (
        <div ref={ref} className="relative">
            {/* Connector track */}
            <div className="hidden lg:block absolute" style={{ top: 50, left: '12.5%', right: '12.5%', height: 1, background: 'rgba(255,255,255,0.08)' }}>
                {/* Traveling dot — larger, glowing */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: 10, height: 10, top: -4.5,
                        background: PIPELINE_STEPS[activeStep].color,
                        boxShadow: `0 0 10px 3px ${PIPELINE_STEPS[activeStep].color}70`,
                    }}
                    animate={{ left: `${dotPct}%` }}
                    transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {PIPELINE_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = activeStep === i;
                    return (
                        <motion.div key={`s${i}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center">
                            {/* Icon box — bright active glow */}
                            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-5 relative"
                                style={{
                                    background: isActive ? `${s.color}1A` : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isActive ? s.color + '60' : 'rgba(255,255,255,0.07)'}`,
                                    boxShadow: isActive ? `0 0 22px 0 ${s.color}25` : 'none',
                                    transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
                                }}>
                                <Icon style={{ width: 34, height: 34, color: isActive ? s.color : '#3F3F46', transition: 'color 0.3s' }} />
                                <div className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{
                                        background: '#040404',
                                        color: isActive ? s.color : '#3F3F46',
                                        border: `1px solid ${isActive ? s.color + '70' : 'rgba(255,255,255,0.07)'}`,
                                        transition: 'color 0.3s, border-color 0.3s',
                                    }}>{s.n}</div>
                            </div>
                            <h3 className="font-semibold text-[15px] mb-2"
                                style={{ color: isActive ? '#FFFFFF' : '#71717A', transition: 'color 0.45s' }}>
                                {s.title}
                            </h3>
                            <p className="text-[13px] leading-relaxed"
                                style={{ color: isActive ? '#52525B' : '#3F3F46', transition: 'color 0.45s' }}>
                                {s.desc}
                            </p>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

/* Dracula syntax palette — softened / desaturated */
const SYN: Record<string, string> = {
    k: '#A78BD4', // keywords — muted violet (was #BD93F9)
    m: '#72B8CC', // module names — muted teal-blue (was #8BE9FD)
    n: '#C8C8C0', // identifiers — off-white (was #F8F8F2)
    s: '#6BAF7E', // strings — muted sage green (was #50FA7B)
    c: '#555E7A', // comments — dark slate (was #6272A4)
    f: '#C49A5A', // function names — muted amber (was #FFB86C)
    p: '#C47AA0', // properties — muted rose (was #FF79C6)
    d: '#B8B8B2', // default / operators — soft gray-white
};

/* Per-language code definitions */
const LANG_CODE: Record<string, Array<{ t: string; v: string }[]>> = {
    python: [
        [{ t: 'k', v: 'from ' }, { t: 'm', v: 'claribb' }, { t: 'k', v: ' import ' }, { t: 'f', v: 'CLARIBB' }],
        [],
        [{ t: 'c', v: '# research with compounding memory' }],
        [],
        [{ t: 'n', v: 'client' }, { t: 'd', v: ' = ' }, { t: 'f', v: 'CLARIBB' }, { t: 'd', v: '(' }],
        [{ t: 'd', v: '    ' }, { t: 'p', v: 'memory' }, { t: 'd', v: '=' }, { t: 's', v: '"persistent"' }, { t: 'd', v: ',' }],
        [{ t: 'd', v: '    ' }, { t: 'p', v: 'agents' }, { t: 'd', v: '=' }, { t: 's', v: '"all"' }],
        [{ t: 'd', v: ')' }],
    ],
    node: [
        [{ t: 'k', v: 'import ' }, { t: 'm', v: 'CLARIBB' }, { t: 'k', v: ' from ' }, { t: 's', v: "'@claribb/client'" }],
        [],
        [{ t: 'c', v: '// research with compounding memory' }],
        [],
        [{ t: 'k', v: 'const ' }, { t: 'n', v: 'client' }, { t: 'd', v: ' = ' }, { t: 'k', v: 'new ' }, { t: 'f', v: 'CLARIBB' }, { t: 'd', v: '({' }],
        [{ t: 'd', v: '  ' }, { t: 'p', v: 'memory' }, { t: 'd', v: ': ' }, { t: 's', v: "'persistent'" }, { t: 'd', v: ',' }],
        [{ t: 'd', v: '  ' }, { t: 'p', v: 'agents' }, { t: 'd', v: ': ' }, { t: 's', v: "'all'" }],
        [{ t: 'd', v: '})' }],
    ],
    curl: [
        [{ t: 'f', v: 'curl ' }, { t: 'd', v: '-X ' }, { t: 's', v: 'POST' }, { t: 'd', v: ' \\' }],
        [{ t: 'd', v: '  ' }, { t: 's', v: '"https://api.claribb.ai/research"' }, { t: 'd', v: ' \\' }],
        [{ t: 'd', v: '  -H ' }, { t: 's', v: '"Authorization: Bearer $CLARIBB_KEY"' }, { t: 'd', v: ' \\' }],
        [{ t: 'd', v: '  -H ' }, { t: 's', v: '"Content-Type: application/json"' }, { t: 'd', v: ' \\' }],
        [{ t: 'd', v: '  -d ' }, { t: 'd', v: "'" }, { t: 'd', v: '{' }],
        [{ t: 'd', v: '    ' }, { t: 'p', v: '"memory"' }, { t: 'd', v: ': ' }, { t: 's', v: '"persistent"' }, { t: 'd', v: ',' }],
        [{ t: 'd', v: '    ' }, { t: 'p', v: '"agents"' }, { t: 'd', v: ': ' }, { t: 's', v: '"all"' }],
        [{ t: 'd', v: "  }'" }],
    ],
};
const CLIPBOARD_CODE: Record<string, (q: string) => string> = {
    python: q => `from claribb import CLARIBB\n\nclient = CLARIBB(memory="persistent", agents="all")\n\nresponse = client.research("${q}")`,
    node: q => `import CLARIBB from '@claribb/client'\n\nconst client = new CLARIBB({ memory: 'persistent', agents: 'all' })\n\nconst response = await client.research("${q}")`,
    curl: q => `curl -X POST "https://api.claribb.ai/research" \\\n  -H "Authorization: Bearer $CLARIBB_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"memory":"persistent","agents":"all","query":"${q}"}'`,
};

function CodePanel({ query }: { query: string }) {
    const [lang, setLang] = useState<'python' | 'node' | 'curl'>('python');
    const [copied, setCopied] = useState(false);
    const code = LANG_CODE[lang];
    const copy = () => {
        navigator.clipboard.writeText(CLIPBOARD_CODE[lang](query));
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };
    const tabs: Array<{ id: 'python' | 'node' | 'curl'; label: string }> = [
        { id: 'python', label: 'Python' },
        { id: 'node', label: 'Node.js' },
        { id: 'curl', label: 'cURL' },
    ];
    const liveCallStr = lang === 'python'
        ? 'response = client.research('
        : lang === 'node' ? 'const response = await client.research(' : '';
    return (
        <div className="overflow-hidden rounded-xl" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Language tabs — left */}
                <div className="flex items-center gap-4">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setLang(tab.id)}
                            className="text-[12px] transition-colors" style={{
                                color: lang === tab.id ? '#F8F8F2' : '#4A5072',
                                fontWeight: lang === tab.id ? 600 : 400,
                                borderBottom: lang === tab.id ? '1.5px solid rgba(255,255,255,0.35)' : '1.5px solid transparent',
                                paddingBottom: 2,
                            }}>{tab.label}</button>
                    ))}
                </div>
                {/* Mac dots + copy — right */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
                    </div>
                    <button onClick={copy} className="transition-opacity hover:opacity-70" style={{ color: copied ? '#50FA7B' : '#4A5072' }}>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
            {/* Code body */}
            <div className="px-4 py-4 font-mono text-[12.5px] leading-[1.85]">
                {code.map((line, i) => (
                    <div key={`${lang}${i}`} className="empty:h-[1.85em]">
                        {line.map((seg, j) => <span key={j} style={{ color: SYN[seg.t] }}>{seg.v}</span>)}
                    </div>
                ))}
                {/* Live typewriter line (only Python + Node) */}
                {lang !== 'curl' && (
                    <div className="mt-1">
                        <span style={{ color: '#909090' }}>{liveCallStr}</span>
                        <span style={{ color: '#6BAF7E' }}>&#34;{query}</span>
                        <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.52, repeat: Infinity }} style={{ color: '#A78BD4' }}>▊</motion.span>
                        <span style={{ color: '#6BAF7E' }}>&#34;</span>
                        <span style={{ color: '#909090' }}>)</span>
                    </div>
                )}
            </div>
        </div>
    );
}


/* ── Data ────────────────────────────────── */
const AGENTS = [
    { id: 'recall', n: '01', name: 'Recall', icon: Brain, accent: 'rgba(167,139,212,0.18)', accentBorder: 'rgba(167,139,212,0.3)', accentIcon: '#A78BD4', desc: 'Semantic memory search across every session. Instant, vector-indexed retrieval from your entire research history.', tags: ['pgvector', 'cosine similarity', 'cross-session'] },
    { id: 'explorer', n: '02', name: 'Explorer', icon: Search, accent: 'rgba(114,184,204,0.15)', accentBorder: 'rgba(114,184,204,0.28)', accentIcon: '#72B8CC', desc: 'Live web research when memory has gaps. Crawls, extracts, and embeds new knowledge in real time.', tags: ['live crawling', 'auto-embed', 'gap detection'] },
    { id: 'critique', n: '03', name: 'Critique', icon: Shield, accent: 'rgba(196,122,160,0.15)', accentBorder: 'rgba(196,122,160,0.28)', accentIcon: '#C47AA0', desc: "Devil's advocate. Surfaces counterarguments, hidden assumptions, and logical weaknesses in every response.", tags: ['steelmanning', 'bias detection', 'assumption audit'] },
    { id: 'connector', n: '04', name: 'Connector', icon: Network, accent: 'rgba(196,154,90,0.14)', accentBorder: 'rgba(196,154,90,0.26)', accentIcon: '#C49A5A', desc: "Discovers non-obvious links across domains. Finds connections you didn't know you were looking for.", tags: ['cross-domain', 'serendipity', 'pattern synthesis'] },
    { id: 'conflict', n: '05', name: 'Conflict Detector', icon: AlertTriangle, accent: 'rgba(244,63,94,0.12)', accentBorder: 'rgba(244,63,94,0.28)', accentIcon: '#f43f5e', desc: 'Catches contradictions between your stored memories and new findings before they corrupt your research.', tags: ['contradiction detection', 'memory integrity', 'consistency'] },
];
const TICKER = ['semantic vector memory', '5 parallel agents', 'knowledge graph time machine', 'live chain of thought', 'steelman engine', 'belief evolution tracker', 'trajectory prediction', 'cross-project serendipity', 'conflict detection'];

/* ── Shared style constants ──────────────── */
const C = {
    black: '#000000',
    layer: '#000000',
    border: 'rgba(255,255,255,0.06)',
    borderM: 'rgba(255,255,255,0.10)',
    text: '#FFFFFF',
    sec: '#A1A1AA',
    muted: '#71717A',
    faint: '#3F3F46',
    pink: '#E83E8C',
};

/* ════════════════════════════════════════════
   PAGE
════════════════════════════════════════════ */
/* ── Demo Search Bar (persistent bottom bar) ── */
function DemoSearchBar() {
    const [query, setQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [chatCount, setChatCount] = useState(0);
    const [showGate, setShowGate] = useState(false);
    const [chatHidden, setChatHidden] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const MAX_FREE = 4;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 80);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const send = async () => {
        const q = query.trim();
        if (!q || loading) return;
        if (chatCount >= MAX_FREE) { setShowGate(true); return; }
        setQuery('');
        setChatHidden(false);
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setLoading(true);
        try {
            const res = await fetch('/api/chat-demo', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: q }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.response ?? data.error ?? 'Error' }]);
            const next = chatCount + 1;
            setChatCount(next);
            if (next >= MAX_FREE) setTimeout(() => setShowGate(true), 1800);
        } catch {
            setMessages(prev => [...prev, { role: 'ai', text: 'Network error — please try again.' }]);
        } finally { setLoading(false); }
    };

    const barBg = 'rgba(12,12,14,0.92)';
    const barBdr = 'rgba(232,62,140,0.22)';

    return (
        <>
            <AnimatePresence>
                {messages.length > 0 && !chatHidden && (
                    <div className="fixed z-[60] pointer-events-none"
                        style={{ bottom: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                            style={{ width: 'min(640px, calc(100vw - 32px))' }}>
                            {/* top boundary cap */}
                            <div className="pointer-events-none mb-1 flex items-center gap-2" style={{ opacity: 0.55 }}>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(232,62,140,0.3) 40%, rgba(232,62,140,0.3) 60%, transparent)' }} />
                                <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(232,62,140,0.7)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>CLARIBB · DEMO CHAT</span>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(232,62,140,0.3) 40%, rgba(232,62,140,0.3) 60%, transparent)' }} />
                            </div>
                            {/* scrollable messages with top fade */}
                            <div className="relative">
                                <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
                                    style={{ height: 36, background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)' }} />
                                <div ref={chatRef} className="pointer-events-auto flex flex-col gap-3 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                                    {messages.map((m, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                                            className={`text-[13.5px] leading-relaxed px-4 py-3 rounded-2xl ${m.role === 'user' ? 'self-end max-w-[80%]' : 'self-start max-w-[90%]'}`}
                                            style={{ background: m.role === 'user' ? 'rgba(167,139,212,0.18)' : 'rgba(20,20,24,0.95)', border: `1px solid ${m.role === 'user' ? 'rgba(167,139,212,0.3)' : 'rgba(255,255,255,0.07)'}`, color: m.role === 'user' ? '#D4BBFF' : '#CACACA', backdropFilter: 'blur(12px)' }}>
                                            {m.role === 'ai' && <span className="text-[10px] font-semibold tracking-widest block mb-1" style={{ color: '#A78BD4' }}>CLARIBB</span>}
                                            {m.text}
                                        </motion.div>
                                    ))}
                                    {loading && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="self-start px-4 py-3 rounded-2xl text-[13px]"
                                            style={{ background: 'rgba(20,20,24,0.95)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', color: '#A78BD4' }}>
                                            <span className="text-[10px] font-semibold tracking-widest block mb-1">CLARIBB</span>
                                            <span className="inline-flex gap-1">
                                                {[0, 1, 2].map(d => (
                                                    <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-current inline-block"
                                                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, delay: d * 0.2, repeat: Infinity }} />
                                                ))}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                            {chatCount > 0 && chatCount < MAX_FREE && (
                                <div className="flex justify-end px-1 pb-0.5">
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                                        {MAX_FREE - chatCount} free {MAX_FREE - chatCount === 1 ? 'search' : 'searches'} left
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── bottom bar ── */}
            <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
                style={{ paddingBottom: 24, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 60%, transparent)', pointerEvents: 'none' }}>
                <motion.div
                    animate={{ width: scrolled ? 280 : 640 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 32, mass: 0.8 }}
                    style={{ pointerEvents: 'auto', maxWidth: 'calc(100vw - 32px)' }}>
                    <form onSubmit={e => { e.preventDefault(); send(); }}
                        className="flex items-center gap-2 px-4 py-3.5 rounded-full"
                        style={{ background: barBg, border: `1px solid ${barBdr}`, backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', outline: 'none' }}>
                        <Search className="shrink-0" style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
                        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                            placeholder={scrolled ? 'Try CLARIBB...' : 'Ask anything — CLARIBB remembers your research...'}
                            className="flex-1 bg-transparent outline-none ring-0 focus:outline-none focus:ring-0 text-[13.5px] placeholder:transition-all"
                            style={{ color: '#E0E0E0', caretColor: '#E83E8C', boxShadow: 'none' }} />
                        <button type="submit" disabled={loading || !query.trim()}
                            className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
                            style={{ background: query.trim() ? '#A78BD4' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Send style={{ width: 11, height: 11, color: query.trim() ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                        </button>
                        {/* X — clear input only */}
                        {query.trim() && (
                            <button type="button" onClick={() => setQuery('')}
                                className="flex items-center justify-center w-7 h-7 rounded-full transition-all hover:bg-white/10"
                                style={{ border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
                                title="Clear input">
                                <X style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.4)' }} />
                            </button>
                        )}
                        {/* Minimize — hide/show chat */}
                        {messages.length > 0 && (
                            <button type="button" onClick={() => setChatHidden(h => !h)}
                                className="flex items-center justify-center w-7 h-7 rounded-full transition-all hover:bg-white/10"
                                style={{ border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
                                title={chatHidden ? 'Show chat' : 'Minimize chat'}>
                                <ChevronDown style={{ width: 12, height: 12, color: chatHidden ? '#A78BD4' : 'rgba(255,255,255,0.4)', transform: chatHidden ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                        )}
                    </form>
                </motion.div>
            </div>

            {/* ── gate modal ── */}
            <AnimatePresence>
                {showGate && (
                    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ backdropFilter: 'blur(18px)', background: 'rgba(0,0,0,0.75)' }}
                        onClick={() => setShowGate(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                            onClick={e => e.stopPropagation()}
                            className="relative rounded-2xl p-8 text-center"
                            style={{ background: '#0e0e10', border: '1px solid rgba(167,139,212,0.2)', maxWidth: 420, width: 'calc(100vw - 48px)', boxShadow: '0 0 60px rgba(167,139,212,0.08)' }}>
                            <button onClick={() => setShowGate(false)}
                                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 transition-colors"
                                style={{ color: 'rgba(255,255,255,0.3)' }}>
                                <X className="w-4 h-4" />
                            </button>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{ background: 'rgba(167,139,212,0.1)', border: '1px solid rgba(167,139,212,0.25)' }}>
                                <Brain className="w-7 h-7" style={{ color: '#A78BD4' }} />
                            </div>
                            <h3 className="font-bold text-[20px] mb-2" style={{ letterSpacing: '-0.02em' }}>You&apos;ve used your free searches</h3>
                            <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                Create a free account to unlock unlimited research sessions, persistent memory, and all 4 CLARIBB agents.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link href="/auth"
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-90"
                                    style={{ background: '#A78BD4', color: '#fff' }}>
                                    Create free account <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link href="/auth"
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-[13px] transition-opacity hover:opacity-70"
                                    style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    Already have an account? Sign in
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default function LandingPage() {
    const mounted = useMounted();
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
    const heroOp = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

    const query = useTypewriter([
        'What are the tensions between AI safety and capabilities?',
        'How does transformers architecture compare to SSMs?',
        'Find connections between RLHF and constitutional AI...',
        'What did I read last week about mechanistic interpretability?',
    ], 48, 2100);

    const [active, setActive] = useState(0);
    useEffect(() => { const t = setInterval(() => setActive(i => (i + 1) % 4), 2200); return () => clearInterval(t); }, []);

    return (
        <div style={{ background: C.black, color: C.text, fontFamily: "'Inter',system-ui,sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
            <ScrollBar />

            {/* ═══ FIXED HEADER (announcement + navbar) ════════════════ */}
            <div className="fixed top-0 left-0 right-0 z-50" style={{ backdropFilter: 'blur(18px)' }}>
                {/* ═══ ANNOUNCEMENT BAR ════════════════ */}
                <div className="flex items-center justify-center gap-2 py-1.5 text-[11.5px] font-medium overflow-hidden"
                    style={{ background: '#CD3775', borderBottom: '1px solid rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70 shrink-0" />
                    {/* Short label on mobile, full on sm+ */}
                    <span className="sm:hidden" style={{ color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis' }}>SPEEDRUN 2026 · Track 3</span>
                    <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.92)' }}>SPEEDRUN 2026 · Track 3 — Multi-Agent Research Intelligence</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shrink-0"
                        style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.28)' }}>BETA</span>
                </div>

                {/* ═══ NAVBAR ════════════════════════════ */}
                <motion.nav initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}
                    className="flex items-center justify-between px-4 md:px-8 h-14 max-w-screen-xl mx-auto"
                    style={{ background: 'rgba(0,0,0,0.92)', borderBottom: `1px solid ${C.border}` }}>
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <Brain className="w-5 h-5" style={{ color: C.sec }} />
                        <span className="text-[15px] font-semibold tracking-tight">Claribb.AI</span>
                    </div>
                    {/* Links */}
                    <div className="hidden md:flex items-center gap-8 text-[13.5px]" style={{ color: C.muted }}>
                        {[['Agents', '#agents'], ['How it Works', '#how-it-works'], ['Features', '#features']].map(([l, h]) => (
                            <a key={l} href={h} className="hover:text-white transition-colors duration-150">{l}</a>
                        ))}
                        <Link href="/pricing" className="hover:text-white transition-colors duration-150">Pricing</Link>
                        <Link href="/contact" className="hover:text-white transition-colors duration-150">Contact</Link>
                    </div>
                    {/* CTAs */}
                    <div className="flex items-center gap-3">
                        <Link href="/auth" className="text-[13.5px] transition-colors hover:text-white" style={{ color: C.muted }}>Sign in</Link>
                        <Link href="/auth" className="flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-[13.5px] font-medium hover:opacity-90 transition-opacity"
                            style={{ background: C.text, color: C.black }}>
                            Get started <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </motion.nav>
            </div>

            {/* ═══ HERO ══════════════════════════════ */}
            <section ref={heroRef} className="relative min-h-[88vh] flex items-center overflow-hidden" style={{ paddingTop: 86 }}>
                <HeroGrid />
                {/* very subtle glow blob behind heading */}
                <div className="absolute pointer-events-none" style={{ width: 580, height: 420, top: '10%', left: '8%', background: 'radial-gradient(ellipse,rgba(255,255,255,0.02) 0%,transparent 70%)', borderRadius: '50%' }} />

                <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center py-10 lg:py-14">
                    {/* Left — parallax style only applied after mount to avoid SSR mismatch */}
                    <motion.div style={mounted ? { y: heroY, opacity: heroOp } : {}}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                            <Eyebrow>Multi-Agent Research Intelligence</Eyebrow>
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.45 }}
                            className="font-bold leading-[1.06] mb-5"
                            style={{ fontSize: 'clamp(34px,4.6vw,56px)', letterSpacing: '-0.025em' }}>
                            <span style={{
                                background: 'linear-gradient(180deg, #C8C8C8 0%, #FFFFFF 70%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>Research that</span><br />
                            <span style={{ color: C.text }}>remembers<br />
                                everything</span>
                        </motion.h1>

                        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                            className="text-[15.5px] font-light leading-[1.74] mb-8" style={{ color: C.sec, maxWidth: 500 }}>
                            Four specialized AI agents. One persistent memory graph.
                            CLARIBB builds a compounding knowledge model — so every session makes you sharper than the last.
                        </motion.p>

                        {/* Buttons */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap items-center gap-3 mb-10">
                            <Link href="/auth" className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity"
                                style={{ background: C.text, color: C.black }}>
                                Get started <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a href="#how-it-works" className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[14px] font-medium hover:bg-white/[0.05] transition-colors"
                                style={{ border: `1px solid rgba(255,255,255,0.18)`, color: C.text }}>
                                View models
                            </a>
                        </motion.div>

                        {/* Tag row */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}
                            className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-light" style={{ color: C.faint }}>Works with</span>
                            {['Groq', 'Cohere', 'pgvector', 'OpenAI'].map(t => (
                                <span key={t} className="text-[11px] px-2.5 py-1 rounded-md font-medium"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: C.sec, border: `1px solid ${C.border}` }}>{t}</span>
                            ))}
                        </motion.div>

                        {/* Divider + stats */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                            className="flex items-center gap-10 mt-9 pt-8" style={{ borderTop: `1px solid ${C.border}` }}>
                            {[{ val: 4, s: '', lbl: 'AI Agents' }, { val: 100, s: '+', lbl: 'Depth score scale' }, { custom: '<1s', lbl: 'Memory recall' }].map((st, i) => (
                                <div key={i}>
                                    <div className="text-[22px] font-bold" style={{ color: C.text }}>{st.custom ?? <><AnimCounter target={st.val!} />{st.s}</>}</div>
                                    <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>{st.lbl}</div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Right */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }}
                        className="hidden lg:flex flex-col gap-3">
                        {/* Neural diagram — no border, transparent, blends into black */}
                        <div className="relative overflow-hidden" style={{ height: 300, background: 'transparent', border: 'none' }}>
                            <NeuralDiagram />
                            {/* Agent floating tags */}
                            {AGENTS.map((ag, i) => {
                                const pos = [{ top: '8%', left: '3%' }, { top: '8%', right: '3%' }, { bottom: '10%', left: '3%' }, { bottom: '10%', right: '3%' }];
                                return (
                                    <div key={ag.id} className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold"
                                        style={{ ...pos[i], background: active === i ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${active === i ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.10)'}`, color: active === i ? '#FFFFFF' : '#8A8A8A', transition: 'all 0.3s ease' }}>
                                        {active === i && <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: C.pink }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />}
                                        {ag.name}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Code panel */}
                        <CodePanel query={query} />
                    </motion.div>
                </div>
            </section>

            {/* ═══ TICKER ════════════════════════════ */}
            <div className="relative overflow-hidden py-2.5 border-y" style={{ borderColor: C.border }}>
                <motion.div className="flex gap-10 whitespace-nowrap" animate={{ x: [0, -1040] }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}>
                    {[0, 1, 2].flatMap(o => TICKER.map((t, i) => (
                        <span key={`tk${o}${i}`} className="flex items-center gap-3 text-[11px]" style={{ color: C.faint }}>
                            <span className="w-1 h-1 rounded-full" style={{ background: C.pink, opacity: 0.5 }} />{t}
                        </span>
                    )))}
                </motion.div>
            </div>

            {/* ═══ AGENTS ═══════════════════════════ */}
            <section id="agents" className="relative py-28 overflow-hidden" style={{ background: C.layer }}>
                <div className="relative z-10 max-w-screen-xl mx-auto px-8">
                    <FadeUp className="text-center mb-16">
                        <Eyebrow>The Five Agents</Eyebrow>
                        <h2 style={{ fontSize: 'clamp(42px,5.5vw,64px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 16 }}>
                            Five <em style={{ color: '#BD93F9', fontStyle: 'italic', fontWeight: 800 }}>specialists</em>.<br />One unified mind.
                        </h2>
                        <p style={{ fontSize: 16, fontWeight: 300, maxWidth: 540, margin: '0 auto', color: C.sec, lineHeight: 1.72 }}>Every query activates all five agents simultaneously. They compete, collaborate, and synthesize — producing answers no single model can match.</p>
                    </FadeUp>
                    <AgentSpreadCards />
                </div>
            </section>

            {/* ═══ HOW IT WORKS ══════════════════════ */}
            <section id="how-it-works" className="relative py-28 overflow-hidden" style={{ background: C.black }}>
                <div className="relative z-10 max-w-screen-xl mx-auto px-8">
                    <FadeUp className="text-center mb-20">
                        <Eyebrow>The Pipeline</Eyebrow>
                        <h2 style={{ fontSize: 'clamp(40px,5vw,60px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
                            From question to <span style={{ color: '#9BBFA8', fontStyle: 'italic' }}>insight</span><br />in under a second.
                        </h2>
                    </FadeUp>
                    <PipelineFlow />
                </div>
            </section>

            {/* ═══ FEATURES ══════════════════════ */}
            <section id="features" className="relative py-28 overflow-hidden" style={{ background: C.layer }}>
                <div className="relative z-10 max-w-screen-xl mx-auto px-8">
                    <FadeUp className="text-center mb-16">
                        <Eyebrow>Core Capabilities</Eyebrow>
                        <h2 style={{ fontSize: 'clamp(42px,5.5vw,64px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 14 }}>
                            Everything serious<br /><em style={{ fontStyle: 'italic', color: '#A78BD4' }}>researchers</em> need.
                        </h2>
                        <p style={{ fontSize: 15, fontWeight: 300, color: C.sec, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Six foundational capabilities built to compound—getting smarter with every session.</p>
                    </FadeUp>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Wide — Semantic Vector Memory */}
                        <FadeUp className="md:col-span-2" delay={0}>
                            <motion.div whileHover={{ y: -2 }} className="p-7 rounded-xl h-full" style={{ background: 'rgba(8,8,10,0.8)', border: `1px solid ${C.border}` }}>
                                <div className="flex gap-7">
                                    <div className="flex-1">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(167,139,212,0.08)', border: '1px solid rgba(167,139,212,0.2)' }}>
                                            <Database style={{ color: '#A78BD4', width: 16, height: 16 }} />
                                        </div>
                                        <h3 className="text-[16px] font-semibold mb-2">Semantic Vector Memory</h3>
                                        <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.muted }}>Every note and conversation embedded via pgvector. CLARIBB retrieves the right context from months ago — in milliseconds, no manual tagging.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['pgvector', 'cosine similarity', 'auto-chunking', 'cross-session recall'].map(t => (
                                                <span key={t} className="text-[11px] px-2.5 py-1 rounded-md" style={{ background: 'rgba(167,139,212,0.07)', color: '#A78BD4', border: '1px solid rgba(167,139,212,0.18)' }}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col justify-end gap-1.5 w-14 pb-1">
                                        {[0.35, 0.62, 0.48, 0.82, 0.58, 0.72, 0.44].map((h, i) => (
                                            <motion.div key={i} className="rounded-sm" style={{ height: 4, background: `rgba(167,139,212,${h * 0.35})` }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.36 }} />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </FadeUp>
                        {/* Tall — Living Knowledge Graph */}
                        <FadeUp delay={0.07} className="row-span-2">
                            <motion.div whileHover={{ y: -2 }} className="p-6 rounded-xl h-full" style={{ background: 'rgba(8,8,10,0.8)', border: `1px solid ${C.border}` }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(114,184,204,0.08)', border: '1px solid rgba(114,184,204,0.2)' }}>
                                    <Network style={{ color: '#72B8CC', width: 16, height: 16 }} />
                                </div>
                                <h3 className="text-[16px] font-semibold mb-2">Living Knowledge Graph</h3>
                                <p className="text-[13px] leading-relaxed mb-5" style={{ color: C.muted }}>Every concept and relationship extracted automatically. Watch your research domain grow visually — session by session.</p>
                                {/* Pure SVG graph — single coordinate system, no mismatch */}
                                {(() => {
                                    const gNodes = [
                                        { cx: 78, cy: 98, r: 26, lbl: 'RAG' },
                                        { cx: 196, cy: 44, r: 22, lbl: 'RLHF' },
                                        { cx: 214, cy: 138, r: 19, lbl: 'Safety' },
                                        { cx: 80, cy: 168, r: 16, lbl: 'SSM' },
                                    ];
                                    const gEdges: [number, number][] = [[0, 1], [0, 2], [1, 2], [0, 3], [2, 3]];
                                    return (
                                        <svg width="100%" style={{ height: 200 }} viewBox="0 0 290 200" preserveAspectRatio="xMidYMid meet">
                                            {/* Edges */}
                                            {gEdges.map(([a, b], i) => (
                                                <line key={`ge${i}`}
                                                    x1={gNodes[a].cx} y1={gNodes[a].cy}
                                                    x2={gNodes[b].cx} y2={gNodes[b].cy}
                                                    stroke="rgba(114,184,204,0.55)" strokeWidth="1">
                                                    <animate attributeName="opacity"
                                                        values="0.3;0.85;0.3"
                                                        dur={`${2.6}s`} begin={`${i * 0.45}s`}
                                                        repeatCount="indefinite" />
                                                </line>
                                            ))}
                                            {/* Nodes */}
                                            {gNodes.map((nd, i) => (
                                                <g key={`gn${i}`}>
                                                    <animateTransform attributeName="transform" type="translate"
                                                        values="0,0; 0,-3; 0,0"
                                                        dur={`${2.6 + i * 0.4}s`} begin={`${i * 0.32}s`}
                                                        repeatCount="indefinite" />
                                                    <circle cx={nd.cx} cy={nd.cy} r={nd.r}
                                                        fill="rgba(114,184,204,0.08)"
                                                        stroke="rgba(114,184,204,0.35)" strokeWidth="1" />
                                                    <text x={nd.cx} y={nd.cy + 3.5}
                                                        textAnchor="middle" fontSize="9"
                                                        fill="#72B8CC" fontFamily="inherit" fontWeight="500">{nd.lbl}</text>
                                                </g>
                                            ))}
                                        </svg>
                                    );
                                })()}
                                <p className="text-[11px] mt-4" style={{ color: C.faint }}>+ Time Machine: replay belief graph evolution</p>
                            </motion.div>
                        </FadeUp>
                        {/* 2 small */}
                        {[
                            { icon: GitBranch, title: 'Session Intelligence', desc: 'AI summaries, open questions, gaps resolved. Return weeks later and pick up exactly where you left off.', color: '#9BBFA8', bg: 'rgba(155,191,168,0.07)', border: 'rgba(155,191,168,0.2)' },
                            { icon: Lightbulb, title: 'Research Hypotheses', desc: 'CLARIBB generates testable hypotheses from your corpus — ideas you might not have connected yourself.', color: '#C47AA0', bg: 'rgba(196,122,160,0.07)', border: 'rgba(196,122,160,0.2)' },
                        ].map((fc, i) => (
                            <FadeUp key={`fc${i}`} delay={0.09 + i * 0.05}>
                                <motion.div whileHover={{ y: -2 }} className="p-6 rounded-xl" style={{ background: 'rgba(8,8,10,0.8)', border: `1px solid ${C.border}` }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: fc.bg, border: `1px solid ${fc.border}` }}>
                                        <fc.icon style={{ color: fc.color, width: 16, height: 16 }} />
                                    </div>
                                    <h3 className="text-[15px] font-semibold mb-2">{fc.title}</h3>
                                    <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>{fc.desc}</p>
                                </motion.div>
                            </FadeUp>
                        ))}
                        {/* Split bottom cards */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: Zap, title: 'Cross-Project Serendipity', desc: 'Unexpected connections across all your projects — insights only the full picture reveals.', color: '#C49A5A', bg: 'rgba(196,154,90,0.07)', border: 'rgba(196,154,90,0.2)' },
                                { icon: TrendingUp, title: 'Trajectory Prediction', desc: "AI predicts where your research is headed and what foundational concepts you'll need next.", color: '#BD93F9', bg: 'rgba(189,147,249,0.07)', border: 'rgba(189,147,249,0.2)' },
                            ].map((f, i) => (
                                <FadeUp key={`fbot${i}`} delay={0.11 + i * 0.05} className="h-full">
                                    <motion.div whileHover={{ y: -2 }} className="p-6 rounded-xl h-full" style={{ background: 'rgba(8,8,10,0.8)', border: `1px solid ${C.border}` }}>
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                                            <f.icon style={{ color: f.color, width: 16, height: 16 }} />
                                        </div>
                                        <h3 className="text-[15px] font-semibold mb-2">{f.title}</h3>
                                        <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>{f.desc}</p>
                                    </motion.div>
                                </FadeUp>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ STATS ══════════════════════════════ */}
            <section className="relative py-20 border-y overflow-hidden" style={{ background: C.black, borderColor: C.border }}>
                <div className="max-w-screen-xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 divide-x" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                    {([
                        { custom: '4', s: '', lbl: 'Specialized AI Agents', sub: 'running in parallel' },
                        { custom: '<1s', s: '', lbl: 'Memory Recall', sub: 'across all sessions' },
                        { custom: '100%', s: '', lbl: 'Context Preserved', sub: 'no session reset, ever' },
                        { custom: '∞', s: '', lbl: 'Knowledge Compounds', sub: 'every session builds on last' },
                    ] as { custom: string; s: string; lbl: string; sub: string }[]).map((st, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                            className="text-center py-2 px-6" style={{ borderColor: C.border }}>
                            <div className="text-[32px] font-bold mb-1 tracking-tight">{st.custom}{st.s}</div>
                            <div className="text-[13px] font-medium mb-0.5" style={{ color: C.text }}>{st.lbl}</div>
                            <div className="text-[11px]" style={{ color: C.muted }}>{st.sub}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══ USE CASES ══════════════════════════ */}
            {/* ═══ COMPETITIVE LANDSCAPE ══════════════ */}
            <CompetitiveLandscape />

            {/* ═══ FAQ ════════════════════════════════ */}
            <FAQSection />

            {/* ═══ WHO USES ════════════════════════════ */}
            <section className="relative py-28 overflow-hidden" style={{ background: C.layer }}>
                <div className="relative z-10 max-w-screen-xl mx-auto px-8">
                    <FadeUp className="text-center mb-14">
                        <Eyebrow>Built For</Eyebrow>
                        <h2 style={{ fontSize: 'clamp(38px,4.5vw,56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>Who uses <span style={{ color: '#E83E8C', fontStyle: 'italic' }}>CLARIBB</span>?</h2>
                    </FadeUp>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { e: '🔬', title: 'PhD Researchers', desc: 'Never lose track of 3 years of papers. Surface the connection your advisor missed.', tags: ['Literature Review', 'Concept Mapping'] },
                            { e: '🏢', title: 'Strategy Analysts', desc: 'Build compounding competitive intelligence. Connect every insight across sprints.', tags: ['Market Research', 'Trend Detection'] },
                            { e: '⚖️', title: 'Legal Professionals', desc: 'Track case law and precedent across months. CLARIBB never forgets a ruling.', tags: ['Case Law', 'Precedent Cross-Reference'] },
                            { e: '💡', title: 'Innovation Teams', desc: 'Detect convergence patterns across disciplines before they become obvious.', tags: ['Tech Scouting', 'Pattern Synthesis'] },
                        ].map((uc, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                whileHover={{ y: -3, transition: { duration: 0.16 } }} className="p-6 rounded-xl group"
                                style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${C.border}` }}>
                                <div className="text-[26px] mb-4 group-hover:scale-110 transition-transform duration-200">{uc.e}</div>
                                <h3 className="font-semibold text-[14.5px] mb-2">{uc.title}</h3>
                                <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.muted }}>{uc.desc}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {uc.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: C.muted, border: `1px solid ${C.border}` }}>{t}</span>)}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ CTA ════════════════════════════════ */}
            <section className="relative py-32 overflow-hidden border-t" style={{ background: C.black, borderColor: C.border }}>
                <div className="relative z-10 max-w-[720px] mx-auto px-8 text-center">
                    <FadeUp>
                        <Brain className="w-9 h-9 mx-auto mb-6" style={{ color: C.muted }} />
                        <h2 className="text-[48px] font-bold mb-4" style={{ letterSpacing: '-0.028em' }}>
                            <span style={{ color: '#E83E8C' }}>Stop starting</span> from zero.
                        </h2>
                        <p className="text-[15.5px] font-light mb-10" style={{ color: C.sec }}>
                            Build a research brain that compounds with every session. The longer you use CLARIBB, the more irreplaceable it becomes.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/auth" className="flex items-center gap-2 px-7 py-3 rounded-[8px] text-[14.5px] font-medium hover:opacity-90 transition-opacity"
                                style={{ background: C.text, color: C.black }}>
                                Start for free <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a href="#agents" className="flex items-center gap-2 px-7 py-3 rounded-[8px] text-[14.5px] font-medium hover:bg-white/[0.05] transition-colors"
                                style={{ border: `1px solid rgba(255,255,255,0.16)`, color: C.text }}>
                                Explore agents
                            </a>
                        </div>
                        <p className="mt-5 text-[12px]" style={{ color: C.faint }}>No credit card required · Works instantly</p>
                    </FadeUp>
                </div>
            </section>

            {/* ═══ FOOTER ════════════════════════════ */}
            <footer className="border-t py-7 px-8" style={{ borderColor: C.border, background: C.black }}>
                <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <Brain className="w-4 h-4" style={{ color: C.faint }} />
                        <span className="font-semibold text-[14px]">Claribb.AI</span>
                        <span className="text-[13px]" style={{ color: C.faint }}> — Multi-Agent Research Intelligence</span>
                    </div>
                    <div className="flex items-center gap-5 text-[12.5px]" style={{ color: C.faint }}>
                        <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                        <span>Groq · Cohere · pgvector · Next.js 15</span>
                        <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(232,62,140,0.06)', color: C.pink, border: '1px solid rgba(232,62,140,0.16)' }}>SPEEDRUN 2026</span>
                    </div>
                </div>
            </footer>
            <DemoSearchBar />
        </div>
    );
}
