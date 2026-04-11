import { auth } from '@clerk/nextjs/server';
import { getUsage, incrementUsage, getUserPlan } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Please sign in to generate.' }, { status: 401 });
    }

    const body = await req.json();
    const urlCount = body._urlCount || 0;

    const plan = await getUserPlan(userId);
    const planConfig = PLANS[plan] || PLANS.free;
    const usage = await getUsage(userId);

    if (planConfig.monthlyGenerations !== Infinity && usage >= planConfig.monthlyGenerations) {
      return Response.json({
        error: `You've used all ${planConfig.monthlyGenerations} generations this month.`,
        limitReached: true,
        plan,
      }, { status: 403 });
    }

    if (urlCount > planConfig.maxUrls) {
      return Response.json({
        error: `Your ${planConfig.name} plan supports ${planConfig.maxUrls} URL${planConfig.maxUrls === 1 ? '' : 's'} for research. Upgrade to use more.`,
        limitReached: true,
        plan,
      }, { status: 403 });
    }

    const cleanBody = { ...body };
    delete cleanBody._urlCount;

    if (!planConfig.webSearch && cleanBody.tools) {
      delete cleanBody.tools;
    }

    const usesWebSearch = cleanBody.tools?.some(t => t.type === 'web_search_20250305');
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };
    if (usesWebSearch) {
      headers['anthropic-beta'] = 'web-search-2025-03-05';
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanBody),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return Response.json(data, { status: anthropicRes.status });
    }

    await incrementUsage(userId);

    return Response.json({
      ...data,
      _meta: {
        plan,
        usage: usage + 1,
        limit: planConfig.monthlyGenerations,
        remaining: planConfig.monthlyGenerations === Infinity
          ? Infinity
          : planConfig.monthlyGenerations - (usage + 1),
      }
    });

  } catch (err) {
    console.error('Generate error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
