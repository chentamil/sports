// ============================================================
// students.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// STUDENT MANAGEMENT JS
// =================================================

async function loadStudents() {
  const res = await fetch("/api/students");
  window.allStudents = await res.json();
  filterStudents();
}

function filterStudents() {
  const q = (document.getElementById("stu-search")?.value || "").toLowerCase();
  const list = (window.allStudents || []).filter(s =>
    (s.first_name + " " + (s.last_name||"")).toLowerCase().includes(q) ||
    (s.mobile||"").includes(q)
  );
  window._studentsFiltered = list;
  paginationState.students = 1;
  renderStudentRows();
}

function renderStudentRows() {
  const students = window._studentsFiltered || window.allStudents || [];
  const tbody = document.getElementById("studentTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No students found</td></tr>`;
    document.getElementById("studentsPagination").innerHTML = "";
    return;
  }
  const { items, page, totalPages } = paginateArray(students, 'students');
  items.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.id}</td>
        <td><code>${s.student_code || "-"}</code></td>
        <td><a href="#" onclick="openStudentDetail(${s.id}); return false;">${s.first_name} ${s.last_name || ""}</a></td>
        <td>${s.mobile ? `<a href="tel:${s.mobile}">${s.mobile}</a>` : `<span class="text-muted">No phone</span>`}</td>
        <td>${s.email ? `<a href="mailto:${s.email}">${s.email}</a>` : ""}</td>
        <td>${s.joining_date || ""}</td>
        <td><span class="badge ${s.status === 'active' ? 'bg-success' : 'bg-secondary'}">${s.status}</span></td>
        <td>
          <button class="btn btn-outline-info btn-sm me-1" onclick="openStudentDetail(${s.id})">View</button>
          <button class="btn btn-primary btn-sm me-1" onclick="editStudent(${s.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id})">Delete</button>
        </td>
      </tr>
    `;
  });
  renderPaginationControls("studentsPagination", "students", totalPages, page, "renderStudentRows");
}

// Populate batch dropdown in student form
async function populateBatchDropdown() {
  const res = await fetch('/api/batches');
  const batches = await res.json();
  const select = document.getElementById('stu-batch');
  select.innerHTML = '<option value="">Assign to Batch (Optional)</option>';
  batches.filter(b => b.status === 'active').forEach(b => {
    select.innerHTML += `<option value="${b.id}">${b.batch_name}</option>`;
  });
}

function showStudentForm() {
  document.getElementById("stu-id").value = "";
  document.getElementById("stu-code").value = "";
  document.getElementById("stu-first").value = "";
  document.getElementById("stu-last").value = "";
  document.getElementById("stu-gender").value = "";
  document.getElementById("stu-dob").value = "";
  document.getElementById("stu-mobile").value = "";
  document.getElementById("stu-email").value = "";
  document.getElementById("stu-address").value = "";
  document.getElementById("stu-join").value = new Date().toLocaleDateString("sv-SE");
  document.getElementById("stu-status").value = "active";
  document.getElementById("stu-notes").value = "";
  populateBatchDropdown();
  document.getElementById("studentFormModalTitle").textContent = "Add Student";
  new bootstrap.Modal(document.getElementById("studentFormModal")).show();
}

let currentStudentDetailId = null;

async function openStudentDetail(id) {
  currentStudentDetailId = id;
  const s = (window.allStudents || []).find(x => x.id === id);
  if (!s) return;

  document.getElementById("sd-photo").src = s.photo_url || "https://placehold.co/100x100/E5E7EB/6B7280?text=No+Photo";
  document.getElementById("sd-photo-url").value = s.photo_url || "";
  document.getElementById("sd-photo-edit").style.display = "none";

  // Private photo takes priority if one was uploaded — fetch a fresh signed URL
  if (s.photo_storage_path) {
    fetch(`/api/student-photo?student_id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.url) document.getElementById("sd-photo").src = data.url;
      })
      .catch(() => {});
  }

  document.getElementById("sd-name").textContent = `${s.first_name} ${s.last_name || ""}`.trim();
  const statusBadge = document.getElementById("sd-status");
  statusBadge.textContent = s.status === "active" ? "Active" : "Inactive";
  statusBadge.className = "badge " + (s.status === "active" ? "bg-success" : "bg-secondary");

  document.getElementById("sd-mobile").innerHTML = s.mobile ? s.mobile : `<span class="text-muted">No phone</span>`;
  document.getElementById("sd-email").innerHTML = s.email ? s.email : `<span class="text-muted">No email</span>`;
  document.getElementById("sd-dob").innerHTML = s.date_of_birth ? s.date_of_birth : `<span class="text-muted">Not on file</span>`;

  const callBtn = document.getElementById("sd-call");
  const waBtn = document.getElementById("sd-whatsapp");
  if (s.mobile) {
    callBtn.href = `tel:${s.mobile}`;
    callBtn.classList.remove("disabled");
    let phone = s.mobile.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    const text = `Hi ${s.first_name}, this is Shivani Elite Badminton Academy.`;
    waBtn.href = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
    waBtn.classList.remove("disabled");
  } else {
    callBtn.href = "#";
    callBtn.classList.add("disabled");
    waBtn.href = "#";
    waBtn.classList.add("disabled");
  }

  // Batch enrolled + enrolled days
  const sbRes = await fetch(`/api/student-batches?student_id=${id}&status=active`);
  const sb = await sbRes.json();
  const batchNames = (sb || []).map(r => r.batches && r.batches.batch_name).filter(Boolean);
  document.getElementById("sd-batch").textContent = batchNames.length ? batchNames.join(", ") : "Not enrolled";

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const activeDays = new Set();
  (sb || []).forEach(r => {
    ((r.batches && r.batches.days_of_week) || []).forEach(d => {
      const norm = (d || "").toString().trim().toLowerCase().slice(0, 3);
      const idx = dayKeys.indexOf(norm);
      if (idx >= 0) activeDays.add(idx);
    });
  });
  const daysDiv = document.getElementById("sd-days");
  daysDiv.innerHTML = "";
  dayLabels.forEach((label, idx) => {
    const isActive = activeDays.has(idx);
    daysDiv.innerHTML += `<span style="
      width:28px;height:28px;border-radius:50%;
      display:inline-flex;align-items:center;justify-content:center;
      font-weight:600;font-size:0.8rem;
      background:${isActive ? "#dc3545" : "#e9ecef"};
      color:${isActive ? "#fff" : "#adb5bd"};
    ">${label}</span>`;
  });

  // Attendance + Fees (reuses existing student-reports endpoint)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const repRes = await fetch(`/api/student-reports?student_id=${id}&start_date=${monthStart}&end_date=${monthEnd}`);
  const report = await repRes.json();

  const att = report.attendance || {};
  const attSummary = att.summary || {};
  document.getElementById("sd-attendance-summary").innerHTML =
    `<span class="badge bg-success me-1">Present: ${attSummary.present || 0}</span>
     <span class="badge bg-danger me-1">Absent: ${attSummary.absent || 0}</span>
     <span class="badge bg-warning me-1">Leave: ${attSummary.leave || 0}</span>
     <span class="badge bg-primary">${attSummary.percentage || 0}%</span>`;
  const attBody = document.getElementById("sd-attendance-body");
  attBody.innerHTML = "";
  const attRecords = att.records || [];
  if (attRecords.length === 0) {
    attBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No attendance records</td></tr>`;
  } else {
    attRecords.slice(0, 20).forEach(a => {
      attBody.innerHTML += `<tr><td>${a.attendance_date}</td><td>${(a.batches && a.batches.batch_name) || ""}</td><td>${a.status}</td></tr>`;
    });
  }

  const pay = report.payments || {};
  document.getElementById("sd-fees-summary").innerHTML =
    `<span class="badge bg-success">Total Paid: ₹${(pay.summary && pay.summary.totalAmount) || 0}</span>`;
  const feesBody = document.getElementById("sd-fees-body");
  feesBody.innerHTML = "";
  const payRecords = pay.records || [];
  if (payRecords.length === 0) {
    feesBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No payments recorded</td></tr>`;
  } else {
    payRecords.forEach(p => {
      feesBody.innerHTML += `<tr><td>${p.payment_date}</td><td>₹${p.amount}</td><td>${p.payment_mode}</td><td>${p.status}</td><td><code style="cursor:pointer;color:#0d6efd;text-decoration:underline;" onclick="openReceiptModal(${p.id})">${p.receipt_number || "N/A"}</code></td></tr>`;
    });
  }

  // Stash everything needed for CSV download / print, so those buttons don't need to re-fetch
  window.currentStudentReport = {
    student: s,
    batchNames,
    attSummary,
    attRecords,
    paySummary: pay.summary || {},
    payRecords
  };

  new bootstrap.Modal(document.getElementById("studentDetailModal")).show();
}

