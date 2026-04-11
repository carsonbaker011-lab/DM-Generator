import { auth } from '@clerk/nextjs/server';
import { getUserPlan } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Please sign in.' }, { status: 401 });

  const plan = await getUserPlan(userId);
  const planConfig = PLANS[plan] || PLANS.free;

  if (!planConfig.emailSend) {
    return Response.json({ error: 'Email sending requires Silver or Gold plan.' }, { status: 403 });
  }

  const { to, from, subject, body } = await req.json();

  if (!to || !from || !body) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: 'Email service not configured.' }, { status: 500 });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Growth Flow AI <noreply@growthflowai.app>',
        reply_to: from,
        to: [to],
        subject: subject || 'Quick question',
        text: body,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.7">
          ${body.replace(/\n/g, '<br>')}
          <br><br>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#999">Sent via Growth Flow AI · Replies go to ${from}</p>
        </div>`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to send.' }, { status: response.status });
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
