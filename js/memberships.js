// ============================================================
// memberships.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// STUDENT MEMBERSHIPS JS
// =================================================

async function loadStudentMemberships() {
  const res = await fetch("/api/student-memberships");
  allStudentMemberships = await res.json();
  renderStudentMembershipRows(allStudentMemberships);
}

function renderStudentMembershipRows(memberships) {
  window._membershipsFiltered = memberships || [];
  const tbody = document.getElementById("studentMembershipTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!memberships || memberships.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">No memberships found</td></tr>`;
    document.getElementById("membershipsPagination").innerHTML = "";
    return;
  }
  const { items, page, totalPages } = paginateArray(memberships, 'memberships');
  items.forEach(m => {
    const studentName = m.students ? `${m.students.first_name} ${m.students.last_name || ""}` : "N/A";
    const planName = m.membership_plans ? m.membership_plans.name : "N/A";
    const batch = (window.allBatches || []).find(b => b.id === m.batch_id);
    const batchName = batch ? batch.batch_name : `<span class="text-muted">Not set</span>`;
    const safeStudentName = (studentName || "").replace(/'/g, "");
    const safeBatchName = (batch ? batch.batch_name : "").replace(/'/g, "");
    const payNowBtn = m.status === 'expired'
      ? `<button class="btn btn-warning btn-sm me-1" onclick="openMarkPaid(${m.student_id}, '${safeStudentName}', ${m.final_amount || 0}, ${m.id}, '${safeBatchName}')"><i class="bi bi-cash-coin"></i> Pay Now</button>`
      : "";
    tbody.innerHTML += `
      <tr>
        <td>${m.id}</td>
        <td>${studentName}</td>
        <td>${planName}</td>
        <td>${batchName}</td>
        <td>${m.start_date || ""}</td>
        <td>${m.end_date || ""}</td>
        <td>₹${m.final_amount || 0}</td>
        <td><span class="badge ${m.status === 'active' ? 'bg-success' : m.status === 'expired' ? 'bg-warning' : 'bg-danger'}">${m.status}</span></td>
        <td>
          ${payNowBtn}
          <button class="btn btn-primary btn-sm me-1" onclick="editStudentMembership(${m.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudentMembership(${m.id})">Delete</button>
        </td>
      </tr>
    `;
  });
  renderPaginationControls("membershipsPagination", "memberships", totalPages, page, "() => renderStudentMembershipRows(window._membershipsFiltered)");
}

let assignMembershipAllStudents = [];
let assignMembershipEnrolledInBatch = [];
let assignMembershipAlreadyHasMembership = [];

async function openAssignMembershipModal() {
  document.getElementById("am-start").value = new Date().toISOString().split('T')[0];
  document.getElementById("am-discount").value = "0";
  document.getElementById("am-notes").value = "";
  document.getElementById("am-student-search").value = "";
  document.getElementById("am-batch").value = "";

  const planSelect = document.getElementById("am-plan");
  planSelect.innerHTML = '<option value="">Select Plan *</option>';
  (allPlans || []).filter(p => p.status === 'active').forEach(p => {
    planSelect.innerHTML += `<option value="${p.id}" data-amount="${p.amount}">${p.name} - ₹${p.amount} (${p.duration_days} days)</option>`;
  });

  const batchSelect = document.getElementById("am-batch");
  batchSelect.innerHTML = '<option value="">Which Batch is this for? (recommended)</option>';
  (window.allBatches || []).filter(b => b.status === 'active').forEach(b => {
    batchSelect.innerHTML += `<option value="${b.id}">${b.batch_name}</option>`;
  });

  const res = await fetch("/api/students");
  const students = await res.json();
  assignMembershipAllStudents = (students || []).filter(s => s.status === "active");
  assignMembershipEnrolledInBatch = [];
  assignMembershipAlreadyHasMembership = [];

  renderAssignMembershipChecklist();
  new bootstrap.Modal(document.getElementById("assignMembershipModal")).show();
}

async function onAssignMembershipBatchChange() {
  const batchId = document.getElementById("am-batch").value;

  if (!batchId) {
    assignMembershipEnrolledInBatch = [];
    assignMembershipAlreadyHasMembership = [];
    renderAssignMembershipChecklist();
    return;
  }

  const res = await fetch(`/api/student-batches?batch_id=${batchId}&status=eq.active`);
  const enrolled = await res.json();
  assignMembershipEnrolledInBatch = (enrolled || []).map(sb => sb.student_id);

  // Students who already have an active membership for THIS batch specifically
  assignMembershipAlreadyHasMembership = (allStudentMemberships || [])
    .filter(m => m.batch_id == batchId && m.status === 'active')
    .map(m => m.student_id);

  renderAssignMembershipChecklist();
}

function renderAssignMembershipChecklist() {
  const q = (document.getElementById("am-student-search").value || "").toLowerCase();
  const container = document.getElementById("am-student-checklist");

  const list = assignMembershipAllStudents.filter(s =>
    `${s.first_name} ${s.last_name || ""}`.toLowerCase().includes(q) || (s.mobile || "").includes(q)
  );

  if (list.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No students found</div>`;
    updateAssignMembershipSelectedCount();
    return;
  }

  container.innerHTML = list.map(s => {
    const alreadyHasMembership = assignMembershipAlreadyHasMembership.includes(s.id);
    const inBatch = assignMembershipEnrolledInBatch.includes(s.id);
    // Pre-check students already enrolled in the selected batch (but not ones who
    // already have a membership for it — those are shown disabled instead)
    const preChecked = inBatch && !alreadyHasMembership;

    return `<div class="form-check">
      <input class="form-check-input am-student-checkbox" type="checkbox" value="${s.id}"
        id="am-chk-${s.id}" ${alreadyHasMembership ? "checked disabled" : ""} ${preChecked ? "checked" : ""}
        onchange="updateAssignMembershipSelectedCount()">
      <label class="form-check-label ${alreadyHasMembership ? "text-muted" : ""}" for="am-chk-${s.id}">
        ${s.first_name} ${s.last_name || ""} ${s.mobile ? `(${s.mobile})` : ""} ${alreadyHasMembership ? "— already has a membership for this batch" : ""}
      </label>
    </div>`;
  }).join("");

  updateAssignMembershipSelectedCount();
}