function sendAttendanceReportEmail() {
  const data = window.currentStudentReport;
  if (!data) { showToast("Open a student first", "warning"); return; }
  const s = data.student;
  if (!s.email) { showToast("This student has no email on file", "warning"); return; }
  const name = `${s.first_name} ${s.last_name || ""}`.trim();

  const rows = (data.attRecords || []).map(a =>
    `<tr><td style="padding:4px 8px;border:1px solid #eee;">${a.attendance_date}</td><td style="padding:4px 8px;border:1px solid #eee;">${(a.batches && a.batches.batch_name) || ""}</td><td style="padding:4px 8px;border:1px solid #eee;">${a.status}</td></tr>`
  ).join("") || `<tr><td colspan="3" style="padding:8px;text-align:center;color:#888;">No records this month</td></tr>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
      <h2 style="color:#0d6efd;">Attendance Report — This Month</h2>
      <p>Dear ${name},</p>
      <div style="margin-bottom:12px;">
        <span style="background:#198754;color:#fff;padding:3px 8px;border-radius:4px;margin-right:6px;">Present: ${data.attSummary.present || 0}</span>
        <span style="background:#dc3545;color:#fff;padding:3px 8px;border-radius:4px;margin-right:6px;">Absent: ${data.attSummary.absent || 0}</span>
        <span style="background:#ffc107;color:#000;padding:3px 8px;border-radius:4px;margin-right:6px;">Leave: ${data.attSummary.leave || 0}</span>
        <span style="background:#0d6efd;color:#fff;padding:3px 8px;border-radius:4px;">${data.attSummary.percentage || 0}%</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Date</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Batch</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left;">Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#888;margin-top:16px;">Shivani Elite Badminton Academy</p>
    </div>
  `;

  sendMail(s.email, `Attendance Report - ${name} - Shivani Elite Badminton Academy`, html);
}

