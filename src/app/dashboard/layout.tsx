'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClientSupabaseClient();

        // Use onAuthStateChange instead of getSession() — avoids acquiring the LockManager lock
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
                router.push('/auth');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
