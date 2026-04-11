import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { upsertUser } from '@/lib/supabase';
import { STRIPE_PRICES } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const { plan } = await req.json();
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) return Response.json({ error: 'Invalid plan' }, { status: 400 });

  const origin = req.headers.get('origin') || 'https://www.growthflowai.app';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?success=true&plan=${plan}`,
    cancel_url: `${origin}/?cancelled=true`,
    metadata: { clerkId: userId, plan },
  });

  await upsertUser(userId, {});
  return Response.json({ url: session.url });
}
