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

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Active students count
    const activeStudentsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/students?select=id&status=eq.active`,
      { headers: { ...authHeaders, Prefer: "count=exact" } }
    );
    const activeStudents = Number(
      (activeStudentsRes.headers.get("content-range") || "0/0").split("/")[1] || 0
    );

    // New students in last 30 days
    const newStudentsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/students?select=id&joining_date=gte.${thirtyStr}`,
      { headers: { ...authHeaders, Prefer: "count=exact" } }
    );
    const newStudents30 = Number(
      (newStudentsRes.headers.get("content-range") || "0/0").split("/")[1] || 0
    );

    // Active batches count
    const activeBatchesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/batches?select=id&status=eq.active`,
      { headers: { ...authHeaders, Prefer: "count=exact" } }
    );
    const activeBatches = Number(
      (activeBatchesRes.headers.get("content-range") || "0/0").split("/")[1] || 0
    );

    // Latest activity: recent joins + recent completed payments + recent court bookings (status=booked)
    const recentStudentsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/students?select=id,first_name,last_name,created_at&order=created_at.desc&limit=10`,
      { headers: authHeaders }
    );
    const recentStudents = await recentStudentsRes.json();

    const recentPaymentsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fee_payments?select=id,amount,created_at,students(first_name,last_name)&status=eq.completed&order=created_at.desc&limit=10`,
      { headers: authHeaders }
    );
    const recentPayments = await recentPaymentsRes.json();

    const recentBookingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=id,customer_name,created_at,students(first_name,last_name),slots(status,date,start_time,end_time,price)&order=created_at.desc&limit=10`,
      { headers: authHeaders }
    );
    const recentBookings = await recentBookingsRes.json();

    const activity = [];

    (recentStudents || []).forEach(s => {
      activity.push({
        type: "join",
        text: `${s.first_name} ${s.last_name || ""} joined`.trim(),
        time: s.created_at
      });
    });

    (recentPayments || []).forEach(p => {
      const name = p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "Someone";
      activity.push({
        type: "payment",
        text: `${name} paid ₹${p.amount}`,
        time: p.created_at
      });
    });

    (recentBookings || []).forEach(b => {
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

    return Response.json({
      activeStudents,
      newStudents30,
      activeBatches,
      activity: activity.slice(0, 5)
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