function sendWelcomeEmail() {
  const data = window.currentStudentReport;
  if (!data) { showToast("Open a student first", "warning"); return; }
  const s = data.student;
  if (!s.email) { showToast("This student has no email on file", "warning"); return; }
  const name = `${s.first_name} ${s.last_name || ""}`.trim();

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
      <h2 style="color:#198754;">Welcome to Shivani Elite Badminton Academy! 🏸</h2>
      <p>Dear ${name},</p>
      <p>We're thrilled to have you join us${data.batchNames && data.batchNames.length ? ` in the <strong>${data.batchNames.join(" / ")}</strong> batch` : ""}.</p>
      <p>Here's what to expect:</p>
      <ul>
        <li>Regular attendance tracking — ask your coach if you ever want to check your record</li>
        <li>Fee reminders will come via WhatsApp/email before your membership expires</li>
        <li>Feel free to reach out to us anytime with questions</li>
      </ul>
      <p style="margin-top:16px;">Looking forward to seeing you on court!</p>
      <p style="color:#888;">Shivani Elite Badminton Academy</p>
    </div>
  `;

  sendMail(s.email, `Welcome to Shivani Elite Badminton Academy, ${s.first_name}!`, html);
}

function downloadStudentReportCSV() {
  const data = window.currentStudentReport;
  if (!data) { showToast("Open a student first", "warning"); return; }
  const s = data.student;
  const name = `${s.first_name} ${s.last_name || ""}`.trim();

  let csv = "Shivani Elite Badminton Academy - Student Report\n";
  csv += `Name,${name}\n`;
  csv += `Mobile,${s.mobile || "No phone"}\n`;
  csv += `Email,${s.email || ""}\n`;
  csv += `Status,${s.status}\n`;
  csv += `Batch,${data.batchNames.join(" / ") || "Not enrolled"}\n\n`;

  csv += "ATTENDANCE\n";
  csv += "Date,Batch,Status\n";
  (data.attRecords || []).forEach(a => {
    csv += `${a.attendance_date},${(a.batches && a.batches.batch_name) || ""},${a.status}\n`;
  });
  csv += `\nPresent,${data.attSummary.present || 0}\n`;
  csv += `Absent,${data.attSummary.absent || 0}\n`;
  csv += `Leave,${data.attSummary.leave || 0}\n`;
  csv += `Attendance %,${data.attSummary.percentage || 0}\n\n`;

  csv += "FEE PAYMENTS\n";
  csv += "Date,Amount,Mode,Status\n";
  (data.payRecords || []).forEach(p => {
    csv += `${p.payment_date},${p.amount},${p.payment_mode},${p.status}\n`;
  });
  csv += `\nTotal Paid,${data.paySummary.totalAmount || 0}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/\s+/g, "_")}_report.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printStudentReport() {
  const data = window.currentStudentReport;
  if (!data) { showToast("Open a student first", "warning"); return; }
  const s = data.student;
  const name = `${s.first_name} ${s.last_name || ""}`.trim();
  const photo = s.photo_url || "https://placehold.co/100x100/E5E7EB/6B7280?text=No+Photo";

  const attRows = (data.attRecords || []).map(a =>
    `<tr><td>${a.attendance_date}</td><td>${(a.batches && a.batches.batch_name) || ""}</td><td>${a.status}</td></tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#888;">No attendance records</td></tr>`;

  const payRows = (data.payRecords || []).map(p =>
    `<tr><td>${p.payment_date}</td><td>₹${p.amount}</td><td>${p.payment_mode}</td><td>${p.status}</td></tr>`
  ).join("") || `<tr><td colspan="4" style="text-align:center;color:#888;">No payments recorded</td></tr>`;

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
    <head>
      <title>${name} - Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #212529; }
        h2 { margin-bottom: 0; }
        .muted { color: #6c757d; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
        th, td { border: 1px solid #dee2e6; padding: 6px 10px; text-align: left; font-size: 14px; }
        th { background: #f1f3f5; }
        .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #198754; padding-bottom: 12px; margin-bottom: 16px; }
        img { border-radius: 50%; width: 70px; height: 70px; object-fit: cover; }
        .badge { display:inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; color:#fff; margin-right:6px; }
        h4 { margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${photo}">
        <div>
          <h2>${name}</h2>
          <div class="muted">${s.mobile || "No phone"} ${s.email ? "&middot; " + s.email : ""}</div>
          <div class="muted">Batch: ${data.batchNames.join(" / ") || "Not enrolled"} &middot; Status: ${s.status}</div>
        </div>
      </div>

      <h4>Attendance</h4>
      <div>
        <span class="badge" style="background:#198754;">Present: ${data.attSummary.present || 0}</span>
        <span class="badge" style="background:#dc3545;">Absent: ${data.attSummary.absent || 0}</span>
        <span class="badge" style="background:#ffc107;color:#000;">Leave: ${data.attSummary.leave || 0}</span>
        <span class="badge" style="background:#0d6efd;">${data.attSummary.percentage || 0}%</span>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Batch</th><th>Status</th></tr></thead>
        <tbody>${attRows}</tbody>
      </table>

      <h4>Fee Payments</h4>
      <div><span class="badge" style="background:#198754;">Total Paid: ₹${data.paySummary.totalAmount || 0}</span></div>
      <table>
        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Status</th></tr></thead>
        <tbody>${payRows}</tbody>
      </table>

      <div class="muted" style="margin-top:24px;font-size:12px;">Generated on ${new Date().toLocaleString()} &middot; Shivani Elite Badminton Academy</div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function toggleEditPhoto() {
  const div = document.getElementById("sd-photo-edit");
  div.style.display = div.style.display === "none" ? "flex" : "none";
}

async function uploadPrivatePhoto() {
  const fileInput = document.getElementById("sd-photo-file");
  const file = fileInput.files[0];
  if (!file) { showToast("Choose a photo first", "warning"); return; }
  if (!file.type.startsWith("image/")) { showToast("Please choose an image file", "warning"); return; }

  showToast("Uploading…", "success");

  const reader = new FileReader();
  reader.onload = async () => {
    const base64Data = reader.result.split(",")[1]; // strip the data:image/...;base64, prefix

    const res = await fetch("/api/student-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: currentStudentDetailId, base64Data, contentType: file.type })
    });
    const result = await res.json();

    if (!res.ok) { showToast("Upload failed: " + (result.error || ""), "error"); return; }

    showToast("Photo uploaded securely ✅");
    document.getElementById("sd-photo-edit").style.display = "none";
    fileInput.value = "";

    // Refresh with a freshly signed URL
    const signedRes = await fetch(`/api/student-photo?student_id=${currentStudentDetailId}`);
    const signedData = await signedRes.json();
    if (signedData.url) document.getElementById("sd-photo").src = signedData.url;

    loadStudents();
  };
  reader.readAsDataURL(file);
}

async function savePhotoUrl() {
  const url = document.getElementById("sd-photo-url").value.trim();
  const res = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id: currentStudentDetailId, data: { photo_url: url } })
  });
  if (!res.ok) { showToast("Photo update failed", "error"); return; }
  showToast("Photo updated ✅");
  document.getElementById("sd-photo").src = url || "https://placehold.co/100x100/E5E7EB/6B7280?text=No+Photo";
  document.getElementById("sd-photo-edit").style.display = "none";
  loadStudents();
}

function editFromDetail() {
  const id = currentStudentDetailId;
  bootstrap.Modal.getInstance(document.getElementById("studentDetailModal")).hide();
  editStudent(id);
}

function editStudent(id) {
  const s = window.allStudents?.find(x => x.id === id);
  if (!s) return;
  document.getElementById("stu-id").value = s.id;
  document.getElementById("stu-code").value = s.student_code || "";
  document.getElementById("stu-first").value = s.first_name || "";
  document.getElementById("stu-last").value = s.last_name || "";
  document.getElementById("stu-gender").value = s.gender || "";
  document.getElementById("stu-dob").value = s.date_of_birth || "";
  document.getElementById("stu-mobile").value = s.mobile || "";
  document.getElementById("stu-email").value = s.email || "";
  document.getElementById("stu-address").value = s.address || "";
  document.getElementById("stu-join").value = s.joining_date || "";
  document.getElementById("stu-status").value = s.status || "active";
  document.getElementById("stu-notes").value = s.notes || "";
  populateBatchDropdown();
  document.getElementById("studentFormModalTitle").textContent = "Edit Student";
  new bootstrap.Modal(document.getElementById("studentFormModal")).show();
}

function generateNextStudentCode() {
  const codes = (window.allStudents || allStudents || [])
    .map(s => (s.student_code || "").match(/^SEBA(\d+)$/i))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10));
  const next = (codes.length ? Math.max(...codes) : 0) + 1;
  return "SEBA" + String(next).padStart(3, "0");
}

