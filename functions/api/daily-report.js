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

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const todayStart = `${today}T00:00:00`;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const todayEnd = `${tomorrow}T00:00:00`;

    // 1. New students joined today
    const newJoinedRes = await fetch(
      `${SUPABASE_URL}/rest/v1/students?select=id,first_name,last_name,mobile&joining_date=eq.${today}`,
      { headers: authHeaders }
    );
    const newJoined = await newJoinedRes.json();

    // 2. Fees paid today
    const feesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fee_payments?select=amount&status=eq.completed&payment_date=eq.${today}`,
      { headers: authHeaders }
    );
    const feesToday = await feesRes.json();
    const feesPaidToday = (feesToday || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 3. New membership sign-ups today (revenue)
    const membershipsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/student_memberships?select=final_amount&created_at=gte.${todayStart}&created_at=lt.${todayEnd}`,
      { headers: authHeaders }
    );
    const membershipsToday = await membershipsRes.json();
    const membershipBookingToday = (membershipsToday || []).reduce((sum, m) => sum + Number(m.final_amount || 0), 0);

    // 3b. Court bookings today (status = booked)
    const courtBookingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=id,slots(status,date,price)&created_at=gte.${todayStart}&created_at=lt.${todayEnd}`,
      { headers: authHeaders }
    );
    const courtBookingsRaw = await courtBookingsRes.json();
    const courtBookingsToday = (courtBookingsRaw || []).filter(b => b.slots && b.slots.status === "booked");
    const courtBookingRevenueToday = courtBookingsToday.reduce((sum, b) => sum + Number((b.slots && b.slots.price) || 0), 0);

    // 4. Attendance % today across all batches
    const attRes = await fetch(
      `${SUPABASE_URL}/rest/v1/attendance?select=status&attendance_date=eq.${today}`,
      { headers: authHeaders }
    );
    const attToday = await attRes.json();
    const totalMarked = (attToday || []).length;
    const presentCount = (attToday || []).filter(a => a.status === "present").length;
    const attendancePercentToday = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

    // 5. New enquiries today
    const enqRes = await fetch(
      `${SUPABASE_URL}/rest/v1/enquiries?select=*&created_at=gte.${todayStart}&created_at=lt.${todayEnd}&order=created_at.desc`,
      { headers: authHeaders }
    );
    const enquiriesToday = await enqRes.json();

    return Response.json({
      date: today,
      newJoined,
      newJoinedCount: newJoined.length,
      feesPaidToday,
      feesPaidTodayCount: (feesToday || []).length,
      membershipBookingToday,
      courtBookingsTodayCount: courtBookingsToday.length,
      courtBookingRevenueToday,
      attendancePercentToday,
      attendanceMarkedToday: totalMarked,
      enquiriesToday,
      enquiriesTodayCount: enquiriesToday.length
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
