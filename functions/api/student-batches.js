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

    // GET — list all student-batch links with student and batch details
    if (request.method === "GET") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/student_batches?select=*,students(first_name,last_name,mobile),batches(batch_name,start_time,end_time,days_of_week)&order=id.desc`,
        { headers: authHeaders }
      );
      return Response.json(await res.json());
    }

    if (request.method === "POST") {
      const body = await request.json();

      // ADD
      if (body.action === "add") {
        // Data should include: { student_id, batch_id, start_date, end_date, status }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/student_batches`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify([body.data])
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }

      // UPDATE
      if (body.action === "update") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/student_batches?id=eq.${body.id}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body.data)
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }

      // DELETE
      if (body.action === "delete") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/student_batches?id=eq.${body.id}`, {
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