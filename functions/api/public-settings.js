// Public-readable settings (e.g. "show booking slots on the public site?").
// GET is intentionally NOT auth-gated — the public customer-facing page needs to read it.
// POST (changing a setting) IS auth-gated — only the logged-in admin can flip it.

export async function onRequest(context) {

  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;
  const request = context.request;

  try {

    if (request.method === "GET") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/app_settings?select=key,value`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await res.json();
      const settings = {};
      (rows || []).forEach(r => { settings[r.key] = r.value; });
      return Response.json(settings);
    }

    if (request.method === "POST") {
      // Writing requires an authenticated admin session
      const cookie = request.headers.get("Cookie") || "";
      const tokenMatch = cookie.match(/acha_access_token=([^;]+)/);
      if (!tokenMatch) return new Response("Unauthorized", { status: 401 });

      const accessToken = tokenMatch[1];
      const authHeaders = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      };

      const body = await request.json();
      const { key, value } = body;
      if (!key) return new Response(JSON.stringify({ error: "key required" }), { status: 400 });

      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.${key}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ value: String(value) })
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to update setting" }), { status: 500 });
      }
      return Response.json({ updated: true });
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
