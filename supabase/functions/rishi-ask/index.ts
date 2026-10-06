// Rishi AI endpoint. The gateway enforces a valid JWT (verify_jwt), and this
// handler additionally requires a real signed-in user via auth.getUser() —
// the publishable anon key alone is rejected. Requires the GEMINI_API_KEY
// secret (Supabase dashboard → Edge Functions → Secrets). AI_MODEL overrides
// the default model.
import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are Rishi, a warm and knowledgeable guide for the Pratha app: Hindu temples, pujas, sankalpa, nakshatra, gaushala cow care, and seva. Answer concisely and respectfully. Decline topics unrelated to the app's purpose.

Source honesty rules:
- When you cite a claim, name its source kind honestly ("in the Bhagavad Gita…", "the Puranas say…", "temple tradition holds…", "ayurvedic practice suggests…").
- Never present religious belief as proven medical or scientific fact; where a claim is unverifiable, say so gently.

Deep links — when a section of the app would genuinely help the user, end your reply with exactly one machine-readable line, nothing after it:
LINK:/route|Button Label
Valid routes: /pujas, /darshan, /gaushala, /seva, /mantras, /learn, /discover, /profile?tab=journey, /temples/<slug>
Never explain this syntax to the user.`;

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey) return envKey;
  if (cachedGeminiKey) return cachedGeminiKey;
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  // get_edge_secret is a SECURITY DEFINER accessor granted to service_role only.
  const { data, error } = await serviceClient.rpc("get_edge_secret", { p_name: "gemini_api_key" });
  if (error || !data) {
    throw new Error("GEMINI_API_KEY is not configured (function secret or vault)");
  }
  cachedGeminiKey = data as string;
  return cachedGeminiKey;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const { data: authData, error: authError } = await createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  }).auth.getUser(token);
  if (authError || !authData.user) {
    return jsonResponse({ error: "Sign in to ask Rishi" }, 401);
  }

  let apiKey: string;
  try {
    apiKey = await getGeminiKey();
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Gemini key not configured" }, 500);
  }
  const model = Deno.env.get("AI_MODEL") || "gemini-2.5-flash";

  let query: string;
  try {
    const body = await req.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!query) return jsonResponse({ error: "Field 'query' is required" }, 400);
  if (query.length > 4000) return jsonResponse({ error: "Query too long" }, 400);

  const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const aiResp = await fetch(aiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: query }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    return jsonResponse({ error: `Gemini API error: ${errText}` }, 502);
  }
  const aiData = await aiResp.json();
  const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
  return jsonResponse({ response: text || "No response generated." });
});
