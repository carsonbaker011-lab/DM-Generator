import { auth } from '@clerk/nextjs/server';
import { getUsage, getUserPlan } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const plan = await getUserPlan(userId);
  const usage = await getUsage(userId);
  const planConfig = PLANS[plan] || PLANS.free;

  return Response.json({
    plan,
    usage,
    limit: planConfig.monthlyGenerations,
    remaining: planConfig.monthlyGenerations === Infinity
      ? Infinity
      : Math.max(0, planConfig.monthlyGenerations - usage),
    maxUrls: planConfig.maxUrls,
    emailSend: planConfig.emailSend,
  });
}
