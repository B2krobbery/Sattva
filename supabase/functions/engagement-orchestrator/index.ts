// engagement-orchestrator — AI-driven engagement planning + dispatch.
//
// Modes (POST { action }):
//   plan  — gathers per-user engagement signals, asks Gemini for the single
//           best next action per user, enqueues rows in notification_outbox.
//   send  — drains pending outbox rows: email via Resend, push via FCM,
//           and a mirrored in-app row in public.notifications.
//
// Auth: super_admin JWT (admin "Run" buttons) OR x-notify-secret (cron/hooks).
// Dedupe: users already holding a pending/sent row for a template+day are skipped.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = 'https://pratha-two.vercel.app';
const FROM = 'Pratha <namaste@resend.dev>';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notify-secret',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function secret(name: string): Promise<string | null> {
  const { data, error } = await admin.rpc('get_edge_secret', { p_name: name });
  if (error) console.error('secret', name, error.message);
  return (data as string) ?? null;
}

// ---------- auth ----------

async function authorize(req: Request): Promise<boolean> {
  const hook = req.headers.get('x-notify-secret');
  const expected = await secret('notify_hook_secret');
  if (hook && expected && hook === expected) return true;

  const auth = req.headers.get('Authorization');
  if (!auth) return false;
  const { data, error } = await admin.auth.getUser(auth.replace('Bearer ', ''));
  if (error || !data.user) return false;
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', data.user.id);
  return !!roles?.some((r: { role: string }) => r.role === 'super_admin');
}

// ---------- signal gathering ----------

interface Candidate {
  userId: string;
  name: string;
  signals: string[];
}

async function gatherCandidates(): Promise<Candidate[]> {
  const { data: profiles } = await admin.from('profiles')
    .select('id, display_name, email, birth_date, created_at, notifications_enabled')
    .not('email', 'is', null)
    .neq('notifications_enabled', false);
  if (!profiles?.length) return [];

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: bookings }, { data: referrals }, { data: sentToday }] = await Promise.all([
    admin.from('puja_bookings').select('user_id'),
    admin.from('referrals').select('referrer_user_id'),
    admin.from('notification_outbox').select('user_id').gte('created_at', today),
  ]);
  const hasBooking = new Set((bookings || []).map((b) => b.user_id));
  const refCount = new Map<string, number>();
  (referrals || []).forEach((r) => refCount.set(r.referrer_user_id, (refCount.get(r.referrer_user_id) || 0) + 1));
  const contactedToday = new Set((sentToday || []).map((r) => r.user_id));

  return profiles
    .filter((p) => !contactedToday.has(p.id))
    .map((p) => {
      const signals: string[] = [];
      const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
      if (!p.birth_date) signals.push('missing_birth_details');
      if (!hasBooking.has(p.id)) signals.push('no_bookings_yet');
      const refs = refCount.get(p.id) || 0;
      if (refs === 0) signals.push('no_referrals_yet');
      else if (refs < 5) signals.push(`approaching_next_referral_tier_at_5`);
      if (days > 3) signals.push(`idle_${days}_days`);
      return { userId: p.id, name: p.display_name || 'Devotee', signals };
    })
    .filter((c) => c.signals.length > 0);
}

// ---------- Gemini planning ----------

interface PlanAction {
  index: number;
  kind: string;
  title: string;
  body: string;
  cta: string;
}

async function planWithGemini(candidates: Candidate[]): Promise<PlanAction[]> {
  const key = await secret('gemini_api_key');
  if (!key || !candidates.length) return [];

  const prompt = `You are the engagement strategist for Pratha, a devotional platform (temple pujas, janma/vedic recommendations, gaushala cow seva, referral "Punya points" program).

For each devotee below, pick the SINGLE best next engagement action and write a short, warm, culturally-appropriate message (max 2 sentences, include their name, no hashtags).

Action kinds: complete_profile, janma_cta, first_booking, referral_prompt, re_engage, seva_explore.

Rules:
- missing_birth_details -> complete_profile (frame as unlocking janma-based puja matching)
- no_bookings_yet (with birth details) -> first_booking or janma_cta
- no_referrals_yet -> referral_prompt (earn 108 Punya per invite)
- approaching tier -> referral_prompt mentioning milestone
- idle days -> re_engage

Devotees (JSON):
${JSON.stringify(candidates)}

Reply with ONLY a JSON array, no markdown fences — "index" is the 0-based position in the input list (do NOT echo userId, it will be mutated):
[{"index":0,"kind":"...","title":"short subject, max 50 chars","body":"message text","cta":"/pujas or /profile or /profile?tab=referral or /seva"}]`;

  const r = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  if (!r.ok) { console.error('gemini:', await r.text()); return []; }
  const j = await r.json();
  const text: string = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter((a) => Number.isInteger(a.index) && a.title && a.body) : [];
  } catch {
    console.error('gemini parse:', text.slice(0, 200));
    return [];
  }
}

