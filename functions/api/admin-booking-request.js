// POST /api/admin-booking-request
// Body: { action: "list" | "accept" | "decline" | "delete", id? }
// Requires acha_access_token cookie.

export async function onRequest(context) {
  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;
  const request = context.request;

  const cookie = request.headers.get("Cookie") || "";
  const tm = cookie.match(/acha_access_token=([^;]+)/);
  if (!tm) return new Response("Unauthorized", { status: 401 });

  const auth = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${tm[1]}`,
    "Content-Type": "application/json"
  };

  try {
    if (request.method === "GET") {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/booking_requests?select=*,slots(date,start_time,end_time,court_id,price)&order=created_at.desc&limit=500`,
        { headers: auth }
      );
      return Response.json(await r.json());
    }

    if (request.method !== "POST") return new Response("Invalid", { status: 400 });
    const body = await request.json();

    if (body.action === "list") {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/booking_requests?select=*,slots(date,start_time,end_time,court_id,price)&order=created_at.desc&limit=500`,
        { headers: auth }
      );
      return Response.json(await r.json());
    }

    if (body.action === "accept") {
      const id = Number(body.id);
      if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

      // 1. Get request + slot
      const rr = await fetch(`${SUPABASE_URL}/rest/v1/booking_requests?id=eq.${id}&select=*,slots(*)`, { headers: auth });
      const req = (await rr.json())[0];
      if (!req) return Response.json({ error: "Not found" }, { status: 404 });
      if (req.status !== "pending") return Response.json({ error: "Already processed" }, { status: 409 });
      if (req.slots.status !== "available") return Response.json({ error: "Slot no longer available" }, { status: 409 });

      // 2. Insert into bookings (same shape as your existing saveBooking)
      const br = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST",
        headers: { ...auth, Prefer: "return=representation" },
        body: JSON.stringify([{
          slot_id: req.slot_id,
          customer_name: req.player_name,
          customer_email: req.player_email,
          customer_mobile: req.player_mobile,
          booking_notes: req.notes,
          payment_status: "pending"
        }])
      });
      if (!br.ok) return Response.json({ error: "Booking insert failed" }, { status: 500 });
      const booking = (await br.json())[0];

      // 3. Flip slot to booked
      await fetch(`${SUPABASE_URL}/rest/v1/slots?id=eq.${req.slot_id}`, {
        method: "PATCH", headers: auth,
        body: JSON.stringify({ status: "booked" })
      });

      // 4. Mark request accepted
      await fetch(`${SUPABASE_URL}/rest/v1/booking_requests?id=eq.${id}`, {
        method: "PATCH", headers: auth,
        body: JSON.stringify({ status: "accepted", booking_id: booking.id, reviewed_at: new Date().toISOString() })
      });

      return Response.json({ ok: true, booking_id: booking.id });
    }

    if (body.action === "decline") {
      const id = Number(body.id);
      await fetch(`${SUPABASE_URL}/rest/v1/booking_requests?id=eq.${id}`, {
        method: "PATCH", headers: auth,
        body: JSON.stringify({ status: "declined", reviewed_at: new Date().toISOString() })
      });
      return Response.json({ ok: true });
    }

    if (body.action === "delete") {
      await fetch(`${SUPABASE_URL}/rest/v1/booking_requests?id=eq.${body.id}`, {
        method: "DELETE", headers: auth
      });
      return Response.json({ ok: true });
    }

    return new Response("Invalid", { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}