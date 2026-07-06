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

    // 1. Target student ids, filtered by batch if given
    let studentIds = null;
    if (batchId && batchId !== "all") {
      const sbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/student_batches?select=student_id&batch_id=eq.${batchId}&status=eq.active`,
        { headers: authHeaders }
      );
      const sb = await sbRes.json();
      studentIds = [...new Set((sb || []).map(r => r.student_id))];

      if (studentIds.length === 0) {
        return Response.json({
          month, batchId: batchId || "all",
          paidCount: 0, pendingCount: 0,
          paidStudents: [], pendingStudents: [], transactions: []
        });
      }
    }

    // 2. Active students in scope
    let studentsUrl = `${SUPABASE_URL}/rest/v1/students?select=id,first_name,last_name,mobile,status&status=eq.active`;
    if (studentIds) studentsUrl += `&id=in.(${studentIds.join(",")})`;
    const studentsRes = await fetch(studentsUrl, { headers: authHeaders });
    const students = await studentsRes.json();
    const idsForQuery = students.map(s => s.id);

    // 3. Completed payments in the selected month, for these students
    let payments = [];
    if (idsForQuery.length) {
      const paymentsUrl = `${SUPABASE_URL}/rest/v1/fee_payments?select=*,students(first_name,last_name)&status=eq.completed&payment_date=gte.${startDate}&payment_date=lte.${endDate}&student_id=in.(${idsForQuery.join(",")})&order=payment_date.desc`;
      const paymentsRes = await fetch(paymentsUrl, { headers: authHeaders });
      payments = await paymentsRes.json();
    }

    const paidStudentIds = new Set(payments.map(p => p.student_id));

    // 4. Latest membership per student (for "valid till" + due amount on pending list)
    let memberships = [];
    if (idsForQuery.length) {
      const membershipsUrl = `${SUPABASE_URL}/rest/v1/student_memberships?select=*,membership_plans(amount)&student_id=in.(${idsForQuery.join(",")})&order=start_date.desc`;
      const membershipsRes = await fetch(membershipsUrl, { headers: authHeaders });
      memberships = await membershipsRes.json();
    }
    const latestMembershipByStudent = {};
    (memberships || []).forEach(m => {
      if (!latestMembershipByStudent[m.student_id]) latestMembershipByStudent[m.student_id] = m;
    });

    const paidStudents = [];
    const pendingStudents = [];

    students.forEach(s => {
      const name = `${s.first_name} ${s.last_name || ""}`.trim();
      if (paidStudentIds.has(s.id)) {
        const pay = payments.find(p => p.student_id === s.id);
        paidStudents.push({
          id: s.id,
          name,
          mobile: s.mobile || "",
          amount: pay ? pay.amount : 0,
          payment_date: pay ? pay.payment_date : ""
        });
      } else {
        const mem = latestMembershipByStudent[s.id];
        pendingStudents.push({
          id: s.id,
          name,
          mobile: s.mobile || "",
          amount: mem ? (mem.final_amount || (mem.membership_plans && mem.membership_plans.amount) || 0) : 0,
          valid_till: mem ? mem.end_date : null
        });
      }
    });

    const transactions = payments.map(p => ({
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
