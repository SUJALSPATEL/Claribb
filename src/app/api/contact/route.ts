import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { name, email, company, subject, message } = await req.json();

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Log to console for now (replace with your email service / Resend / Nodemailer)
        console.log('📬 Contact form submission:', { name, email, company, subject, message });

        // TODO: Integrate with Resend / SendGrid / Nodemailer
        // Example with Resend:
        // await resend.emails.send({
        //   from: 'noreply@claribb.ai',
        //   to: 'hello@claribb.ai',
        //   subject: `[Contact] ${subject} — ${name}`,
        //   text: `From: ${name} <${email}>\nCompany: ${company}\n\n${message}`,
        // });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Contact API error:', err);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
