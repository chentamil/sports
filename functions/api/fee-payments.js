async function applyMembershipRenewal(membershipId, SUPABASE_URL, authHeaders) {
  try {
    const memRes = await fetch(
      `${SUPABASE_URL}/rest/v1/student_memberships?id=eq.${membershipId}&select=id,end_date,plan_id,membership_plans(duration_days)`,
      { headers: authHeaders }
    );
    const memArr = await memRes.json();
    const membership = memArr && memArr[0];

    if (membership && membership.membership_plans && membership.membership_plans.duration_days) {
      const durationDays = membership.membership_plans.duration_days;
      const today = new Date();
      const currentEnd = membership.end_date ? new Date(membership.end_date + "T00:00:00") : today;
      const base = currentEnd > today ? currentEnd : today;
      const newEnd = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const newEndStr = newEnd.toISOString().split("T")[0];

      await fetch(`${SUPABASE_URL}/rest/v1/student_memberships?id=eq.${membership.id}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ end_date: newEndStr, status: "active" })
      });
    }
  } catch (e) {
    // Renewal extension failing shouldn't fail the payment itself.
  }
}

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

      let queryUrl = `${SUPABASE_URL}/rest/v1/fee_payments?select=*,students(first_name,last_name,mobile,email),student_memberships(plan_id,start_date,end_date,membership_plans(name))&order=id.desc`;

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
        if (!res.ok) {
          return new Response("failed", { status: 500 });
        }

        // Auto-renewal: a completed payment linked to a membership extends that
        // membership's end_date by the plan's duration, instead of requiring a
        // manual new membership row every cycle.
        if (body.data.status === "completed" && body.data.student_membership_id) {
          await applyMembershipRenewal(body.data.student_membership_id, SUPABASE_URL, authHeaders);
        }

        return new Response("ok", { status: 200 });
      }

      if (body.action === "update") {
        // Fetch the payment's CURRENT status before changing it, so we can tell whether
        // this edit is genuinely "payment just cleared" (pending → completed) vs just a
        // typo fix on an already-completed payment. Only the former should extend the
        // membership — otherwise editing the same completed receipt twice would double-extend it.
        const beforeRes = await fetch(
          `${SUPABASE_URL}/rest/v1/fee_payments?id=eq.${body.id}&select=status,student_membership_id`,
          { headers: authHeaders }
        );
        const beforeArr = await beforeRes.json();
        const before = beforeArr && beforeArr[0];

        const res = await fetch(`${SUPABASE_URL}/rest/v1/fee_payments?id=eq.${body.id}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body.data)
        });
        if (!res.ok) {
          return new Response("failed", { status: 500 });
        }

        const newlyCompleted = before && before.status !== "completed" && body.data.status === "completed";
        const membershipId = body.data.student_membership_id || (before && before.student_membership_id);
        if (newlyCompleted && membershipId) {
          await applyMembershipRenewal(membershipId, SUPABASE_URL, authHeaders);
        }

        return new Response("ok", { status: 200 });
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