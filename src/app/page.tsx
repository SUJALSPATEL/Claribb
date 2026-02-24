'use client';
/**
 * Claribb Landing Page — client wrapper
 *
 * 'use client' is required because ssr:false in next/dynamic
 * is only allowed inside Client Components (Next.js 15 rule).
 *
 * The animated landing page is dynamically imported to prevent
 * hydration mismatches from framer-motion MotionValues / useScroll.
 */
import dynamic from 'next/dynamic';

const LandingPage = dynamic(() => import('./page-client'), {
    ssr: false,
    loading: () => (
        <div style={{
            background: '#000000',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Skeleton nav */}
            <div style={{
                height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
                padding: '0 32px', gap: 8,
            }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(232,62,140,0.25)' }} />
                <div style={{ width: 64, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
            </div>
            {/* Skeleton hero */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32 }}>
                <div style={{ width: 320, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ width: 480, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ width: 400, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ width: 200, height: 40, borderRadius: 10, background: 'rgba(232,62,140,0.15)', marginTop: 16 }} />
            </div>
        </div>
    ),
});

export default function Page() {
    return <LandingPage />;
}
