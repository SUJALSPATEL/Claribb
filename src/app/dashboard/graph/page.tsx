'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Network } from 'lucide-react';

export default function GraphIndexPage() {
    const router = useRouter();
    useEffect(() => { router.push('/dashboard'); }, [router]);
    return (
        <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3">
                <Network className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Redirecting...</span>
            </div>
        </div>
    );
}
