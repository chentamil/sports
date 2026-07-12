// This is a Cloudflare Pages Function — same underlying tech as a Worker, just living
// alongside your other /api/ endpoints. It runs entirely server-side: the browser never
// sees RESEND_API_KEY, and every request is gated by the same admin cookie check used
// everywhere else in this app. You do NOT need a separate Worker for this.
//
// SETUP REQUIRED (one-time):
// 1. Cloudflare Pages dashboard → your project → Settings → Environment variables
// 2. Add RESEND_API_KEY as an "Encrypted" variable (your existing Resend key)
// 3. Add RESEND_FROM as a plain variable, e.g. "Shivani Elite Academy <noreply@yourdomain.com>"
//    (must be a domain you've verified in Resend — Resend will reject unverified senders)

export async function onRequest(context) {

  const request = context.request;
  const RESEND_API_KEY = context.env.RESEND_API_KEY;
  const RESEND_FROM = context.env.RESEND_FROM;

  const cookie = request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/acha_access_token=([^;]+)/);
  if (!tokenMatch) return new Response("Unauthorized", { status: 401 });

  try {

    if (request.method !== "POST") {
      return new Response("Invalid Request", { status: 400 });
    }

    if (!RESEND_API_KEY || !RESEND_FROM) {
      return new Response(JSON.stringify({
        error: "RESEND_API_KEY / RESEND_FROM not configured in Cloudflare Pages environment variables"
      }), { status: 500 });
    }

    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, and html are required" }), { status: 400 });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html
      })
    });

    const result = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: result.message || "Resend API error", details: result }), { status: 502 });
    }

    return Response.json({ sent: true, id: result.id });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
