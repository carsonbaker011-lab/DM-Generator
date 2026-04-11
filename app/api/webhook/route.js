import Stripe from 'stripe';
import { upsertUser, supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const clerkId = session.metadata?.clerkId;
      const plan = session.metadata?.plan;
      if (clerkId && plan) {
        await upsertUser(clerkId, {
          plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const { data } = await supabase
        .from('users')
        .select('clerk_id')
        .eq('stripe_subscription_id', sub.id)
        .single();
      if (data?.clerk_id) {
        await upsertUser(data.clerk_id, { plan: 'free' });
      }
      break;
    }
  }

  return Response.json({ received: true });
}
