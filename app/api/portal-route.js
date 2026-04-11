import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 });

  // Get stripe customer ID from supabase
  const { data } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('clerk_id', userId)
    .single();

  if (!data?.stripe_customer_id) {
    return Response.json({ error: 'No subscription found.' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || 'https://www.growthflowai.app';

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${origin}/`,
  });

  return Response.json({ url: session.url });
}
