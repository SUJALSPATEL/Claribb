import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Initialize inside handler to prevent build-time crashes on Vercel
// when environment variables are not present.
const PLAN_AMOUNTS: Record<string, number> = {
    pro_monthly: 79900,     // ₹799 in paise
    pro_annual: 799000,     // ₹7990 in paise (10 months price)
    team_monthly: 210000,   // ₹2100 in paise
    team_annual: 2100000,   // ₹21000 in paise (10 months price)
};

export async function POST(req: NextRequest) {
    try {
        // Auth check — only logged-in users can create orders
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
            key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
        });
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { planId, billingCycle } = await req.json();
        // planId: 'pro' | 'team'  billingCycle: 'monthly' | 'annual'
        const key = `${planId}_${billingCycle || 'monthly'}`;
        const amount = PLAN_AMOUNTS[key];

        if (!amount) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
            notes: {
                user_id: user.id,
                user_email: user.email || '',
                plan: key,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error('[create-order]', err);
        return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
    }
}
