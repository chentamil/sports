// ============================================================
// dashboard.js — extracted from original superadmin.html (module split)
// Academy-specific dashboard logic only. Generic/shared pieces (pagination,
// dev options, public settings toggle, sendMail) now live in shared-utils.js
// so both booking-admin.html and academy-admin.html can use them.
// ============================================================

function activityIcon(type) {
  if (type === "join") return "🎓";
  if (type === "booking") return "🏸";
  return "💰";
}

async function openAllActivity() {
  const list = document.getElementById("allActivityList");
  list.innerHTML = `<li class="list-group-item text-muted text-center">Loading...</li>`;
  new bootstrap.Modal(document.getElementById("allActivityModal")).show();

  const res = await fetch("/api/activity-feed?limit=50");
  const data = await res.json();
  const activity = data.activity || [];

  if (activity.length === 0) {
    list.innerHTML = `<li class="list-group-item text-muted text-center">No activity yet</li>`;
    return;
  }

  list.innerHTML = activity.map(a => {
    const icon = activityIcon(a.type);
    const when = a.time ? new Date(a.time).toLocaleString() : "";
    return `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span>${icon} ${a.text}</span>
      <small class="text-muted">${when}</small>
    </li>`;
  }).join("");
}

async function loadHomeSummary() {
  const res = await fetch("/api/home-summary");
  const data = await res.json();

  document.getElementById("homeActiveStudents").textContent = data.activeStudents;
  document.getElementById("homeNewStudents").textContent = data.newStudents30;
  document.getElementById("homeActiveBatches").textContent = data.activeBatches;

  const list = document.getElementById("homeActivityList");
  list.innerHTML = "";
  if (!data.activity || data.activity.length === 0) {
    list.innerHTML = `<li class="list-group-item text-muted text-center">No recent activity</li>`;
    return;
  }
  data.activity.forEach(a => {
    const icon = activityIcon(a.type);
    const when = a.time ? new Date(a.time).toLocaleString() : "";
    list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span>${icon} ${a.text}</span>
      <small class="text-muted">${when}</small>
    </li>`;
  });

  // Track newest activity time for realtime-feel polling
  if (data.activity.length > 0) {
    window.lastSeenActivityTime = data.activity[0].time;
  }
}

async function loadDailyReport() {
  const res = await fetch("/api/daily-report");
  const data = await res.json();

  document.getElementById("dailyReportDate").textContent = data.date || "";
  document.getElementById("drNewJoined").textContent = data.newJoinedCount || 0;
  document.getElementById("drFeesPaid").textContent = "₹" + (data.feesPaidToday || 0);
  document.getElementById("drMembershipBooking").textContent = "₹" + (data.membershipBookingToday || 0);
  document.getElementById("drAttendancePercent").textContent = (data.attendancePercentToday || 0) + "%";
  document.getElementById("drCourtBookings").textContent = data.courtBookingsTodayCount || 0;
  document.getElementById("drCourtRevenue").textContent = data.courtBookingRevenueToday || 0;
  document.getElementById("drEnquiryCount").textContent = data.enquiriesTodayCount || 0;

  const body = document.getElementById("drEnquiryBody");
  body.innerHTML = "";
  if (!data.enquiriesToday || data.enquiriesToday.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No enquiries today</td></tr>`;
  } else {
    data.enquiriesToday.forEach(e => {
      body.innerHTML += `<tr>
        <td>${e.batch_name || "-"}</td>
        <td>${e.student_name}</td>
        <td>${e.mobile || "No phone"}</td>
        <td>${e.enquiry_date || ""}</td>
        <td>${e.notes || ""}</td>
      </tr>`;
    });
  }
}

// ---- Realtime-feel updates: poll home summary every 45s and toast on new activity ----
function startRealtimeUpdates() {
  const dot = document.getElementById("liveDot");
  if (dot) dot.style.display = "inline-block";

  setInterval(async () => {
    try {
      const res = await fetch("/api/home-summary");
      const data = await res.json();
      if (!data.activity || data.activity.length === 0) return;

      const newest = data.activity[0];
      if (window.lastSeenActivityTime && newest.time !== window.lastSeenActivityTime) {
        const icon = activityIcon(newest.type);
        showToast(`${icon} ${newest.text}`, "success");
      }
      window.lastSeenActivityTime = newest.time;

      // Refresh the visible numbers quietly
      document.getElementById("homeActiveStudents").textContent = data.activeStudents;
      document.getElementById("homeNewStudents").textContent = data.newStudents30;
      document.getElementById("homeActiveBatches").textContent = data.activeBatches;
      const list = document.getElementById("homeActivityList");
      if (list) {
        list.innerHTML = "";
        data.activity.forEach(a => {
          const ic = activityIcon(a.type);
          const when = a.time ? new Date(a.time).toLocaleString() : "";
          list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
            <span>${ic} ${a.text}</span>
            <small class="text-muted">${when}</small>
          </li>`;
        });
      }
    } catch (e) {
      // silent fail — don't spam the user if a poll fails
    }
  }, 45000);
}

let feesPieChart;
let feesReportData = {};

async function loadFeesReport() {
  const monthInput = document.getElementById("feesReportMonth");
  if (!monthInput.value) {
    monthInput.value = new Date().toISOString().slice(0, 7);
  }
  const month = monthInput.value;
  const batchId = document.getElementById("feesReportBatch").value;

  const res = await fetch(`/api/fees-report?month=${month}&batch_id=${batchId}`);
  feesReportData = await res.json();

  document.getElementById("feesPaidCount").textContent = feesReportData.paidCount;
  document.getElementById("feesPendingCount").textContent = feesReportData.pendingCount;
  document.getElementById("feesListArea").innerHTML = "";

  const ctx = document.getElementById("feesPieChart").getContext("2d");
  if (feesPieChart) feesPieChart.destroy();
  feesPieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Paid", "Unpaid"],
      datasets: [{
        data: [feesReportData.paidCount, feesReportData.pendingCount],
        backgroundColor: ["#198754", "#fd7e14"]
      }]
    },
    options: { responsive: true }
  });
}

function showFeesList(kind) {
  const area = document.getElementById("feesListArea");
  const list = kind === "paid" ? feesReportData.paidStudents : feesReportData.pendingStudents;

  if (!list || list.length === 0) {
    area.innerHTML = `<div class="alert alert-light mt-3">No ${kind} members found.</div>`;
    return;
  }

  let html = `<div class="mt-3"><h6>${list.length} ${kind === "paid" ? "Paid" : "Pending"} enrollment(s)</h6>`;
  html += `<div class="table-responsive"><table class="table table-sm align-middle">`;
  html += `<thead><tr><th>Name</th><th>Batch</th><th>Mobile</th><th>Rs</th>`;
  html += kind === "paid" ? `<th>Paid On</th>` : `<th>Valid Till</th>`;
  html += `<th>Action</th></tr></thead><tbody>`;

  list.forEach(s => {
    const safeName = (s.name || "").replace(/'/g, "");
    html += `<tr>
      <td>${s.name}</td>
      <td><span class="badge bg-secondary">${s.batch || "-"}</span></td>
      <td>${s.mobile || "No phone"}</td>
      <td>₹${s.amount || 0}</td>
      <td>${kind === "paid" ? (s.payment_date || "") : (s.valid_till || "N/A")}</td>
      <td>`;
    if (kind === "pending") {
      html += `<button class="btn btn-success btn-sm me-1" onclick="openMarkPaid(${s.id}, '${safeName}', ${s.amount || 0}, ${s.membershipId || "null"}, '${(s.batch || "").replace(/'/g, "")}')">Mark Paid</button>`;
      if (s.mobile) {
        html += `<button class="btn btn-outline-success btn-sm" onclick="remindNow('${s.mobile}', '${safeName}', ${s.amount || 0}, '${s.valid_till || ""}')">Remind Now</button>`;
      }
    }
    html += `</td></tr>`;
  });

  html += `</tbody></table></div></div>`;
  area.innerHTML = html;
}

function openMarkPaid(studentId, name, amount, membershipId, batchName) {
  document.getElementById("markPaidStudentId").value = studentId;
  document.getElementById("markPaidMembershipId").value = membershipId || "";
  document.getElementById("markPaidStudentName").textContent = batchName ? `${name} (${batchName})` : name;
  document.getElementById("markPaidAmount").value = amount;
  document.getElementById("markPaidDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("markPaidMode").value = "cash";
  document.getElementById("markPaidRemarks").value = batchName ? `Fees For ${batchName}` : "";
  document.getElementById("markPaidEndDate").value = "";
  new bootstrap.Modal(document.getElementById("markPaidModal")).show();
}

async function confirmMarkPaid() {
  const studentId = document.getElementById("markPaidStudentId").value;
  const membershipId = document.getElementById("markPaidMembershipId").value;
  const amount = document.getElementById("markPaidAmount").value;
  const mode = document.getElementById("markPaidMode").value;
  const paymentDate = document.getElementById("markPaidDate").value || new Date().toISOString().split("T")[0];
  const remarks = document.getElementById("markPaidRemarks").value.trim();

  if (!amount) { showToast("Amount is required", "warning"); return; }

  const paymentData = {
    student_id: parseInt(studentId),
    amount: parseFloat(amount),
    payment_date: paymentDate,
    payment_mode: mode,
    status: "completed",
    received_by: "admin",
    remarks: remarks || null
  };
  if (membershipId) paymentData.student_membership_id = parseInt(membershipId);

  const res = await fetch("/api/fee-payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", data: paymentData })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast("Marked as paid ✅");
  bootstrap.Modal.getInstance(document.getElementById("markPaidModal")).hide();

  // Dev-only: manual end_date override, applied AFTER normal auto-renewal so it wins
  const overrideEndDate = document.getElementById("markPaidEndDate")?.value;
  if (overrideEndDate && membershipId) {
    await fetch("/api/student-memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: parseInt(membershipId), data: { end_date: overrideEndDate } })
    });
    document.getElementById("markPaidEndDate").value = "";
  }

  loadFeesReport();
  loadPayments();
  if (typeof loadDailyReport === "function") loadDailyReport();
  if (typeof loadHomeSummary === "function") loadHomeSummary();
  if (typeof loadStudentMemberships === "function") loadStudentMemberships();
}

function remindAllPending() {
  const list = (feesReportData && feesReportData.pendingStudents) || [];
  const withPhone = list.filter(s => s.mobile);
  if (withPhone.length === 0) {
    showToast("No pending students with a phone number", "warning");
    return;
  }
  if (!confirm(`This opens a WhatsApp chat for each of the ${withPhone.length} pending student(s), one after another. You'll still need to tap Send in each. Continue?`)) {
    return;
  }
  withPhone.forEach((s, i) => {
    setTimeout(() => remindNow(s.mobile, s.name, s.amount || 0, s.valid_till || ""), i * 1200);
  });
}

function remindNow(mobile, name, amount, validTill) {
  let phone = (mobile || "").replace(/\D/g, "");
  if (phone.length === 10) phone = "91" + phone;
  const text = `Hi ${name}, this is a reminder that your academy fees of Rs.${amount} is due${validTill ? " (valid till " + validTill + ")" : ""}. Please pay at the earliest. Thank you!`;
  const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
  window.open(url, "_blank");
}

function showAllTransactions() {
  const tbody = document.getElementById("transactionsTableBody");
  tbody.innerHTML = "";
  const txns = (feesReportData && feesReportData.transactions) || [];
  if (txns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No transactions this month</td></tr>`;
  } else {
    txns.forEach(t => {
      tbody.innerHTML += `<tr>
        <td>${t.date}</td>
        <td>${t.name}</td>
        <td>₹${t.amount}</td>
        <td>${t.mode || ""}</td>
        <td><code style="cursor:pointer;color:#0d6efd;text-decoration:underline;" onclick="openReceiptModal(${t.id})">${t.receipt || ""}</code></td>
      </tr>`;
    });
  }
  new bootstrap.Modal(document.getElementById("transactionsModal")).show();
}

async function loadFinancialDashboard() {
  const period = document.getElementById("finance-period").value;
  
  try {
    const res = await fetch(`/api/financial-dashboard?period=${period}`);
    const data = await res.json();
    
    // Update summary cards
    document.getElementById("financeRevenue").textContent = `₹${data.summary.totalRevenue}`;
    document.getElementById("financeExpenses").textContent = `₹${data.summary.totalExpenses}`;
    document.getElementById("financeProfit").textContent = `₹${data.summary.profit}`;
    document.getElementById("financeMargin").textContent = `${data.summary.profitMargin}%`;
    
    // Update breakdown
    document.getElementById("financeBookings").textContent = `₹${data.summary.bookingRevenue}`;
    document.getElementById("financeFees").textContent = `₹${data.summary.feeRevenue}`;
    
    // Render charts
    renderFinanceCharts(data);
    
  } catch (err) {
    console.error('Error loading financial dashboard:', err);
    showToast("Failed to load financial data", "error");
  }
}

function renderFinanceCharts(data) {
  // Destroy old charts
  if (financeChart) {
    financeChart.destroy();
    financeChart = null;
  }
  if (expenseCategoryChart) {
    expenseCategoryChart.destroy();
    expenseCategoryChart = null;
  }

  // Chart 1: Daily Revenue vs Expenses (Line Chart)
  const ctx1 = document.getElementById("financeChart").getContext("2d");
  const labels = data.dailyChartData.map(d => d.date);
  const revenueData = data.dailyChartData.map(d => d.revenue);
  const expenseData = data.dailyChartData.map(d => d.expenses);
  
  financeChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, padding: 10 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: function(value) { return '₹' + value; } }
        }
      }
    }
  });

  // Chart 2: Expenses by Category (Doughnut Chart)
  const ctx2 = document.getElementById("expenseCategoryChart").getContext("2d");
  const categoryLabels = Object.keys(data.expensesByCategory);
  const categoryValues = Object.values(data.expensesByCategory);
  
  const colors = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'
  ];
  
  expenseCategoryChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: categoryLabels.map(label => label + ` (₹${data.expensesByCategory[label]})`),
      datasets: [{
        data: categoryValues,
        backgroundColor: colors.slice(0, categoryLabels.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
        }
      }
    }
  });
}
