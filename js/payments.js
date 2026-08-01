// ============================================================
// payments.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// FEE PAYMENTS JS
// =================================================

async function loadPayments() {
  const res = await fetch("/api/fee-payments");
  allPayments = await res.json();
  renderPaymentRows(allPayments);
}

function renderPaymentRows(payments) {
  window._paymentsFiltered = payments || [];
  const tbody = document.getElementById("paymentTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!payments || payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No payments found</td></tr>`;
    document.getElementById("paymentsPagination").innerHTML = "";
    return;
  }
  const { items, page, totalPages } = paginateArray(payments, 'payments');
  items.forEach(p => {
    const studentName = p.students ? `${p.students.first_name} ${p.students.last_name || ""}` : "N/A";
    tbody.innerHTML += `
      <tr>
        <td><code style="cursor:pointer;color:#0d6efd;text-decoration:underline;" onclick="openReceiptModal(${p.id})">${p.receipt_number || "N/A"}</code></td>
        <td>${studentName}</td>
        <td>₹${p.amount}</td>
        <td>${p.payment_date || ""}</td>
        <td>${p.payment_mode || ""}</td>
        <td><span class="badge ${p.status === 'completed' ? 'bg-success' : p.status === 'pending' ? 'bg-warning' : 'bg-danger'}">${p.status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm me-1" onclick="editPayment(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePayment(${p.id})">Delete</button>
        </td>
      </tr>
    `;
  });
  renderPaginationControls("paymentsPagination", "payments", totalPages, page, "() => renderPaymentRows(window._paymentsFiltered)");
}

function openReceiptModal(paymentId) {
  const p = (window.allPayments || allPayments || []).find(x => x.id === paymentId);
  if (!p) { showToast("Payment details not loaded yet — open Fee Payments tab once and retry", "warning"); return; }
  window._currentReceiptPayment = p;

  const studentName = p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "N/A";
  const planName = (p.student_memberships && p.student_memberships.membership_plans && p.student_memberships.membership_plans.name) || "General Fee";

  document.getElementById("rc-number").textContent = p.receipt_number || "N/A";
  document.getElementById("rc-student").textContent = studentName;
  document.getElementById("rc-mobile").textContent = (p.students && p.students.mobile) || "No phone";
  document.getElementById("rc-category").textContent = planName;
  document.getElementById("rc-date").textContent = p.payment_date || "";
  document.getElementById("rc-mode").textContent = p.payment_mode || "";
  document.getElementById("rc-amount").textContent = "₹" + p.amount;
  document.getElementById("rc-status").innerHTML = `<span class="badge ${p.status === 'completed' ? 'bg-success' : p.status === 'pending' ? 'bg-warning' : 'bg-danger'}">${p.status}</span>`;
  document.getElementById("rc-collected").textContent = p.received_by || "-";
  document.getElementById("rc-remarks").textContent = p.remarks || "-";

  new bootstrap.Modal(document.getElementById("receiptModal")).show();
}

