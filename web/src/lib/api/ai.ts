import { supabase } from '@/lib/supabase';
import { fetchApi } from './client';

// Primary path: the authenticated `rishi-ask` Supabase Edge Function, which
// calls Gemini server-side. The legacy Cloudflare Worker remains as a fallback
// when the function is unreachable (its AI route is unauthenticated — kept only
// until it can be redeployed with JWT verification; needs wrangler access).
export async function askRishi(prompt: string): Promise<{ answer: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('not_authenticated');
  try {
    const { data, error } = await supabase.functions.invoke<{ response: string }>('rishi-ask', {
      body: { query: prompt },
    });
    if (!error && data?.response) return { answer: data.response };
    if (error && /401|403/.test(String((error as { status?: number }).status ?? error.message))) {
      throw new Error('not_authenticated');
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'not_authenticated') throw e;
    // Fall through to the Worker fallback.
  }
  const res = await fetchApi<{ response: string }>('/api/v1/ai/ask', {
    method: 'POST',
    body: JSON.stringify({ query: prompt }),
  });
  return { answer: res.response };
}
