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
    // GET — LOAD ALL ANNOUNCEMENTS
    // ==================

    if (request.method === "GET") {

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/announcements?select=*&order=id.desc`,
        { headers: authHeaders }
      );

      const data = await response.json();
      return Response.json(data);
    }

    // ==================
    // POST — ADD / UPDATE / DELETE
    // ==================

    if (request.method === "POST") {

      const body = await request.json();

      // ==================
      // ADD ANNOUNCEMENT
      // ==================
      // body.data must include: title, message, start_date, end_date,
      // active, show_in_marquee, show_as_alert

      if (body.action === "add") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/announcements`,
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
      // UPDATE ANNOUNCEMENT
      // ==================
      // body.id = announcement id
      // body.data = fields to update (including show_as_alert, show_in_marquee)

      if (body.action === "update") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/announcements?id=eq.${body.id}`,
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
      // DELETE ANNOUNCEMENT
      // ==================

      if (body.action === "delete") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/announcements?id=eq.${body.id}`,
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

    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );

  }

}