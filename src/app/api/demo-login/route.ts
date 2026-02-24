import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
    try {
        // Use admin client to create/login demo user bypassing email confirmation
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const DEMO_EMAIL = 'demo@sage.ai';
        const DEMO_PASSWORD = 'demo123456';

        // Try to get existing demo user
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email === DEMO_EMAIL);

        if (existingUser) {
            // User exists — ensure they're confirmed, then return a magic link token
            if (!existingUser.email_confirmed_at) {
                await adminClient.auth.admin.updateUserById(existingUser.id, {
                    email_confirm: true,
                });
            }
        } else {
            // Create fresh demo user with email pre-confirmed
            const { error: createError } = await adminClient.auth.admin.createUser({
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD,
                email_confirm: true,
                user_metadata: { full_name: 'Demo User' },
            });
            if (createError) throw createError;
        }

        // Generate a sign-in link the client can use
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email: DEMO_EMAIL,
        });
        if (linkError) throw linkError;

        // Return the hashed token so client can verify it
        return NextResponse.json({
            success: true,
            token: linkData.properties?.hashed_token,
            redirectTo: '/dashboard',
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Demo setup failed';
        console.error('Demo API error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
