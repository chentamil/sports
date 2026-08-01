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
    // GET — LOAD BOOKINGS (joined with slots for date info)
    // ==================
    // CHANGE FROM:
    //   bookings?select=*&order=id.desc
    // CHANGE TO:
    //   bookings?select=*,slots(date,start_time,end_time,court_id)&order=id.desc
    // WHY: Frontend needs slot date to filter today+future bookings.

    if (request.method === "GET") {

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=*,slots(date,start_time,end_time,court_id)&order=id.desc`,
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
      // ADD BOOKING
      // ==================

      if (body.action === "add") {

        const slotId = body.data.slot_id;

        // Prevent double-booking: check if slot already booked
        const existingRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?slot_id=eq.${slotId}&select=id`,
          { headers: authHeaders }
        );

        const existing = await existingRes.json();

        if (existing.length > 0) {
          return new Response("Already booked", { status: 409 });
        }

        // Insert the booking record
        const insertRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings`,
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

        if (!insertRes.ok) {
          return new Response("Booking insert failed", { status: 500 });
        }

        // Auto-mark the slot as booked
        await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=eq.${slotId}`,
          {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "booked" })
          }
        );

        return new Response("ok", { status: 200 });
      }

      // ==================
      // UPDATE BOOKING
      // ==================

      if (body.action === "update") {

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${body.id}`,
          {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(body.data)
          }
        );

        return new Response(
          response.ok ? "ok" : "Update failed",
          { status: response.ok ? 200 : 500 }
        );
      }

      // ==================
      // DELETE BOOKING + REVERT SLOT TO AVAILABLE
      // ==================
      // NEW: Before deleting the booking, we look up the slot_id from the
      // bookings table, then after deletion we PATCH that slot back to
      // status=available. This way the slot reopens automatically.

      if (body.action === "delete") {

        const id = body.id;

        // Step 1: Get the slot_id for this booking before we delete it
        const lookupRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}&select=slot_id`,
          { headers: authHeaders }
        );

        const lookupData = await lookupRes.json();
        const slotId = lookupData?.[0]?.slot_id;

        // Step 2: Delete the booking
        const deleteRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`,
          {
            method: "DELETE",
            headers: authHeaders
          }
        );

        if (!deleteRes.ok) {
          return new Response("Delete failed", { status: 500 });
        }

        // Step 3: Revert slot status back to available (if we found the slot_id)
        if (slotId) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/slots?id=eq.${slotId}`,
            {
              method: "PATCH",
              headers: { ...authHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ status: "available" })
            }
          );
        }

        return new Response("ok", { status: 200 });
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