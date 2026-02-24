'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ExternalLink, Globe, Cpu, FlaskConical, Newspaper, Briefcase, Search, Loader2, Clock } from 'lucide-react';

interface Article {
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    source: { name: string };
    publishedAt: string;
    author: string | null;
}

const CATEGORIES = [
    { id: 'technology', label: 'Technology', icon: Cpu },
    { id: 'science', label: 'Science', icon: FlaskConical },
    { id: 'general', label: 'General', icon: Newspaper },
    { id: 'business', label: 'Business', icon: Briefcase },
    { id: 'health', label: 'Health', icon: Globe },
];

const CACHE_KEY = 'claribb_discover_cache';

interface NewsCache {
    articles: Article[];
    category: string;
    fetchedAt: number;
}

function loadCache(): NewsCache | null {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function saveCache(articles: Article[], category: string) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ articles, category, fetchedAt: Date.now() })); } catch { /* quota */ }
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ago`;
    if (h >= 1) return `${h}h ago`;
    return `${m}m ago`;
}

export default function DiscoverPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState('technology');
    const [searchQ, setSearchQ] = useState('');
    const [loaded, setLoaded] = useState(false);
    const refreshBtnRef = useRef<HTMLButtonElement>(null);

    // On mount: restore from sessionStorage cache
    useEffect(() => {
        const cache = loadCache();
        if (cache && cache.articles.length > 0) {
            setArticles(cache.articles);
            setActiveCategory(cache.category || 'technology');
            setLoaded(true);
        }
    }, []);

    const fetchNews = useCallback(async (category = activeCategory, q = '', force = false) => {
        // If not forced (i.e. Refresh not clicked), and cache exists → skip fetch
        if (!force) {
            const cache = loadCache();
            if (cache && cache.articles.length > 0) {
                setArticles(cache.articles);
                setLoaded(true);
                return;
            }
        }
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ category, ...(q ? { q } : {}) });
            const res = await fetch(`/api/discover?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            const filtered = data.articles.filter((a: Article) => a.title && a.title !== '[Removed]');
            setArticles(filtered);
            setLoaded(true);
            saveCache(filtered, category);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load news');
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    const handleRefresh = () => {
        fetchNews(activeCategory, searchQ, true); // force = true → always fetch
    };

    const handleCategory = (cat: string) => {
        setActiveCategory(cat);
        setSearchQ('');
        // On category change: always fetch fresh
        fetchNews(cat, '', true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQ.trim()) fetchNews(activeCategory, searchQ.trim(), true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '2.5rem 2.5rem 4rem' }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
                        Discover
                    </h1>
                    <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 6 }}>
                        Latest news for researchers — cached until you Refresh
                    </p>
                </div>

                {/* Refresh button */}
                <button
                    ref={refreshBtnRef}
                    onClick={handleRefresh}
                    disabled={loading}
                    id="discover-refresh-btn"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0.6rem 1.2rem', borderRadius: 10,
                        background: '#E83E8C', color: '#fff', border: 'none',
                        fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                        opacity: loading ? 0.6 : 1, transition: 'transform 0.15s',
                        boxShadow: '0 0 16px rgba(232,62,140,0.3)',
                    }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {loading
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <RefreshCw size={14} />
                    }
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </motion.div>

            {/* Search bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search topics, keywords..."
                        style={{
                            width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                            borderRadius: 8, background: '#111', border: '1px solid #222',
                            color: '#ddd', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>
                <button type="submit" style={{
                    padding: '0.55rem 1rem', borderRadius: 8,
                    background: '#1a1a1a', border: '1px solid #2a2a2a',
                    color: '#888', fontSize: '0.8rem', cursor: 'pointer',
                }}>Search</button>
            </form>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {CATEGORIES.map(({ id, label, icon: Icon }) => (
                    <button key={id}
                        onClick={() => handleCategory(id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0.45rem 0.9rem', borderRadius: 99,
                            background: activeCategory === id ? '#1a1a1a' : 'transparent',
                            border: activeCategory === id ? '1px solid #333' : '1px solid #1a1a1a',
                            color: activeCategory === id ? '#e0e0e0' : '#555',
                            fontSize: '0.78rem', cursor: 'pointer', fontWeight: activeCategory === id ? 600 : 400,
                            transition: 'all 0.15s',
                        }}>
                        <Icon size={12} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Empty / Initial state */}
            {!loaded && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', paddingTop: '5rem' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        background: '#111', border: '1px solid #1e1e1e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                    }}>
                        <RefreshCw size={24} style={{ color: '#333' }} />
                    </div>
                    <p style={{ color: '#444', fontSize: '0.9rem' }}>
                        Click{' '}
                        <button
                            onClick={handleRefresh}
                            style={{
                                background: 'none', border: 'none', color: '#E83E8C',
                                fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                                textDecoration: 'underline', textDecorationStyle: 'dashed',
                                textUnderlineOffset: 3, padding: 0,
                            }}
                        >
                            Refresh
                        </button>
                        {' '}to load the latest news
                    </p>
                </motion.div>
            )}

            {/* Error */}
            {error && (
                <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            {/* News Grid */}
            <AnimatePresence>
                {articles.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {articles.map((article, i) => (
                            <motion.a
                                key={i}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                style={{
                                    display: 'block', textDecoration: 'none',
                                    background: '#0f0f0f', border: '1px solid #1e1e1e',
                                    borderRadius: 12, overflow: 'hidden',
                                    transition: 'border-color 0.2s, transform 0.15s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#333';
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#1e1e1e';
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                }}
                            >
                                {article.urlToImage && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={article.urlToImage}
                                        alt=""
                                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                )}
                                <div style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#E83E8C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {article.source.name}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem', color: '#444' }}>
                                            <Clock size={10} />
                                            {timeAgo(article.publishedAt)}
                                        </span>
                                    </div>
                                    <h3 style={{
                                        color: '#e0e0e0', fontSize: '0.85rem', fontWeight: 600,
                                        margin: '0 0 0.5rem', lineHeight: 1.4,
                                        display: '-webkit-box', WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {article.title}
                                    </h3>
                                    {article.description && (
                                        <p style={{
                                            color: '#555', fontSize: '0.75rem', lineHeight: 1.5,
                                            margin: '0 0 0.75rem',
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {article.description}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#888', fontSize: '0.7rem' }}>
                                        <ExternalLink size={10} />
                                        Read full article
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
