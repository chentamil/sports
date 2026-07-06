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
      const studentId = url.searchParams.get('student_id');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let response = {};

      // Get student details
      const studentRes = await fetch(
        `${SUPABASE_URL}/rest/v1/students?select=*&id=eq.${studentId}`,
        { headers: authHeaders }
      );
      const student = (await studentRes.json())[0];
      response.student = student;

      // Get attendance records
      let attendanceQuery = `${SUPABASE_URL}/rest/v1/attendance?select=*,batches(batch_name)&student_id=eq.${studentId}`;
      if (startDate) attendanceQuery += `&attendance_date=gte.${startDate}`;
      if (endDate) attendanceQuery += `&attendance_date=lte.${endDate}`;
      
      const attendanceRes = await fetch(attendanceQuery, { headers: authHeaders });
      const attendance = await attendanceRes.json();
      
      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => a.status === 'present').length;
      const absentDays = attendance.filter(a => a.status === 'absent').length;
      const leaveDays = attendance.filter(a => a.status === 'leave').length;
      
      response.attendance = {
        records: attendance,
        summary: {
          total: totalDays,
          present: presentDays,
          absent: absentDays,
          leave: leaveDays,
          percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
        }
      };

      // Get memberships
      const membershipsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/student_memberships?select=*,membership_plans(name,duration_days,amount)&student_id=eq.${studentId}`,
        { headers: authHeaders }
      );
      response.memberships = await membershipsRes.json();

      // Get payments
      let paymentsQuery = `${SUPABASE_URL}/rest/v1/fee_payments?select=*&student_id=eq.${studentId}`;
      if (startDate) paymentsQuery += `&payment_date=gte.${startDate}`;
      if (endDate) paymentsQuery += `&payment_date=lte.${endDate}`;
      
      const paymentsRes = await fetch(paymentsQuery, { headers: authHeaders });
      const payments = await paymentsRes.json();
      
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      response.payments = {
        records: payments,
        summary: {
          total: payments.length,
          totalAmount: totalPaid
        }
      };

      // Get bookings
      const bookingsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=*,slots(date,start_time,end_time,court_id)&student_id=eq.${studentId}`,
        { headers: authHeaders }
      );
      response.bookings = await bookingsRes.json();

      return Response.json(response);
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}