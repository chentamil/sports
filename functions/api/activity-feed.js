export async function onRequest(context) {

  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;
  const request = context.request;

  const cookie = request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/acha_access_token=([^;]+)/);
  if (!tokenMatch) return new Response("Unauthorized", { status: 401 });

  const accessToken = tokenMatch[1];
  const authHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
  };

  try {

    if (request.method !== "GET") {
      return new Response("Invalid Request", { status: 400 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 50);
    // Pull a bit more than `limit` from each source, then merge + trim, so recent events
    // from one source don't get crowded out before merging.
    const fetchLimit = Math.max(limit, 10);

    const [studentsRes, paymentsRes, bookingsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/students?select=id,first_name,last_name,created_at&order=created_at.desc&limit=${fetchLimit}`, { headers: authHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/fee_payments?select=id,amount,created_at,students(first_name,last_name)&status=eq.completed&order=created_at.desc&limit=${fetchLimit}`, { headers: authHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,customer_name,created_at,student_id,students(first_name,last_name),slots(status,date,start_time,end_time,price)&order=created_at.desc&limit=${fetchLimit}`, { headers: authHeaders }),
    ]);

    const students = await studentsRes.json();
    const payments = await paymentsRes.json();
    const bookings = await bookingsRes.json();

    const activity = [];

    (students || []).forEach(s => {
      activity.push({
        type: "join",
        text: `${s.first_name} ${s.last_name || ""} joined`.trim(),
        time: s.created_at
      });
    });

    (payments || []).forEach(p => {
      const name = p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "Someone";
      activity.push({
        type: "payment",
        text: `${name} paid ₹${p.amount}`,
        time: p.created_at
      });
    });

    (bookings || []).forEach(b => {
      if (!b.slots || b.slots.status !== "booked") return; // only confirmed court bookings
      const name = b.students ? `${b.students.first_name} ${b.students.last_name || ""}`.trim() : (b.customer_name || "Guest");
      const when = b.slots.date ? `${b.slots.date} ${b.slots.start_time || ""}-${b.slots.end_time || ""}`.trim() : "";
      activity.push({
        type: "booking",
        text: `${name} booked a court${when ? " for " + when : ""}${b.slots.price ? " (₹" + b.slots.price + ")" : ""}`,
        time: b.created_at
      });
    });

    activity.sort((a, b) => new Date(b.time) - new Date(a.time));

    return Response.json({ activity: activity.slice(0, limit) });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
