// ============================================================
// reports.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// REPORTS JS
// =================================================

function populateReportStudentDropdown() {
  const select = document.getElementById("report-student");
  if (!select) return;
  
  // If students are already loaded, use them
  if (window.allStudents && window.allStudents.length > 0) {
    select.innerHTML = '<option value="">Select Student</option>';
    window.allStudents.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.first_name} ${s.last_name || ''} - ${s.mobile || ''}</option>`;
    });
  } else {
    // Fetch students directly
    fetch('/api/students')
      .then(res => res.json())
      .then(students => {
        window.allStudents = students;
        select.innerHTML = '<option value="">Select Student</option>';
        students.forEach(s => {
          select.innerHTML += `<option value="${s.id}">${s.first_name} ${s.last_name || ''} - ${s.mobile || ''}</option>`;
        });
      })
      .catch(err => console.error('Error loading students for report:', err));
  }
}

async function loadStudentReport() {
  const studentId = document.getElementById("report-student").value;
  const startDate = document.getElementById("report-start").value;
  const endDate = document.getElementById("report-end").value;

  if (!studentId) {
    showToast("Please select a student", "warning");
    return;
  }

  try {
    const url = `/api/student-reports?student_id=${studentId}`;
    const res = await fetch(url);
    const data = await res.json();

    document.getElementById("studentReportResult").style.display = "block";
    
    // Update summary cards
    document.getElementById("reportStudentName").textContent = 
      `${data.student?.first_name || ''} ${data.student?.last_name || ''}`;
    document.getElementById("reportAttendance").textContent = 
      `${data.attendance.summary.percentage}% (${data.attendance.summary.present}/${data.attendance.summary.total})`;
    document.getElementById("reportTotalPaid").textContent = 
      `₹${data.payments.summary.totalAmount}`;

    // Build details table
    const tbody = document.getElementById("reportDetailsBody");
    tbody.innerHTML = "";
    
    // Add attendance records
    data.attendance.records.forEach(a => {
      tbody.innerHTML += `
        <tr>
          <td>${a.attendance_date}</td>
          <td><span class="badge ${a.status === 'present' ? 'bg-success' : a.status === 'absent' ? 'bg-danger' : 'bg-warning'}">${a.status}</span></td>
          <td>Attendance - ${a.batches?.batch_name || 'N/A'}</td>
          <td>-</td>
        </tr>
      `;
    });

    // Add payment records
    data.payments.records.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.payment_date}</td>
          <td><span class="badge bg-success">Payment</span></td>
          <td>Receipt: ${p.receipt_number || 'N/A'}</td>
          <td>₹${p.amount}</td>
        </tr>
      `;
    });

    showToast("Report generated successfully ✅");
    window._currentGeneratedReport = data;

  } catch (err) {
    showToast("Failed to load report", "error");
    console.error(err);
  }
}

