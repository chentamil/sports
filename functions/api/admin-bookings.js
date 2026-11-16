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
      // ADD GROUP BOOKING (multi-hour)
      // ==================
      if (body.action === "add_group") {
        const d = body.data || {};
        const slot_ids = Array.isArray(d.slot_ids) ? d.slot_ids.map(Number) : [];
        const customer_name   = String(d.customer_name   || "").trim();
        const customer_email  = String(d.customer_email  || "").trim().toLowerCase();
        const customer_mobile = String(d.customer_mobile || "").trim();
        const booking_notes   = String(d.booking_notes   || "").trim() || null;
        const payment_status  = String(d.payment_status  || "pending");

        if (slot_ids.length < 1 || slot_ids.length > 10)
          return new Response("slot_ids must be 1–10 entries", { status: 400 });
        if (!customer_name)   return new Response("Name required",   { status: 400 });
        if (!customer_email)  return new Response("Email required",  { status: 400 });
        if (!customer_mobile) return new Response("Mobile required", { status: 400 });

        // 1. Re-fetch ALL slots from DB — never trust browser
        const sRes = await fetch(
          `${SUPABASE_URL}/rest/v1/slots?id=in.(${slot_ids.join(",")})&select=id,date,court_id,start_time,end_time,price,status`,
          { headers: authHeaders }
        );
        const slots = await sRes.json();

        if (!Array.isArray(slots) || slots.length !== slot_ids.length)
          return new Response("One or more slots not found", { status: 404 });

        if (slots.some(s => s.status !== "available"))
          return new Response("One or more slots are unavailable", { status: 409 });

        // 2. Same date + court
        const dates = new Set(slots.map(s => s.date));
        const courts = new Set(slots.map(s => s.court_id));
        if (dates.size !== 1 || courts.size !== 1)
          return new Response("Slots must be on the same date and court", { status: 400 });

        // 3. Create group
        const total = slots.reduce((sum, s) => sum + Number(s.price || 0), 0);
        const gRes = await fetch(`${SUPABASE_URL}/rest/v1/booking_groups`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify([{
            customer_name, customer_email, customer_mobile, booking_notes,
            payment_status, total_price: total
          }])
        });
        if (!gRes.ok) {
          const t = await gRes.text();
          return new Response("Group insert failed: " + t, { status: 500 });
        }
        const group = (await gRes.json())[0];

        // 4. Insert one bookings row per slot
        const bookingRows = slots.map(s => ({
          slot_id: s.id,
          customer_name, customer_email, customer_mobile, booking_notes,
          payment_status, group_id: group.id
        }));
        const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(bookingRows)
        });
        if (!bRes.ok) {
          const t = await bRes.text();
          // Cleanup: remove the just-created group so it doesn't become orphan
          await fetch(`${SUPABASE_URL}/rest/v1/booking_groups?id=eq.${group.id}`, {
            method: "DELETE", headers: authHeaders
          });
          return new Response("Booking insert failed: " + t, { status: 500 });
        }

        // 5. Flip all slots to booked (single PATCH)
        const flipRes = await fetch(`${SUPABASE_URL}/rest/v1/slots?id=in.(${slot_ids.join(",")})`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "booked" })
        });
        if (!flipRes.ok) {
          return new Response("Slot status update failed", { status: 500 });
        }

        return Response.json({
          ok: true,
          group_id: group.id,
          booking_count: slots.length,
          total_price: total,
          slot_ids
        });
      }


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

        // Look up the booking first
        const lookupRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}&select=slot_id,group_id`,
          { headers: authHeaders }
        );
        const lookupArr = await lookupRes.json();
        const target = lookupArr && lookupArr[0];
        const slotId = target?.slot_id;
        const groupId = target?.group_id;

        // ---- Group delete path ----
        if (groupId) {
          // 1. Fetch all slot_ids in this group BEFORE deleting
          const sibsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/bookings?group_id=eq.${groupId}&select=slot_id`,
            { headers: authHeaders }
          );
          const sibs = await sibsRes.json();
          const allSlotIds = (sibs || []).map(x => x.slot_id).filter(Boolean);

          // 2. Delete the group (cascade removes child bookings)
          const grpDel = await fetch(
            `${SUPABASE_URL}/rest/v1/booking_groups?id=eq.${groupId}`,
            { method: "DELETE", headers: authHeaders }
          );
          if (!grpDel.ok) return new Response("Group delete failed", { status: 500 });

          // 3. Flip all slots to available
          if (allSlotIds.length > 0) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/slots?id=in.(${allSlotIds.join(",")})`,
              {
                method: "PATCH",
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ status: "available" })
              }
            );
          }
          return Response.json({ ok: true, deleted: "group", slot_count: allSlotIds.length });
        }

        // ---- Single delete path ----
        const deleteRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`,
          { method: "DELETE", headers: authHeaders }
        );
        if (!deleteRes.ok) return new Response("Delete failed", { status: 500 });

        if (slotId) {
          await fetch(`${SUPABASE_URL}/rest/v1/slots?id=eq.${slotId}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "available" })
          });
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