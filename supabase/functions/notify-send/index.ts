// notify-send — transactional engagement emails via Resend.
//
// Two caller modes:
//   1. User JWT (from the app): types 'welcome' | 'janma_ready' — self only.
//   2. x-notify-secret (from DB triggers / server): 'referral_credited' etc.
//
// Dedupes per user via public.notification_log (unique user_id+type).
// Resend key + hook secret live in vault, read through get_edge_secret().

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = 'https://pratha-two.vercel.app';
const FROM = 'Pratha <namaste@resend.dev>';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function secret(name: string): Promise<string | null> {
  const { data, error } = await admin.rpc('get_edge_secret', { p_name: name });
  if (error) { console.error('secret', name, error.message); return null; }
  return data as string | null;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notify-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// ---------- email templates ----------

function emailShell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#faf6ef;font-family:Georgia,serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:13px;letter-spacing:4px;color:#a04b2a;font-weight:bold">प प्रथा · PRATHA</div>
    </div>
    <div style="background:#fffdf9;border:1px solid #eadfd2;border-radius:16px;padding:28px 24px">${inner}</div>
    <p style="text-align:center;color:#a89b8c;font-size:11px;margin-top:24px">
      Pratha — sacred rituals, Vedic wisdom &amp; Gaushala seva<br/>
      <a href="${SITE_URL}" style="color:#a04b2a">${SITE_URL.replace('https://', '')}</a>
    </p>
  </div></body></html>`;
}

const cta = (label: string, href: string) =>
  `<div style="text-align:center;margin-top:24px"><a href="${href}" style="background:#a04b2a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;display:inline-block">${label}</a></div>`;

const TEMPLATES: Record<string, (d: Record<string, string>) => { subject: string; html: string }> = {
  welcome: (d) => ({
    subject: `Namaste ${d.name} — your sanctuary awaits`,
    html: emailShell(`
      <h2 style="color:#3d2c1e;margin:0 0 12px">Namaste, ${d.name} 🙏</h2>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">Welcome to <strong>Pratha</strong> — authentic temple pujas, daily Vedic panchang, live darshan, and Gaushala seva, all in one sacred space.</p>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">Begin with a small step: add your <strong>birth details once</strong> and we'll suggest pujas aligned to your janma nakshatra.</p>
      ${cta('Enter the Sanctuary', SITE_URL)}
      <p style="color:#a89b8c;font-size:12px;text-align:center;margin-top:20px">May divine blessings be upon you and your family.</p>`),
  }),
  janma_ready: (d) => ({
    subject: `Your janma chart is ready, ${d.name} — ${d.nakshatra}`,
    html: emailShell(`
      <h2 style="color:#3d2c1e;margin:0 0 12px">Your chart is ready ✨</h2>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">${d.name}, your janma chart has been computed:</p>
      <div style="background:#f7efe3;border-radius:12px;padding:14px 18px;margin:12px 0">
        <p style="margin:4px 0;color:#3d2c1e;font-size:14px"><strong>${d.nakshatra}</strong> nakshatra · Moon in <strong>${d.moonRashi}</strong></p>
        <p style="margin:4px 0;color:#5d4a3a;font-size:13px">Suggested worship: ${d.suggestedWorship}</p>
      </div>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">See which offerings in the catalog match your chart — look for the <strong>For You</strong> filter on the Pujas page.</p>
      ${cta('See My Recommended Pujas', SITE_URL + '/pujas')}`),
  }),
  referral_credited: (d) => ({
    subject: `+108 Punya — ${d.referredName} joined through your invite`,
    html: emailShell(`
      <h2 style="color:#3d2c1e;margin:0 0 12px">Punya earned 🪷</h2>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">${d.name}, <strong>${d.referredName}</strong> just joined Pratha using your Dharma Mitra referral code.</p>
      <div style="background:#f7efe3;border-radius:12px;padding:14px 18px;margin:12px 0;text-align:center">
        <div style="font-size:26px;color:#a04b2a;font-weight:bold">${d.punyaTotal}</div>
        <div style="font-size:12px;color:#5d4a3a">total Punya points · tier: <strong>${d.tier}</strong></div>
      </div>
      <p style="color:#5d4a3a;font-size:14px;line-height:1.7">Every devotee you bring earns you <strong>+108 Punya</strong>. Keep sharing — the next milestone tier awaits.</p>
      ${cta('Share Your Code Again', SITE_URL + '/profile?tab=referral')}`),
  }),
};

// ---------- send helpers ----------

async function sendResend(key: string, to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
  return r.json();
}

// ---------- FCM push (v1 API, service account in vault) ----------

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function fcmAccessToken(): Promise<string | null> {
  const saJson = await secret('fcm_service_account');
  if (!saJson) return null;
  const sa = JSON.parse(saJson);

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })));

  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`)
  );
  const jwt = `${header}.${claims}.${b64url(new Uint8Array(sig))}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!r.ok) { console.error('fcm token:', await r.text()); return null; }
  const { access_token } = await r.json();
  return access_token;
}

async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  const accessToken = await fcmAccessToken();
  if (!accessToken) { console.log('push skipped: no fcm_service_account secret'); return; }

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', userId);
  if (!tokens?.length) return;

  await Promise.all(tokens.map(({ token }) =>
    fetch('https://fcm.googleapis.com/v1/projects/sattva-utsavam-dev/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title, body } } }),
    }).then(async (r) => {
      if (!r.ok) console.error('fcm send:', await r.text());
    })
  ));
}

async function alreadySent(userId: string, type: string) {
  const { data } = await admin.from('notification_log').select('id').eq('user_id', userId).eq('type', type).maybeSingle();
  return !!data;
}

async function markSent(userId: string, type: string, meta: Record<string, unknown> = {}) {
  await admin.from('notification_log').upsert({ user_id: userId, type, meta }, { onConflict: 'user_id,type' });
}

function tierFor(count: number): string {
  if (count >= 10) return 'Param Bhakt (Guardian)';
  if (count >= 5) return 'Dharma Mitra (Companion)';
  if (count >= 1) return 'Seva Sahay (Helper)';
  return 'Dharma Pratham (Seeker)';
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const resendKey = await secret('resend_api_key');
  if (!resendKey) return json({ error: 'resend key missing' }, 500);

  let payload: Record<string, string>;
  try { payload = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const type = payload.type;

  // ---- server-triggered path (DB hook) ----
  const hookSecret = req.headers.get('x-notify-secret');
  const expected = await secret('notify_hook_secret');
  if (hookSecret && expected && hookSecret === expected) {
    if (type === 'referral_credited') {
      const { data: ref } = await admin.from('referrals')
        .select('id, referrer_user_id, referred_user_id').eq('id', payload.referral_id).maybeSingle();
      if (!ref) return json({ error: 'referral not found' }, 404);
      if (await alreadySent(ref.referrer_user_id, `referral:${ref.id}`)) return json({ ok: true, deduped: true });

      const [{ data: referrer }, { data: referred }, { count }] = await Promise.all([
        admin.from('profiles').select('display_name, email').eq('id', ref.referrer_user_id).maybeSingle(),
        admin.from('profiles').select('display_name, email').eq('id', ref.referred_user_id).maybeSingle(),
        admin.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_user_id', ref.referrer_user_id),
      ]);
      const to = referrer?.email;
      if (!to) return json({ error: 'no email' }, 400);
      const t = TEMPLATES.referral_credited({
        name: referrer?.display_name || 'Devotee',
        referredName: referred?.display_name || referred?.email?.split('@')[0] || 'A devotee',
        punyaTotal: String((count ?? 1) * 108),
        tier: tierFor(count ?? 1),
      });
      try { await sendResend(resendKey, to, t.subject, t.html); } catch (e) { return json({ error: `resend: ${e}` }, 502); }
      await sendPushToUser(ref.referrer_user_id, '+108 Punya earned 🪷',
        `${referred?.display_name || 'A devotee'} joined Pratha through your invite`);
      await markSent(ref.referrer_user_id, `referral:${ref.id}`, { referred_user_id: ref.referred_user_id });
      return json({ ok: true });
    }
    return json({ error: 'unknown server type' }, 400);
  }

  // ---- user-JWT path (app client, self only) ----
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'auth required' }, 401);
  const jwt = auth.replace('Bearer ', '');
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData.user) return json({ error: 'invalid jwt' }, 401);
  const uid = userData.user.id;

  if (!TEMPLATES[type]) return json({ error: 'unknown type' }, 400);
  if (await alreadySent(uid, type)) return json({ ok: true, deduped: true });

  const { data: profile } = await admin.from('profiles').select('display_name, email').eq('id', uid).maybeSingle();
  const to = profile?.email || userData.user.email;
  if (!to) return json({ error: 'no email' }, 400);
  const name = profile?.display_name || userData.user.user_metadata?.display_name || 'Devotee';

  const t = type === 'janma_ready'
    ? TEMPLATES[type]({ name, nakshatra: payload.nakshatra || '', moonRashi: payload.moonRashi || '', suggestedWorship: payload.suggestedWorship || '' })
    : TEMPLATES[type]({ name });

  try { await sendResend(resendKey, to, t.subject, t.html); } catch (e) { return json({ error: `resend: ${e}` }, 502); }
  if (type === 'welcome') {
    await sendPushToUser(uid, 'Namaste 🙏', 'Welcome to Pratha — your sanctuary awaits');
  } else if (type === 'janma_ready') {
    await sendPushToUser(uid, 'Your janma chart is ready ✨',
      `${payload.nakshatra || ''} nakshatra — see your recommended pujas`);
  }
  await markSent(uid, type);
  return json({ ok: true });
});
