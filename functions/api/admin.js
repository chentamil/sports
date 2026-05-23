export async function onRequest(context) {

  const SUPABASE_URL = context.env.SUPABASE_URL;

  const request = context.request;

    const cookie =
    request.headers.get("Cookie") || "";

    const tokenMatch =
    cookie.match(/acha_access_token=([^;]+)/);

    if (!tokenMatch) {

    return new Response("Unauthorized", {
      status: 401
    });

  }

    const accessToken =
        tokenMatch[1];

  const method = request.method;

  try {

    // =========================
    // LOAD SLOTS
    // =========================

    if (method === "GET") {

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/slots?select=*&order=date.asc,court_id.asc,start_time.asc`,
        {
          headers: {
            apikey: context.env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      return Response.json(data);
    }

    // =========================
    // POST ACTIONS
    // =========================

    if (method === "POST") {

          if (!accessToken) {
            return new Response("Unauthorized", {
            status: 401
            });
        }

      const body = await request.json();

      // =====================
      // ADD SLOT
      // =====================

      if (body.action === "add") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots`,
          {
            method: "POST",
            headers: {
              apikey: context.env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify([body.data])
          }
        );

        if (!response.ok) {
          return new Response("Add failed", { status: 500 });
        }

        return new Response("ok");
      }

      // =====================
      // UPDATE SLOT
      // =====================

      if (body.action === "update") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=eq.${body.id}`,
          {
            method: "PATCH",
            headers: {
              apikey: context.env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body.data)
          }
        );

        if (!response.ok) {
          return new Response("Update failed", { status: 500 });
        }

        return new Response("ok");
      }

      // =====================
      // DELETE SLOT
      // =====================

      if (body.action === "delete") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=eq.${body.id}`,
          {
            method: "DELETE",
            headers: {
              apikey: context.env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          return new Response("Delete failed", { status: 500 });
        }

        return new Response("ok");
      }

      // =====================
      // BULK DELETE
      // =====================

      if (body.action === "bulkDelete") {

        const ids = body.ids.join(",");

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=in.(${ids})`,
          {
            method: "DELETE",
            headers: {
              apikey: context.env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          return new Response("Bulk delete failed", { status: 500 });
        }

        return new Response("ok");
      }

      // =====================
      // BULK STATUS UPDATE
      // =====================

      if (body.action === "bulkStatus") {

        const ids = body.ids.join(",");

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=in.(${ids})`,
          {
            method: "PATCH",
            headers: {
              apikey: context.env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              status: body.status
            })
          }
        );

        if (!response.ok) {
          return new Response("Bulk update failed", { status: 500 });
        }

        return new Response("ok");
      }

    }

    return new Response("Invalid request", {
      status: 400
    });

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500
      }
    );
  }
}