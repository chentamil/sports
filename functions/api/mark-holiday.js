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

    if (request.method !== "POST") {
      return new Response("Invalid Request", { status: 400 });
    }

    const body = await request.json();
    const date = body.date;
    if (!date) {
      return new Response(JSON.stringify({ error: "date is required" }), { status: 400 });
    }

    // 1. Active batches
    const batchesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/batches?select=id&status=eq.active`,
      { headers: authHeaders }
    );
    const batches = await batchesRes.json();
    const batchIds = batches.map(b => b.id);

    if (batchIds.length === 0) {
      return Response.json({ marked: 0, message: "No active batches found" });
    }

    // 2. Active enrollments in those batches
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/student_batches?select=student_id,batch_id&status=eq.active&batch_id=in.(${batchIds.join(",")})`,
      { headers: authHeaders }
    );
    const enrollments = await sbRes.json();

    if (!enrollments || enrollments.length === 0) {
      return Response.json({ marked: 0, message: "No active enrollments found" });
    }

    // 3. Clear any existing attendance for that date (across these batches) to avoid duplicates
    await fetch(
      `${SUPABASE_URL}/rest/v1/attendance?attendance_date=eq.${date}&batch_id=in.(${batchIds.join(",")})`,
      { method: "DELETE", headers: authHeaders }
    );

    // 4. Bulk insert holiday rows
    const rows = enrollments.map(e => ({
      student_id: e.student_id,
      batch_id: e.batch_id,
      attendance_date: date,
      status: "holiday",
      remarks: "Marked as holiday",
      marked_by: "admin"
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(rows)
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }

    return Response.json({ marked: rows.length, date });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