function updateAssignMembershipSelectedCount() {
  const checked = document.querySelectorAll(".am-student-checkbox:checked:not(:disabled)").length;
  document.getElementById("amSelectedCount").textContent = checked;
}

function toggleAllAssignMembershipCheckboxes(checkedState) {
  document.querySelectorAll(".am-student-checkbox:not(:disabled)").forEach(cb => { cb.checked = checkedState; });
  updateAssignMembershipSelectedCount();
}

async function assignSelectedMembership() {
  const planId = document.getElementById("am-plan").value;
  const batchId = document.getElementById("am-batch").value;
  const startDate = document.getElementById("am-start").value;
  const discount = parseFloat(document.getElementById("am-discount").value) || 0;
  const notes = document.getElementById("am-notes").value.trim();
  const checked = [...document.querySelectorAll(".am-student-checkbox:checked:not(:disabled)")];

  if (!planId) { showToast("Please select a plan", "warning"); return; }
  if (!startDate) { showToast("Start date is required", "warning"); return; }
  if (checked.length === 0) { showToast("Select at least one student", "warning"); return; }

  const plan = allPlans.find(p => p.id == planId);
  const finalAmount = plan ? plan.amount - discount : 0;

  let endDate = null;
  if (plan && plan.duration_days) {
    const start = new Date(startDate);
    start.setDate(start.getDate() + plan.duration_days);
    endDate = start.toISOString().split('T')[0];
  }

  showToast(`Assigning membership to ${checked.length} student(s)…`, "success");

  let successCount = 0;
  for (const cb of checked) {
    const data = {
      student_id: parseInt(cb.value),
      plan_id: parseInt(planId),
      batch_id: batchId ? parseInt(batchId) : null,
      start_date: startDate,
      end_date: endDate,
      discount: discount,
      final_amount: finalAmount,
      status: "active",
      notes: notes
    };
    const res = await fetch("/api/student-memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", data })
    });
    if (res.ok) successCount++;
  }

  showToast(`Membership assigned to ${successCount} of ${checked.length} student(s) ✅`);
  bootstrap.Modal.getInstance(document.getElementById("assignMembershipModal"))?.hide();
  loadStudentMemberships();
}

async function editStudentMembership(id) {
  const m = allStudentMemberships.find(x => x.id === id);
  if (!m) return;

  // Populate dropdown OPTIONS first, then set values — setting .value before the
  // <option> elements exist (or while they're being rebuilt) silently does nothing.
  populateStudentList("sm-student");
  populatePlanDropdowns();
  document.getElementById("sm-id").value = m.id;
  document.getElementById("sm-student").value = m.student_id || "";
  document.getElementById("sm-plan").value = m.plan_id || "";
  document.getElementById("sm-start").value = m.start_date || "";
  document.getElementById("sm-discount").value = m.discount || 0;
  document.getElementById("sm-final-amount").value = m.final_amount || "";
  document.getElementById("sm-status").value = m.status || "active";
  document.getElementById("sm-notes").value = m.notes || "";

  await populateBatchOptionsForStudent(m.student_id);
  document.getElementById("sm-batch").value = m.batch_id || "";

  attachMembershipBatchListener();
  new bootstrap.Modal(document.getElementById("membershipEditModal")).show();
}

async function saveStudentMembership() {
  const id = document.getElementById("sm-id").value;
  const studentId = document.getElementById("sm-student").value;
  const planId = document.getElementById("sm-plan").value;
  const startDate = document.getElementById("sm-start").value;

  if (!studentId) { showToast("Please select a student", "warning"); return; }
  if (!planId) { showToast("Please select a plan", "warning"); return; }
  if (!startDate) { showToast("Start date is required", "warning"); return; }

  const discount = parseFloat(document.getElementById("sm-discount").value) || 0;
  const plan = allPlans.find(p => p.id == planId);
  const finalAmount = plan ? plan.amount - discount : 0;
  
  // Calculate end date based on plan duration
  let endDate = null;
  if (plan && plan.duration_days) {
    const start = new Date(startDate);
    start.setDate(start.getDate() + plan.duration_days);
    endDate = start.toISOString().split('T')[0];
  }

  const data = {
    student_id: parseInt(studentId),
    plan_id: parseInt(planId),
    batch_id: document.getElementById("sm-batch").value ? parseInt(document.getElementById("sm-batch").value) : null,
    start_date: startDate,
    end_date: endDate, // ← THIS IS THE NEW LINE
    discount: discount,
    final_amount: finalAmount,
    status: document.getElementById("sm-status").value,
    notes: document.getElementById("sm-notes").value.trim()
  };

  const isEdit = !!id;
  const res = await fetch("/api/student-memberships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast(isEdit ? "Membership updated ✅" : "Membership assigned ✅");
  bootstrap.Modal.getInstance(document.getElementById("membershipEditModal"))?.hide();
  loadStudentMemberships();
}

async function deleteStudentMembership(id) {
  if (!confirm("Delete this membership?")) return;
  const res = await fetch("/api/student-memberships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Membership deleted");
  loadStudentMemberships();
}
