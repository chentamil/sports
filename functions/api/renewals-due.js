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
    const aheadDays = Math.max(1, Math.min(parseInt(url.searchParams.get("days") || "7", 10), 90));
    const overdueDays = Math.max(0, Math.min(parseInt(url.searchParams.get("overdue_days") || "3", 10), 90));

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const windowStart = new Date(today.getTime() - overdueDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const windowEnd = new Date(today.getTime() + aheadDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const membershipsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/student_memberships?select=id,student_id,end_date,final_amount,students(first_name,last_name,mobile,email,status),membership_plans(name,amount)&end_date=gte.${windowStart}&end_date=lte.${windowEnd}&order=end_date.asc`,
      { headers: authHeaders }
    );
    const memberships = await membershipsRes.json();

    const renewals = (memberships || [])
      .filter(m => m.students && m.students.status === "active")
      .map(m => {
        const name = `${m.students.first_name} ${m.students.last_name || ""}`.trim();
        const end = new Date(m.end_date + "T00:00:00");
        const diffDays = Math.round((end - new Date(todayStr + "T00:00:00")) / (24 * 60 * 60 * 1000));
        return {
          studentId: m.student_id,
          name,
          mobile: m.students.mobile || "",
          email: m.students.email || "",
          planName: (m.membership_plans && m.membership_plans.name) || "Membership",
          amount: m.final_amount || (m.membership_plans && m.membership_plans.amount) || 0,
          endDate: m.end_date,
          daysLeft: diffDays
        };
      });

    return Response.json({ date: todayStr, renewals });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
