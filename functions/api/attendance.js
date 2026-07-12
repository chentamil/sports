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

    // GET — Load attendance for a specific date and optionally filter by batch
    // Example: /api/attendance?date=2026-06-03&batch_id=1
    if (request.method === "GET") {
      const url = new URL(request.url);
      const date = url.searchParams.get('date');
      const batchId = url.searchParams.get('batch_id');

      let queryUrl = `${SUPABASE_URL}/rest/v1/attendance?select=*,students(first_name,last_name),batches(batch_name)&order=student_id.asc`;

      if (date) {
        queryUrl += `&attendance_date=eq.${date}`;
      }
      if (batchId) {
        queryUrl += `&batch_id=eq.${batchId}`;
      }

      const res = await fetch(queryUrl, { headers: authHeaders });
      return Response.json(await res.json());
    }

    if (request.method === "POST") {
      const body = await request.json();

      // BULK UPSERT: This is the best way to handle daily attendance marking.
      // It will insert new records or update existing ones for the date.
      // body.data should be an array of objects: 
      // [ { student_id, batch_id, attendance_date, status, remarks, marked_by }, ... ]
      if (body.action === "bulkUpsert") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance?on_conflict=student_id,batch_id,attendance_date`, {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
            // This is the magic! It tells Supabase to update on conflict,
            // matched against the unique constraint on (student_id, batch_id, attendance_date).
            Prefer: "resolution=merge-duplicates"
          },
          body: JSON.stringify(body.data)
        });
        if (!res.ok) {
          const errText = await res.text();
          return new Response(errText, { status: 500 });
        }
        return new Response("ok", { status: 200 });
      }

      // ADD single (if needed, but bulk is better)
      if (body.action === "add") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify([body.data])
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }

      // UPDATE single
      if (body.action === "update") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance?id=eq.${body.id}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body.data)
        });
        return new Response(res.ok ? "ok" : "failed", { status: res.ok ? 200 : 500 });
      }

      // DELETE
      if (body.action === "delete") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance?id=eq.${body.id}`, {
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