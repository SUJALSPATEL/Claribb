'use client';

import { createBrowserClient } from '@supabase/ssr';

// Singleton — one client instance per browser window prevents competing LockManager locks
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClientSupabaseClient() {
    if (clientInstance) return clientInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            // Use localStorage not cookies on the client to avoid lock contention
            storageKey: `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`,
            // Disable concurrent lock — single client singleton makes this safe
            lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
                // Skip LockManager entirely and run directly — the singleton
                // ensures only one client exists, so no contention is possible.
                return fn();
            },
        },
    });

    return clientInstance;
}