function sendGeneratedReportEmail() {
  const data = window._currentGeneratedReport;
  if (!data || !data.student) { showToast("Generate a report first", "warning"); return; }
  if (!data.student.email) { showToast("This student has no email on file", "warning"); return; }

  const name = `${data.student.first_name || ""} ${data.student.last_name || ""}`.trim();

  const attRows = (data.attendance.records || []).map(a =>
    `<tr><td style="padding:4px 8px;border:1px solid #eee;">${a.attendance_date}</td><td style="padding:4px 8px;border:1px solid #eee;">${a.status}</td><td style="padding:4px 8px;border:1px solid #eee;">${a.batches?.batch_name || ""}</td></tr>`
  ).join("");

  const payRows = (data.payments.records || []).map(p =>
    `<tr><td style="padding:4px 8px;border:1px solid #eee;">${p.payment_date}</td><td style="padding:4px 8px;border:1px solid #eee;">${p.receipt_number || "N/A"}</td><td style="padding:4px 8px;border:1px solid #eee;">₹${p.amount}</td></tr>`
  ).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
      <h2 style="color:#0d6efd;">Your Report</h2>
      <p>Dear ${name},</p>
      <div style="margin-bottom:12px;">
        <span style="background:#0d6efd;color:#fff;padding:3px 8px;border-radius:4px;">Attendance: ${data.attendance.summary.percentage}%</span>
        <span style="background:#198754;color:#fff;padding:3px 8px;border-radius:4px;margin-left:6px;">Total Paid: ₹${data.payments.summary.totalAmount}</span>
      </div>
      <h4>Attendance</h4>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Date</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Status</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Batch</th></tr></thead>
        <tbody>${attRows || '<tr><td colspan="3" style="text-align:center;color:#888;">No records</td></tr>'}</tbody>
      </table>
      <h4 style="margin-top:16px;">Payments</h4>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Date</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Receipt</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Amount</th></tr></thead>
        <tbody>${payRows || '<tr><td colspan="3" style="text-align:center;color:#888;">No records</td></tr>'}</tbody>
      </table>
      <p style="color:#888;margin-top:16px;">Shivani Elite Badminton Academy</p>
    </div>
  `;

  sendMail(data.student.email, `Your Report - ${name} - Shivani Elite Badminton Academy`, html);
}

async function loadFinancialSummary() {
  const startDate = document.getElementById("finance-report-start").value;
  const endDate = document.getElementById("finance-report-end").value;

  try {
    // Get revenue from fee payments
    let paymentsUrl = '/api/fee-payments';
    if (startDate) paymentsUrl += `?start_date=${startDate}`;
    if (endDate) paymentsUrl += `&end_date=${endDate}`;
    const paymentsRes = await fetch(paymentsUrl);
    let payments = await paymentsRes.json();
    // Ensure payments is an array
    if (!Array.isArray(payments)) {
      payments = [];
    }
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get expenses
    let expensesUrl = '/api/expenses';
    if (startDate) expensesUrl += `?start_date=${startDate}`;
    if (endDate) expensesUrl += `&end_date=${endDate}`;
    const expensesRes = await fetch(expensesUrl);
    let expenses = await expensesRes.json();
    // Ensure expenses is an array
    if (!Array.isArray(expenses)) {
      expenses = [];
    }
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const profit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

    document.getElementById("fsRevenue").textContent = `₹${totalRevenue}`;
    document.getElementById("fsExpenses").textContent = `₹${totalExpenses}`;
    document.getElementById("fsProfit").textContent = `₹${profit}`;
    document.getElementById("fsMargin").textContent = `${margin}%`;

    // Store for CSV export
    window.financialReportData = { startDate, endDate, totalRevenue, totalExpenses, profit, margin, payments, expenses };

    // Render on-screen breakdown table (same data as the CSV export)
    const rows = [];
    payments.forEach(p => rows.push({
      type: "Revenue", date: p.payment_date, category: `Payment - ${p.receipt_number || "N/A"}`, amount: p.amount || 0
    }));
    expenses.forEach(e => rows.push({
      type: "Expense", date: e.expense_date, category: e.category, amount: e.amount || 0
    }));
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById("financialSummaryTableBody");
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No transactions in this range</td></tr>`;
    } else {
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td><span class="badge ${r.type === 'Revenue' ? 'bg-success' : 'bg-danger'}">${r.type}</span></td>
          <td>${r.date || ""}</td>
          <td>${r.category || ""}</td>
          <td class="text-end">₹${r.amount}</td>
        </tr>
      `).join("");
    }

  } catch (err) {
    showToast("Failed to load financial summary", "error");
    console.error(err);
  }
}

function exportFinancialCSV() {
  const data = window.financialReportData;
  if (!data) {
    showToast("Please generate report first", "warning");
    return;
  }

  let csv = "Type,Date,Category,Amount\n";
  
  // Add payments
  data.payments.forEach(p => {
    csv += `Revenue,${p.payment_date},Payment - ${p.receipt_number || 'N/A'},${p.amount}\n`;
  });
  
  // Add expenses
  data.expenses.forEach(e => {
    csv += `Expense,${e.expense_date},${e.category},${e.amount}\n`;
  });

  // Summary
  csv += `\n\nSUMMARY,,,\n`;
  csv += `Total Revenue,,,${data.totalRevenue}\n`;
  csv += `Total Expenses,,,${data.totalExpenses}\n`;
  csv += `Profit,,,${data.profit}\n`;
  csv += `Margin (%),,,${data.margin}\n`;

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast("CSV exported successfully ✅");
}
