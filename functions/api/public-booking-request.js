// POST /api/public-booking-request
// Body: { slot_id, player_name, player_email, player_mobile, notes, recaptcha_token }
// No cookie. Uses anon key + RLS. Server verifies slot + reCAPTCHA.

export async function onRequest(context) {
  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;
  const RECAPTCHA_SECRET = context.env.RECAPTCHA_SECRET;

  if (!SUPABASE_URL || !SUPABASE_KEY || !RECAPTCHA_SECRET) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }
  if (context.request.method !== "POST") {
    return new Response("Invalid Request", { status: 400 });
  }

  const ip = context.request.headers.get("CF-Connecting-IP") || "";
  const anon = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    const body = await context.request.json().catch(() => ({}));
    const slot_id = Number(body.slot_id);
    const name = String(body.player_name || "").trim();
    const email = String(body.player_email || "").trim().toLowerCase();
    const mobile = String(body.player_mobile || "").trim();
    const notes = String(body.notes || "").trim();
    const token = String(body.recaptcha_token || "");

    // Sanitize: alphanumeric + basic punctuation only. No angle brackets, semicolons, backticks.
    const bad = /[<>;`\\]/;
    if (bad.test(name) || bad.test(notes) || bad.test(email) || bad.test(mobile)) {
      return Response.json({ error: "Invalid characters in input" }, { status: 400 });
    }

    if (!Number.isInteger(slot_id) || slot_id <= 0)
      return Response.json({ error: "Invalid slot" }, { status: 400 });
    if (name.length < 1 || name.length > 120)
      return Response.json({ error: "Name 1–120 chars" }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200)
      return Response.json({ error: "Invalid email" }, { status: 400 });
    if (!/^[0-9+\-\s()]{7,20}$/.test(mobile))
      return Response.json({ error: "Invalid mobile" }, { status: 400 });
    if (notes.length > 1000)
      return Response.json({ error: "Notes too long" }, { status: 400 });
    if (!token)
      return Response.json({ error: "reCAPTCHA missing" }, { status: 400 });

    // reCAPTCHA v3 verify [citation:4]
    const v = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token, remoteip: ip })
    });
    const vr = await v.json();
    if (!vr.success) return Response.json({ error: "reCAPTCHA failed" }, { status: 400 });
    if (vr.score !== undefined && vr.score < 0.5)
      return Response.json({ error: "reCAPTCHA score too low" }, { status: 400 });

    // Re-fetch the slot — never trust browser-supplied date/time/price
    const slotRes = await fetch(
      `${SUPABASE_URL}/rest/v1/slots?id=eq.${slot_id}&select=id,date,start_time,end_time,price,status,court_id`,
      { headers: anon }
    );
    const slotArr = await slotRes.json();
    const slot = slotArr[0];
    if (!slot) return Response.json({ error: "Slot not found" }, { status: 404 });
    if (slot.status !== "available")
      return Response.json({ error: "Slot unavailable" }, { status: 409 });

    // Insert via anon (RLS restricts to pending rows only)
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/booking_requests`, {
      method: "POST",
      headers: { ...anon, Prefer: "return=minimal" },
      body: JSON.stringify([{
        slot_id, player_name: name, player_email: email,
        player_mobile: mobile, notes: notes || null, status: "pending"
      }])
    });

    if (!ins.ok) {
      const t = await ins.text();
      if (t.includes("row-level security") || t.includes("42501"))
        return Response.json({ error: "Request blocked by database policy. Contact admin." }, { status: 500 });
      return Response.json({ error: "Could not save request" }, { status: 500 });
    }

    // Return the slot info so the frontend can render the success modal + UPI details
    return Response.json({
      ok: true,
      slot: { date: slot.date, start_time: slot.start_time, end_time: slot.end_time, price: slot.price }
    });

  } catch (err) {
    console.error("public-booking-request:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}