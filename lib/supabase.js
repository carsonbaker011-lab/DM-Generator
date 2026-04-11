import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getUsage(clerkId) {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await supabase
    .from('usage')
    .select('count')
    .eq('clerk_id', clerkId)
    .eq('month', month)
    .single();
  return data?.count || 0;
}

export async function incrementUsage(clerkId) {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await supabase
    .from('usage')
    .select('count')
    .eq('clerk_id', clerkId)
    .eq('month', month)
    .single();

  if (data) {
    await supabase
      .from('usage')
      .update({ count: data.count + 1 })
      .eq('clerk_id', clerkId)
      .eq('month', month);
  } else {
    await supabase
      .from('usage')
      .insert({ clerk_id: clerkId, month, count: 1 });
  }
}

export async function getUserPlan(clerkId) {
  const { data } = await supabase
    .from('users')
    .select('plan')
    .eq('clerk_id', clerkId)
    .single();
  return data?.plan || 'free';
}

export async function upsertUser(clerkId, fields = {}) {
  await supabase
    .from('users')
    .upsert({ clerk_id: clerkId, ...fields }, { onConflict: 'clerk_id' });
}
