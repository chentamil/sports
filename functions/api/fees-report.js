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

    if (request.method !== "GET") {
      return new Response("Invalid Request", { status: 400 });
    }

    const url = new URL(request.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const batchId = url.searchParams.get("batch_id"); // optional, "all" or numeric id

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    const endDate = new Date(year, mon, 0).toISOString().split("T")[0]; // last day of month

    // 1. Target ENROLLMENTS (student + batch pairs), not just students.
    // A student in 2 batches gets 2 separate rows here — that's the whole point of this fix.
    let enrollmentsUrl = `${SUPABASE_URL}/rest/v1/student_batches?select=student_id,batch_id,students(id,first_name,last_name,mobile,status),batches(batch_name,status)&status=eq.active`;
    if (batchId && batchId !== "all") enrollmentsUrl += `&batch_id=eq.${batchId}`;
    const enrollmentsRes = await fetch(enrollmentsUrl, { headers: authHeaders });
    const enrollmentsRaw = await enrollmentsRes.json();

    // Only active students in active batches
    const enrollments = (enrollmentsRaw || []).filter(e =>
      e.students && e.students.status === "active" && e.batches
    );

    if (enrollments.length === 0) {
      return Response.json({
        month, batchId: batchId || "all",
        paidCount: 0, pendingCount: 0,
        paidStudents: [], pendingStudents: [], transactions: []
      });
    }

    const idsForQuery = [...new Set(enrollments.map(e => e.student_id))];

    // 2. All active memberships for these students (batch-specific + legacy/general ones with no batch set)
    const membershipsUrl = `${SUPABASE_URL}/rest/v1/student_memberships?select=*,membership_plans(name,amount)&student_id=in.(${idsForQuery.join(",")})&order=start_date.desc`;
    const membershipsRes = await fetch(membershipsUrl, { headers: authHeaders });
    const memberships = await membershipsRes.json();

    // Latest membership per (student, batch) — exact match
    const membershipByStudentBatch = {};
    // Latest membership per student with NO batch set — fallback for data created before this feature existed
    const membershipGeneralByStudent = {};

    (memberships || []).forEach(m => {
      if (m.batch_id) {
        const key = `${m.student_id}_${m.batch_id}`;
        if (!membershipByStudentBatch[key]) membershipByStudentBatch[key] = m;
      } else {
        if (!membershipGeneralByStudent[m.student_id]) membershipGeneralByStudent[m.student_id] = m;
      }
    });

    // 3. Completed payments this month for these students
    const paymentsUrl = `${SUPABASE_URL}/rest/v1/fee_payments?select=*,students(first_name,last_name)&status=eq.completed&payment_date=gte.${startDate}&payment_date=lte.${endDate}&student_id=in.(${idsForQuery.join(",")})&order=payment_date.desc`;
    const paymentsRes = await fetch(paymentsUrl, { headers: authHeaders });
    const payments = await paymentsRes.json();

    // A membership is "paid this month" if any completed payment this month points at it
    const paidMembershipIds = new Set(
      payments.filter(p => p.student_membership_id).map(p => p.student_membership_id)
    );
    // Payments with NO membership link at all (old data / quick payments) — still count per student,
    // applied to at most one of that student's enrollments so we don't double-count.
    const unlinkedPaidStudentIds = new Set(
      payments.filter(p => !p.student_membership_id).map(p => p.student_id)
    );
    const unlinkedPaidStudentIdsUsed = new Set();

    const paidStudents = [];
    const pendingStudents = [];

    enrollments.forEach(e => {
      const s = e.students;
      const batchName = e.batches.batch_name;
      const name = `${s.first_name} ${s.last_name || ""}`.trim();

      const exactKey = `${e.student_id}_${e.batch_id}`;
      const membership = membershipByStudentBatch[exactKey] || membershipGeneralByStudent[e.student_id] || null;

      let isPaid = false;
      let paidVia = null;

      if (membership && paidMembershipIds.has(membership.id)) {
        isPaid = true;
        paidVia = payments.find(p => p.student_membership_id === membership.id);
      } else if (unlinkedPaidStudentIds.has(e.student_id) && !unlinkedPaidStudentIdsUsed.has(e.student_id)) {
        // Fallback for payments recorded with no membership link — best-effort, applied once
        isPaid = true;
        unlinkedPaidStudentIdsUsed.add(e.student_id);
        paidVia = payments.find(p => p.student_id === e.student_id && !p.student_membership_id);
      }

      if (isPaid) {
        paidStudents.push({
          id: s.id,
          name,
          batch: batchName,
          mobile: s.mobile || "",
          amount: paidVia ? paidVia.amount : (membership ? membership.final_amount : 0),
          payment_date: paidVia ? paidVia.payment_date : ""
        });
      } else {
        pendingStudents.push({
          id: s.id,
          name,
          batch: batchName,
          batchId: e.batch_id,
          membershipId: membership ? membership.id : null,
          mobile: s.mobile || "",
          amount: membership ? (membership.final_amount || (membership.membership_plans && membership.membership_plans.amount) || 0) : 0,
          valid_till: membership ? membership.end_date : null
        });
      }
    });

    const transactions = payments.map(p => ({
      id: p.id,
      date: p.payment_date,
      name: p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "N/A",
      amount: p.amount,
      mode: p.payment_mode,
      receipt: p.receipt_number
    }));

    return Response.json({
      month,
      batchId: batchId || "all",
      paidCount: paidStudents.length,
      pendingCount: pendingStudents.length,
      paidStudents,
      pendingStudents,
      transactions
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
