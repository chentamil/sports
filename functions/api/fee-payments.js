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

    // GET — list all fee payments with student and membership details
    if (request.method === "GET") {
      const url = new URL(request.url);
      const studentId = url.searchParams.get('student_id');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let queryUrl = `${SUPABASE_URL}/rest/v1/fee_payments?select=*,students(first_name,last_name,mobile,email),student_memberships(plan_id,start_date,end_date)&order=id.desc`;

      if (studentId) {
        queryUrl += `&student_id=eq.${studentId}`;
      }
      if (startDate) {
        queryUrl += `&payment_date=gte.${startDate}`;
      }
      if (endDate) {
        queryUrl += `&payment_date=lte.${endDate}`;
      }

      const res = await fetch(queryUrl, { headers: authHeaders });
      return Response.json(await res.json());
    }

    if (request.method === "POST") {
      const body = await request.json();

      if (body.action === "add") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/fee_payments`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify([body.data])
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }

      if (body.action === "update") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/fee_payments?id=eq.${body.id}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body.data)
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }

      if (body.action === "delete") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/fee_payments?id=eq.${body.id}`, {
          method: "DELETE",
          headers: authHeaders
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}