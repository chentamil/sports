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
      const period = url.searchParams.get('period') || 'month'; // 'today', 'week', 'month', 'year'
      
      // Calculate date range
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      let startDate = todayStr;
      let endDate = todayStr;
      
      if (period === 'today') {
        startDate = todayStr;
        endDate = todayStr;
      } else if (period === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
        endDate = todayStr;
      } else if (period === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        endDate = todayStr;
      } else if (period === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        startDate = yearStart.toISOString().split('T')[0];
        endDate = todayStr;
      }

      // 1. Get revenue from bookings (completed payments)
      const bookingsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=id,slot_id,slots(price)&payment_status=eq.paid&created_at=gte.${startDate}&created_at=lte.${endDate}`,
        { headers: authHeaders }
      );
      const bookings = await bookingsRes.json();
      const bookingRevenue = bookings.reduce((sum, b) => sum + (b.slots?.price || 0), 0);

      // 2. Get revenue from fee payments (completed)
      const paymentsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/fee_payments?select=amount&status=eq.completed&payment_date=gte.${startDate}&payment_date=lte.${endDate}`,
        { headers: authHeaders }
      );
      const payments = await paymentsRes.json();
      const feeRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalRevenue = bookingRevenue + feeRevenue;

      // 3. Get expenses
      const expensesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/expenses?select=amount,category&expense_date=gte.${startDate}&expense_date=lte.${endDate}`,
        { headers: authHeaders }
      );
      const expenses = await expensesRes.json();
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      // Group expenses by category
      const expensesByCategory = {};
      expenses.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      });

      // 4. Get daily breakdown for the period
      const dailyRevenueRes = await fetch(
        `${SUPABASE_URL}/rest/v1/fee_payments?select=payment_date,amount&status=eq.completed&payment_date=gte.${startDate}&payment_date=lte.${endDate}&order=payment_date.asc`,
        { headers: authHeaders }
      );
      const dailyRevenue = await dailyRevenueRes.json();
      
      const dailyExpensesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/expenses?select=expense_date,amount&expense_date=gte.${startDate}&expense_date=lte.${endDate}&order=expense_date.asc`,
        { headers: authHeaders }
      );
      const dailyExpenses = await dailyExpensesRes.json();

      // Aggregate daily data
      const dailyData = {};
      dailyRevenue.forEach(d => {
        const date = d.payment_date;
        dailyData[date] = dailyData[date] || { revenue: 0, expenses: 0 };
        dailyData[date].revenue += d.amount;
      });
      dailyExpenses.forEach(d => {
        const date = d.expense_date;
        dailyData[date] = dailyData[date] || { revenue: 0, expenses: 0 };
        dailyData[date].expenses += d.amount;
      });

      const dailyChartData = Object.keys(dailyData).sort().map(date => ({
        date,
        revenue: dailyData[date].revenue,
        expenses: dailyData[date].expenses,
        profit: dailyData[date].revenue - dailyData[date].expenses
      }));

      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

      return Response.json({
        period,
        startDate,
        endDate,
        summary: {
          totalRevenue,
          totalExpenses,
          profit,
          profitMargin,
          bookingRevenue,
          feeRevenue
        },
        expensesByCategory,
        dailyChartData,
        // Counts
        bookingCount: bookings.length,
        paymentCount: payments.length,
        expenseCount: expenses.length
      });
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}