async function saveStudent() {
  const id = document.getElementById("stu-id").value;
  const firstName = document.getElementById("stu-first").value.trim();
  const mobile = document.getElementById("stu-mobile").value.trim();

  if (!firstName) { showToast("First name is required", "warning"); return; }
  if (!mobile) { showToast("Mobile is required", "warning"); return; }

  const isEdit = !!id;

  const data = {
    student_code: isEdit
      ? (document.getElementById("stu-code").value.trim() || null)
      : generateNextStudentCode(),
    first_name: firstName,
    last_name: document.getElementById("stu-last").value.trim(),
    gender: document.getElementById("stu-gender").value,
    date_of_birth: document.getElementById("stu-dob").value || null,
    mobile: mobile,
    email: document.getElementById("stu-email").value.trim(),
    address: document.getElementById("stu-address").value.trim(),
    joining_date: document.getElementById("stu-join").value || null,
    status: document.getElementById("stu-status").value,
    notes: document.getElementById("stu-notes").value.trim()
  };

  const res = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  // If adding a new student and batch is selected, assign them
  if (!isEdit) {
    const batchId = document.getElementById('stu-batch').value;
    if (batchId) {
      // Fetch the newly created student to get their ID
      const studentsRes = await fetch("/api/students");
      const allStudents = await studentsRes.json();
      const newStudent = allStudents[0]; // Most recent student is first (ordered by id.desc)
      
      if (newStudent && newStudent.id) {
        await fetch('/api/student-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            data: {
              student_id: newStudent.id,
              batch_id: parseInt(batchId),
              start_date: new Date().toISOString().split('T')[0],
              status: 'active'
            }
          })
        });
        showToast("Student added and assigned to batch ✅");
      } else {
        showToast("Student added ✅");
      }
    } else {
      showToast("Student added ✅");
    }
  } else {
    showToast("Student updated ✅");
  }

  bootstrap.Modal.getInstance(document.getElementById("studentFormModal"))?.hide();
  loadStudents();
  populateBatchDropdowns(); // Refresh batch dropdowns
  loadAttendance(); // Refresh attendance if open
}

async function deleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  const res = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Student deleted");
  loadStudents();
}
