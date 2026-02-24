import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId,
            billingCycle,
        } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
        }

        // Verify signature — HMAC SHA256
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('[verify] Signature mismatch');
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
        }

        // Signature valid — update user subscription in Supabase
        const admin = createAdminSupabaseClient();

        // Store payment record
        try {
            await admin.from('payments').insert({
                user_id: user.id,
                razorpay_order_id,
                razorpay_payment_id,
                plan: planId,
                billing_cycle: billingCycle || 'monthly',
                status: 'paid',
                created_at: new Date().toISOString(),
            });
        } catch (e: unknown) {
            console.warn('[verify] payments insert skipped:', e instanceof Error ? e.message : e);
        }

        // Update user profile with subscription plan
        try {
            await admin.from('user_profiles').upsert({
                id: user.id,
                subscription_plan: planId,
                subscription_status: 'active',
                subscription_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
        } catch (e: unknown) {
            console.warn('[verify] profile upsert skipped:', e instanceof Error ? e.message : e);
        }

        return NextResponse.json({ success: true, plan: planId });
    } catch (err) {
        console.error('[verify-payment]', err);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