function shareReceiptWhatsApp() {
  const p = window._currentReceiptPayment;
  if (!p) { showToast("Open a receipt first", "warning"); return; }

  const mobile = (p.students && p.students.mobile) || "";
  if (!mobile) { showToast("This student has no mobile number on file", "warning"); return; }

  let phone = mobile.replace(/\D/g, "");
  if (phone.length === 10) phone = "91" + phone;

  const studentName = p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "";
  const planName = (p.student_memberships && p.student_memberships.membership_plans && p.student_memberships.membership_plans.name) || "General Fee";

  const text = `Hi ${studentName}, here is your payment receipt from Shivani Elite Badminton Academy:

Receipt Number: ${p.receipt_number || "N/A"}
Fee Category: ${planName}
Payment Date: ${p.payment_date || ""}
Payment Method: ${p.payment_mode || ""}
Amount: Rs.${p.amount}

Thank you for being with us!`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function sendReceiptEmail() {
  const p = window._currentReceiptPayment;
  if (!p) { showToast("Open a receipt first", "warning"); return; }
  const studentEmail = (p.students && p.students.email) || "";
  if (!studentEmail) { showToast("This student has no email on file", "warning"); return; }

  const studentName = p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "";
  const planName = (p.student_memberships && p.student_memberships.membership_plans && p.student_memberships.membership_plans.name) || "General Fee";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
      <h2 style="color:#198754;">Payment Receipt</h2>
      <p>Dear ${studentName},</p>
      <p>Thank you for your payment. Here are your receipt details:</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#666;">Receipt Number</td><td><strong>${p.receipt_number || "N/A"}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Fee Category</td><td>${planName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Payment Date</td><td>${p.payment_date || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Payment Method</td><td>${p.payment_mode || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Amount</td><td><strong>₹${p.amount}</strong></td></tr>
      </table>
      <p style="margin-top:16px;">Thank you for being with us!</p>
      <p style="color:#888;">Shivani Elite Badminton Academy</p>
    </div>
  `;

  sendMail(studentEmail, `Payment Receipt - ${p.receipt_number || ""} - Shivani Elite Badminton Academy`, html);
}

function emailReceipt() {
  const p = window._currentReceiptPayment;
  if (!p) { showToast("Open a receipt first", "warning"); return; }
  const studentEmail = (p.students && p.students.email) || "";
  if (!studentEmail) { showToast("This student has no email on file", "warning"); return; }

  const studentName = p.students ? `${p.students.first_name} ${p.students.last_name || ""}`.trim() : "";
  const planName = (p.student_memberships && p.student_memberships.membership_plans && p.student_memberships.membership_plans.name) || "General Fee";

  const subject = `Payment Receipt - ${p.receipt_number || ""} - Shivani Elite Badminton Academy`;
  const body = `Dear ${studentName},

Thank you for your payment. Here are your receipt details:

Receipt Number: ${p.receipt_number || "N/A"}
Fee Category: ${planName}
Payment Date: ${p.payment_date || ""}
Payment Method: ${p.payment_mode || ""}
Amount: Rs.${p.amount}

Thank you for being with us!

Shivani Elite Badminton Academy`;

  window.location.href = `mailto:${studentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function printReceipt() {
  const body = document.getElementById("receiptModal").querySelector(".modal-body").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Receipt</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #dee2e6;padding:8px 12px;text-align:left;font-size:14px;}
      th{background:#f1f3f5;width:160px;}
      h2{color:#198754;}
    </style></head>
    <body><h2>Shivani Elite Badminton Academy - Receipt</h2>${body}</body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function showPaymentForm() {
  document.getElementById("payment-id").value = "";
  document.getElementById("pay-amount").value = "";
  document.getElementById("pay-date").value = new Date().toISOString().split('T')[0];
  document.getElementById("pay-mode").value = "cash";
  document.getElementById("pay-reference").value = "";
  document.getElementById("pay-status").value = "completed";
  document.getElementById("pay-remarks").value = "";
  document.getElementById("paymentFormModalTitle").textContent = "Record Payment";
  populatePaymentDropdowns();
  new bootstrap.Modal(document.getElementById("paymentFormModal")).show();
}

function editPayment(id) {
  const p = allPayments.find(x => x.id === id);
  if (!p) return;

  // Populate dropdown OPTIONS first, then set values
  populateStudentList("pay-student");
  const membershipSelect = document.getElementById("pay-membership");
  membershipSelect.innerHTML = '<option value="">Select Membership</option>';
  if (p.student_id && allStudentMemberships) {
    const memberships = allStudentMemberships.filter(m => m.student_id == p.student_id);
    memberships.forEach(m => {
      const plan = allPlans.find(pl => pl.id == m.plan_id);
      membershipSelect.innerHTML += `<option value="${m.id}" data-amount="${m.final_amount || 0}">${plan?.name || 'Plan'} - ₹${m.final_amount}</option>`;
    });
  }

  document.getElementById("payment-id").value = p.id;
  document.getElementById("pay-student").value = p.student_id || "";
  document.getElementById("pay-membership").value = p.student_membership_id || "";
  document.getElementById("pay-amount").value = p.amount || "";
  document.getElementById("pay-date").value = p.payment_date || "";
  document.getElementById("pay-mode").value = p.payment_mode || "cash";
  document.getElementById("pay-reference").value = p.reference_number || "";
  document.getElementById("pay-status").value = p.status || "completed";
  document.getElementById("pay-remarks").value = p.remarks || "";

  attachPaymentListeners();
  document.getElementById("paymentFormModalTitle").textContent = "Edit Payment";
  new bootstrap.Modal(document.getElementById("paymentFormModal")).show();
}

async function savePayment() {
  const id = document.getElementById("payment-id").value;
  const studentId = document.getElementById("pay-student").value;
  const amount = document.getElementById("pay-amount").value;

  if (!studentId) { showToast("Please select a student", "warning"); return; }
  if (!amount) { showToast("Amount is required", "warning"); return; }

  const data = {
    student_id: parseInt(studentId),
    student_membership_id: document.getElementById("pay-membership").value || null,
    amount: parseFloat(amount),
    payment_date: document.getElementById("pay-date").value,
    payment_mode: document.getElementById("pay-mode").value,
    reference_number: document.getElementById("pay-reference").value.trim(),
    status: document.getElementById("pay-status").value,
    remarks: document.getElementById("pay-remarks").value.trim(),
    received_by: "admin"
  };

  const isEdit = !!id;
  const res = await fetch("/api/fee-payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast(isEdit ? "Payment updated ✅" : "Payment recorded ✅");
  bootstrap.Modal.getInstance(document.getElementById("paymentFormModal"))?.hide();
  loadPayments();
  if (typeof loadFeesReport === "function") loadFeesReport();
  if (typeof loadDailyReport === "function") loadDailyReport();
  if (typeof loadHomeSummary === "function") loadHomeSummary();
  if (typeof loadFinancialDashboard === "function") loadFinancialDashboard();
  if (typeof loadStudentMemberships === "function") loadStudentMemberships();
}

async function deletePayment(id) {
  if (!confirm("Delete this payment?")) return;
  const res = await fetch("/api/fee-payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Payment deleted");
  loadPayments();
  if (typeof loadFeesReport === "function") loadFeesReport();
  if (typeof loadDailyReport === "function") loadDailyReport();
}
