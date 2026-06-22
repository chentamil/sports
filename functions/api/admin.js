export async function onRequest(context) {

  const SUPABASE_URL =
    context.env.SUPABASE_URL;

  const SUPABASE_KEY =
    context.env.SUPABASE_ANON_KEY;

  const request =
    context.request;

  // ==================
  // AUTH CHECK
  // ==================

  const cookie =
    request.headers.get("Cookie") || "";

  const tokenMatch =
    cookie.match(/acha_access_token=([^;]+)/);

  if (!tokenMatch) {
    return new Response("Unauthorized", { status: 401 });
  }

  const accessToken = tokenMatch[1];

  // Shared headers — reused in every fetch below
  const authHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
  };

  try {

    // ==================
    // GET — LOAD ALL SLOTS
    // ==================

    if (request.method === "GET") {

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/slots?select=*&order=date.asc,court_id.asc,start_time.asc`,
        { headers: authHeaders }
      );

      const data = await response.json();
      return Response.json(data);
    }

    // ==================
    // POST — ALL WRITE ACTIONS
    // ==================

    if (request.method === "POST") {

      const body = await request.json();

      // ==================
      // ADD SLOT
      // ==================

      if (body.action === "add") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots`,
          {
            method: "POST",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify([body.data])
          }
        );

        return new Response(
          response.ok ? "ok" : "Add failed",
          { status: response.ok ? 200 : 500 }
        );
      }

      // ==================
      // UPDATE SLOT
      // ==================

      if (body.action === "update") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=eq.${body.id}`,
          {
            method: "PATCH",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body.data)
          }
        );

        return new Response(
          response.ok ? "ok" : "Update failed",
          { status: response.ok ? 200 : 500 }
        );
      }

      // ==================
      // DELETE SLOT
      // ==================

      if (body.action === "delete") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=eq.${body.id}`,
          {
            method: "DELETE",
            headers: authHeaders
          }
        );

        return new Response(
          response.ok ? "ok" : "Delete failed",
          { status: response.ok ? 200 : 500 }
        );
      }

      // ==================
      // BULK DELETE
      // ==================

      if (body.action === "bulkDelete") {

        const ids = body.ids.join(",");

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=in.(${ids})`,
          {
            method: "DELETE",
            headers: authHeaders
          }
        );

        return new Response(
          response.ok ? "ok" : "Bulk delete failed",
          { status: response.ok ? 200 : 500 }
        );
      }

      // ==================
      // BULK STATUS UPDATE
      // ==================

      if (body.action === "bulkStatus") {

        const ids = body.ids.join(",");

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=in.(${ids})`,
          {
            method: "PATCH",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: body.status })
          }
        );

        return new Response(
          response.ok ? "ok" : "Bulk update failed",
          { status: response.ok ? 200 : 500 }
        );
      }

    }

    return new Response("Invalid request", { status: 400 });

  } catch (err) {

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );

  }

}