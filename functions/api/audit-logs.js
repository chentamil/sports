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

    if (request.method === "GET") {
      const url = new URL(request.url);
      const tableName = url.searchParams.get('table');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let queryUrl = `${SUPABASE_URL}/rest/v1/audit_logs?select=*&order=created_at.desc`;

      if (tableName) {
        queryUrl += `&table_name=eq.${tableName}`;
      }
      if (startDate) {
        queryUrl += `&created_at=gte.${startDate}`;
      }
      if (endDate) {
        queryUrl += `&created_at=lte.${endDate}`;
      }

      const res = await fetch(queryUrl, { headers: authHeaders });
      const data = await res.json();
      return Response.json(data);
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}