// ---------- email template ----------

function emailShell(title: string, body: string, cta: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#faf6ef;font-family:Georgia,serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:13px;letter-spacing:4px;color:#a04b2a;font-weight:bold">प प्रथा · PRATHA</div>
    </div>
    <div style="background:#fffdf9;border:1px solid #eadfd2;border-radius:16px;padding:28px 24px">
      <h2 style="color:#3d2c1e;margin:0 0 12px">${title}</h2>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">${body}</p>
      <div style="text-align:center;margin-top:24px"><a href="${SITE_URL}${cta}" style="background:#a04b2a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;display:inline-block">Open Pratha</a></div>
    </div>
    <p style="text-align:center;color:#a89b8c;font-size:11px;margin-top:24px">Pratha — sacred rituals, Vedic wisdom &amp; Gaushala seva</p>
  </div></body></html>`;
}

// ---------- dispatch ----------

async function sendEmail(key: string, to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function fcmAccessToken(): Promise<string | null> {
  const saJson = await secret('fcm_service_account');
  if (!saJson) return null;
  const sa = JSON.parse(saJson);
  const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${claims}.${b64url(new Uint8Array(sig))}`,
  });
  if (!r.ok) return null;
  return (await r.json()).access_token;
}

async function drainOutbox(): Promise<{ sent: number; failed: number }> {
  const { data: rows } = await admin.from('notification_outbox')
    .select('id, user_id, payload, attempts')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at')
    .limit(50);
  if (!rows?.length) return { sent: 0, failed: 0 };

  const [resendKey, fcmToken] = [await secret('resend_api_key'), await fcmAccessToken()];
  let sent = 0, failed = 0;

  const i18n = (v: unknown): string => typeof v === 'string' ? v : (v as Record<string, string>)?.en || 'Pratha';

  for (const row of rows) {
    const p = row.payload as { title?: unknown; body?: unknown; cta?: string; kind?: string };
    const title = i18n(p.title);
    const body = i18n(p.body) === 'Pratha' ? '' : i18n(p.body);
    const cta = p.cta || '/';
    try {
      // in-app inbox copy (always)
      await admin.from('notifications').insert({
        user_id: row.user_id, kind: p.kind || 'engagement',
        title_i18n: { en: title }, body_i18n: { en: body }, data: { cta },
      });

      const { data: prof } = await admin.from('profiles').select('email').eq('id', row.user_id).maybeSingle();
      if (resendKey && prof?.email) {
        try { await sendEmail(resendKey, prof.email, title, emailShell(title, body, cta)); }
        catch (e) { console.error('email:', e); }
      }
      if (fcmToken) {
        const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', row.user_id);
        await Promise.all((tokens || []).map(({ token }) =>
          fetch('https://fcm.googleapis.com/v1/projects/sattva-utsavam-dev/messages:send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${fcmToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token, notification: { title, body } } }),
          }).then(async (r) => { if (!r.ok) console.error('fcm:', await r.text()); })
        ));
      }

      await admin.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } catch (e) {
      await admin.from('notification_outbox').update({ attempts: (row.attempts ?? 0) + 1, last_error: String(e).slice(0, 300) }).eq('id', row.id);
      failed++;
    }
  }
  return { sent, failed };
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!(await authorize(req))) return json({ error: 'forbidden' }, 403);

  let payload: { action?: string };
  try { payload = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  if (payload.action === 'send') {
    return json(await drainOutbox());
  }

  if (payload.action === 'plan') {
    const candidates = await gatherCandidates();
    const actions = await planWithGemini(candidates);
    if (!actions.length) return json({ planned: 0, candidates: candidates.length });

    const rows = actions
      .filter((a) => a.index >= 0 && a.index < candidates.length)
      .map((a) => ({
      user_id: candidates[a.index].userId,
      channel: 'email',
      template: a.kind,
      payload: { title: a.title, body: a.body, cta: a.cta || '/', kind: a.kind },
      status: 'pending',
    }));
    const { error } = await admin.from('notification_outbox').insert(rows);
    if (error) return json({ error: error.message }, 500);
    return json({ planned: rows.length, candidates: candidates.length });
  }

  return json({ error: 'unknown action' }, 400);
});
