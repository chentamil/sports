// ============================================================
// batches.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// BATCH MANAGEMENT JS
// =================================================

async function loadBatches() {
  const res = await fetch("/api/batches");
  window.allBatches = await res.json();
  renderBatchRows(window.allBatches);
  renderBatchCards(window.allBatches);
  populateBatchDropdowns(); // <-- Add this line
  populateFeesReportBatchDropdown();
  if (window.allCoaches) renderCoachRows(window.allCoaches);
  if (typeof allStudentMemberships !== "undefined" && allStudentMemberships.length) renderStudentMembershipRows(allStudentMemberships);
}

function renderBatchCards(batches) {
  const grid = document.getElementById("batchCardGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!batches || batches.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center text-muted py-3">No batches yet. Click "+ Create Batch" to add one.</div>`;
    return;
  }

  batches.forEach(b => {
    const isActive = b.status === "active";
    const timeText = (b.start_time || b.end_time)
      ? `${b.start_time || "?"} - ${b.end_time || "?"}`
      : "Time not set";

    const daysText = (b.days_of_week && b.days_of_week.length)
      ? b.days_of_week.join(", ")
      : "Days not set";

    const coach = (window.allCoaches || []).find(c => c.id === b.coach_id);
    const coachText = coach ? coach.name : "Not assigned";

    grid.innerHTML += `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card p-3 h-100 shadow-sm">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h5 class="mb-0">${b.batch_name}</h5>
            <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${b.status}</span>
          </div>
          <div class="text-muted small mb-1"><i class="bi bi-clock"></i> ${timeText}</div>
          <div class="text-muted small mb-1"><i class="bi bi-calendar-week"></i> 📅 ${daysText}</div>
          <div class="text-muted small mb-1"><i class="bi bi-person-badge"></i> Coach: ${coachText}</div>
          <div class="text-muted small mb-3">${b.description || "No description added"}</div>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-danger btn-sm" onclick="goTakeAttendance(${b.id})">
              <i class="bi bi-check2-square"></i> Take Attendance
            </button>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm flex-fill" onclick="openAddEnquiry(${b.id}, '${(b.batch_name || "").replace(/'/g, "")}')">
                <i class="bi bi-person-plus"></i> Add Enquiry
              </button>
              <button class="btn btn-outline-success btn-sm flex-fill" onclick="openAssignStudentsModal(${b.id}, '${(b.batch_name || "").replace(/'/g, "")}')">
                <i class="bi bi-people"></i> Add Student
              </button>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="editBatch(${b.id})">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-outline-danger btn-sm flex-fill" onclick="deleteBatch(${b.id})">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

function goTakeAttendance(batchId) {
  const sel = document.getElementById("attendance-batch");
  if (sel) sel.value = batchId;
  loadAttendance();
  scrollToSection("section-attendance");
}

function openAddEnquiry(batchId, batchName) {
  document.getElementById("enq-batch-id").value = batchId || "";
  const batchNameInput = document.getElementById("enq-batch-name");
  batchNameInput.value = batchName || "";
  batchNameInput.readOnly = !!batchId;
  batchNameInput.placeholder = batchId ? "" : "Type batch name (optional)";
  document.getElementById("enq-student-name").value = "";
  document.getElementById("enq-mobile").value = "";
  document.getElementById("enq-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("enq-notes").value = "";
  new bootstrap.Modal(document.getElementById("enquiryModal")).show();
}

let allEnquiries = [];

async function loadEnquiries() {
  const res = await fetch("/api/enquiries");
  allEnquiries = await res.json();
  renderEnquiryRows();
}

const ENQUIRY_STATUSES = ["New", "Contacted", "Follow-up", "Interested", "Joined", "Dropped", "Closed"];
const ENQUIRY_STATUS_COLORS = {
  "New": "bg-primary", "Contacted": "bg-info", "Follow-up": "bg-warning",
  "Interested": "bg-success", "Joined": "bg-success", "Dropped": "bg-danger", "Closed": "bg-secondary"
};

function renderEnquiryRows() {
  const tbody = document.getElementById("enquiryTableBody");
  if (!tbody) return;
  const filter = document.getElementById("enq-filter-status")?.value || "all";
  const list = filter === "all" ? allEnquiries : allEnquiries.filter(e => (e.status || "New") === filter);

  tbody.innerHTML = "";
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No enquiries found</td></tr>`;
    document.getElementById("enquiriesPagination").innerHTML = "";
    return;
  }
  const { items, page, totalPages } = paginateArray(list, 'enquiries');
  items.forEach(e => {
    const status = e.status || "New";
    const colorClass = ENQUIRY_STATUS_COLORS[status] || "bg-secondary";
    const options = ENQUIRY_STATUSES.map(s => `<option value="${s}" ${s === status ? "selected" : ""}>${s}</option>`).join("");
    tbody.innerHTML += `<tr>
      <td>${e.batch_name || "-"}</td>
      <td>${e.student_name}</td>
      <td>${e.mobile ? `<a href="tel:${e.mobile}">${e.mobile}</a>` : "No phone"}</td>
      <td>${e.enquiry_date || ""}</td>
      <td>${e.notes || ""}</td>
      <td>
        <select class="form-select form-select-sm ${colorClass} text-white" style="min-width:110px;" onchange="updateEnquiryStatus(${e.id}, this.value)">
          ${options}
        </select>
      </td>
      <td><button class="btn btn-outline-danger btn-sm" onclick="deleteEnquiry(${e.id})"><i class="bi bi-trash"></i></button></td>
    </tr>`;
  });
  renderPaginationControls("enquiriesPagination", "enquiries", totalPages, page, "renderEnquiryRows");
}

async function updateEnquiryStatus(id, status) {
  const res = await fetch("/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, data: { status } })
  });
  if (!res.ok) { showToast("Status update failed", "error"); return; }
  showToast("Status updated ✅");
  const enq = allEnquiries.find(e => e.id === id);
  if (enq) enq.status = status;
  renderEnquiryRows();
}

async function deleteEnquiry(id) {
  if (!confirm("Delete this enquiry?")) return;
  const res = await fetch("/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Enquiry deleted");
  loadEnquiries();
}

async function submitEnquiry() {
  const studentName = document.getElementById("enq-student-name").value.trim();
  if (!studentName) { showToast("Student name is required", "warning"); return; }

  const data = {
    batch_id: document.getElementById("enq-batch-id").value || null,
    batch_name: document.getElementById("enq-batch-name").value || null,
    student_name: studentName,
    mobile: document.getElementById("enq-mobile").value.trim(),
    enquiry_date: document.getElementById("enq-date").value || new Date().toISOString().split("T")[0],
    notes: document.getElementById("enq-notes").value.trim(),
    status: "open"
  };

  const res = await fetch("/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast("Enquiry saved ✅");
  bootstrap.Modal.getInstance(document.getElementById("enquiryModal")).hide();
  if (typeof loadDailyReport === "function") loadDailyReport();
  if (typeof loadEnquiries === "function") loadEnquiries();
}

function populateFeesReportBatchDropdown() {
  const sel = document.getElementById("feesReportBatch");
  if (!sel) return;
  const current = sel.value || "all";
  sel.innerHTML = `<option value="all">All Active Batches</option>`;
  (window.allBatches || []).filter(b => b.status === "active").forEach(b => {
    sel.innerHTML += `<option value="${b.id}">${b.batch_name}</option>`;
  });
  sel.value = current;
}

function renderBatchRows(batches) {
  const tbody = document.getElementById("batchTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!batches || batches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No batches found</td></tr>`;
    return;
  }
  batches.forEach(b => {
    const coachName = b.coaches?.name || "Unassigned";
    const courtName = b.courts?.name || `Court ${b.court_id}`;
    tbody.innerHTML += `
      <tr>
        <td>${b.id}</td>
        <td>${b.batch_name}</td>
        <td>${coachName}</td>
        <td>${courtName}</td>
        <td>${b.start_time || ""} - ${b.end_time || ""}</td>
        <td>${b.days_of_week ? b.days_of_week.join(", ") : ""}</td>
        <td><span class="badge ${b.status === 'active' ? 'bg-success' : 'bg-secondary'}">${b.status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm me-1" onclick="editBatch(${b.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBatch(${b.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

function showBatchForm() {
  document.getElementById("batch-id").value = "";
  document.getElementById("batch-name").value = "";
  document.getElementById("batch-coach").value = "";
  document.getElementById("batch-court").value = "1";
  document.getElementById("batch-start").value = "";
  document.getElementById("batch-end").value = "";
  document.getElementById("batch-days").value = "";
  document.getElementById("batch-capacity").value = "20";
  document.getElementById("batch-status").value = "active";
  document.getElementById("batch-description").value = "";
  populateCoachDropdown();
  document.getElementById("batchFormModalTitle").textContent = "Create Batch";
  document.getElementById("batchEnrolledSection").style.display = "none";
  new bootstrap.Modal(document.getElementById("batchFormModal")).show();
}

function editBatch(id) {
  const b = window.allBatches?.find(x => x.id === id);
  if (!b) return;
  populateCoachDropdown();

  document.getElementById("batch-id").value = b.id;
  document.getElementById("batch-name").value = b.batch_name || "";
  document.getElementById("batch-coach").value = b.coach_id || "";
  document.getElementById("batch-court").value = b.court_id || "1";
  document.getElementById("batch-start").value = b.start_time || "";
  document.getElementById("batch-end").value = b.end_time || "";
  document.getElementById("batch-days").value = b.days_of_week ? b.days_of_week.join(",") : "";
  document.getElementById("batch-capacity").value = b.capacity || "20";
  document.getElementById("batch-status").value = b.status || "active";
  document.getElementById("batch-description").value = b.description || "";
  document.getElementById("batchFormModalTitle").textContent = "Edit Batch";

  document.getElementById("batchEnrolledSection").style.display = "block";
  loadBatchStudents(id);

  new bootstrap.Modal(document.getElementById("batchFormModal")).show();
}

async function saveBatch() {
  const id = document.getElementById("batch-id").value;
  const name = document.getElementById("batch-name").value.trim();
  if (!name) { showToast("Batch name is required", "warning"); return; }

  const daysValue = document.getElementById("batch-days").value.trim();
  const daysArray = daysValue ? daysValue.split(",").map(d => d.trim()) : [];

  const data = {
    batch_name: name,
    coach_id: document.getElementById("batch-coach").value || null,
    court_id: document.getElementById("batch-court").value || null,
    start_time: document.getElementById("batch-start").value || null,
    end_time: document.getElementById("batch-end").value || null,
    days_of_week: daysArray,
    capacity: parseInt(document.getElementById("batch-capacity").value) || 20,
    status: document.getElementById("batch-status").value,
    description: document.getElementById("batch-description").value.trim() || null
  };

  const isEdit = !!id;
  const res = await fetch("/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast(isEdit ? "Batch updated ✅" : "Batch added ✅");
  bootstrap.Modal.getInstance(document.getElementById("batchFormModal"))?.hide();
  loadBatches();
  populateBatchDropdowns();
}

async function deleteBatch(id) {
  if (!confirm("Delete this batch?")) return;
  const res = await fetch("/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Batch deleted");
  loadBatches();
  populateBatchDropdowns();
}

function populateCoachDropdown() {
  const select = document.getElementById("batch-coach");
  select.innerHTML = `<option value="">Select Coach</option>`;
  if (window.allCoaches) {
    window.allCoaches.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  }
}

function populateBatchDropdowns() {
  const select = document.getElementById("attendance-batch");
  select.innerHTML = `<option value="">All Batches</option>`;
  if (window.allBatches) {
    window.allBatches.filter(b => b.status === 'active').forEach(b => {
      select.innerHTML += `<option value="${b.id}">${b.batch_name}</option>`;
    });
  }
}
// 
// Populate student dropdown
let assignModalAllStudents = [];
let assignModalEnrolledIds = [];

async function openAssignStudentsModal(batchId, batchName) {
  if (!batchId) { showToast("Save the batch first, then assign students", "warning"); return; }

  document.getElementById("assign-batch-id").value = batchId;
  document.getElementById("assignModalBatchName").textContent = batchName || "";
  document.getElementById("assign-start").value = new Date().toISOString().split("T")[0];
  document.getElementById("assign-student-search").value = "";

  const [studentsRes, enrolledRes] = await Promise.all([
    fetch("/api/students"),
    fetch(`/api/student-batches?batch_id=${batchId}&status=eq.active`)
  ]);
  const students = await studentsRes.json();
  const enrolled = await enrolledRes.json();

  assignModalAllStudents = (students || []).filter(s => s.status === "active");
  assignModalEnrolledIds = (enrolled || []).map(sb => sb.student_id);

  renderAssignStudentChecklist();
  new bootstrap.Modal(document.getElementById("assignStudentsModal")).show();
}

function renderAssignStudentChecklist() {
  const q = (document.getElementById("assign-student-search").value || "").toLowerCase();
  const container = document.getElementById("assign-student-checklist");

  const list = assignModalAllStudents.filter(s =>
    `${s.first_name} ${s.last_name || ""}`.toLowerCase().includes(q) || (s.mobile || "").includes(q)
  );

  if (list.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No students found</div>`;
    updateAssignSelectedCount();
    return;
  }

  container.innerHTML = list.map(s => {
    const alreadyIn = assignModalEnrolledIds.includes(s.id);
    return `<div class="form-check">
      <input class="form-check-input assign-student-checkbox" type="checkbox" value="${s.id}"
        id="assign-chk-${s.id}" ${alreadyIn ? "checked disabled" : ""} onchange="updateAssignSelectedCount()">
      <label class="form-check-label ${alreadyIn ? "text-muted" : ""}" for="assign-chk-${s.id}">
        ${s.first_name} ${s.last_name || ""} ${s.mobile ? `(${s.mobile})` : ""} ${alreadyIn ? "— already in this batch" : ""}
      </label>
    </div>`;
  }).join("");

  updateAssignSelectedCount();
}

function updateAssignSelectedCount() {
  const checked = document.querySelectorAll(".assign-student-checkbox:checked:not(:disabled)").length;
  document.getElementById("assignSelectedCount").textContent = checked;
}

function toggleAllAssignCheckboxes(checkedState) {
  document.querySelectorAll(".assign-student-checkbox:not(:disabled)").forEach(cb => { cb.checked = checkedState; });
  updateAssignSelectedCount();
}

async function assignSelectedStudentsToBatch() {
  const batchId = document.getElementById("assign-batch-id").value;
  const startDate = document.getElementById("assign-start").value || new Date().toISOString().split("T")[0];
  const checked = [...document.querySelectorAll(".assign-student-checkbox:checked:not(:disabled)")];

  if (checked.length === 0) { showToast("Select at least one student", "warning"); return; }

  showToast(`Assigning ${checked.length} student(s)…`, "success");

  let successCount = 0;
  for (const cb of checked) {
    const res = await fetch("/api/student-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        data: {
          student_id: parseInt(cb.value),
          batch_id: parseInt(batchId),
          start_date: startDate,
          status: "active"
        }
      })
    });
    if (res.ok) successCount++;
  }

  showToast(`${successCount} of ${checked.length} student(s) assigned ✅`);
  bootstrap.Modal.getInstance(document.getElementById("assignStudentsModal"))?.hide();

  loadBatchStudents(batchId);
  loadAttendance();
  loadStudents();
}

// Load students in a batch
async function loadBatchStudents(batchId) {
    const res = await fetch(`/api/student-batches?batch_id=${batchId}&status=eq.active`);
    const data = await res.json();
    const container = document.getElementById('batch-students-list');
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-muted small">No students assigned yet</p>';
        return;
    }
    
    container.innerHTML = `
        <ul class="list-group list-group-flush">
            ${data.map(sb => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${sb.students?.first_name} ${sb.students?.last_name || ''}
                    <button class="btn btn-danger btn-sm" onclick="removeStudentFromBatch(${sb.id})">Remove</button>
                </li>
            `).join('')}
        </ul>
    `;
}

// Remove student from batch
async function removeStudentFromBatch(id) {
    if (!confirm('Remove this student from batch?')) return;
    const res = await fetch('/api/student-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
    });
    if (res.ok) {
        showToast('Student removed');
        loadBatchStudents(document.getElementById('batch-id').value);
    }
}

