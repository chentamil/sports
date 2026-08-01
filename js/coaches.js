// ============================================================
// coaches.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// COACH MANAGEMENT JS
// =================================================

async function loadCoaches() {
  const res = await fetch("/api/coaches");
  window.allCoaches = await res.json();
  renderCoachRows(window.allCoaches);
}

function renderCoachRows(coaches) {
  const tbody = document.getElementById("coachTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!coaches || coaches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No coaches found</td></tr>`;
    return;
  }
  coaches.forEach(c => {
    const handledBatches = (window.allBatches || []).filter(b => b.coach_id === c.id);
    const batchesText = handledBatches.length
      ? handledBatches.map(b => `<span class="badge bg-info text-dark me-1">${b.batch_name}</span>`).join("")
      : `<span class="text-muted small">No batches assigned</span>`;
    tbody.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td>${c.coach_code || ""}</td>
        <td>${c.name}</td>
        <td><a href="tel:${c.mobile}">${c.mobile || ""}</a></td>
        <td>${c.specialization || ""}</td>
        <td>${batchesText}</td>
        <td><span class="badge ${c.status === 'active' ? 'bg-success' : 'bg-secondary'}">${c.status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm me-1" onclick="editCoach(${c.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCoach(${c.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

function showCoachForm() {
  document.getElementById("coach-id").value = "";
  document.getElementById("coach-code").value = "";
  document.getElementById("coach-name").value = "";
  document.getElementById("coach-mobile").value = "";
  document.getElementById("coach-email").value = "";
  document.getElementById("coach-specialization").value = "";
  document.getElementById("coach-join").value = new Date().toISOString().split('T')[0];
  document.getElementById("coach-status").value = "active";
  document.getElementById("coach-notes").value = "";
  document.getElementById("coachFormModalTitle").textContent = "Add Coach";
  new bootstrap.Modal(document.getElementById("coachFormModal")).show();
}

function editCoach(id) {
  const c = window.allCoaches?.find(x => x.id === id);
  if (!c) return;
  document.getElementById("coach-id").value = c.id;
  document.getElementById("coach-code").value = c.coach_code || "";
  document.getElementById("coach-name").value = c.name || "";
  document.getElementById("coach-mobile").value = c.mobile || "";
  document.getElementById("coach-email").value = c.email || "";
  document.getElementById("coach-specialization").value = c.specialization || "";
  document.getElementById("coach-join").value = c.joining_date || "";
  document.getElementById("coach-status").value = c.status || "active";
  document.getElementById("coach-notes").value = c.notes || "";
  document.getElementById("coachFormModalTitle").textContent = "Edit Coach";
  new bootstrap.Modal(document.getElementById("coachFormModal")).show();
}

async function saveCoach() {
  const id = document.getElementById("coach-id").value;
  const name = document.getElementById("coach-name").value.trim();
  if (!name) { showToast("Name is required", "warning"); return; }

  const data = {
    coach_code: document.getElementById("coach-code").value.trim(),
    name: name,
    mobile: document.getElementById("coach-mobile").value.trim(),
    email: document.getElementById("coach-email").value.trim(),
    specialization: document.getElementById("coach-specialization").value.trim(),
    joining_date: document.getElementById("coach-join").value || null,
    status: document.getElementById("coach-status").value,
    notes: document.getElementById("coach-notes").value.trim()
  };

  const isEdit = !!id;
  const res = await fetch("/api/coaches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast(isEdit ? "Coach updated ✅" : "Coach added ✅");
  bootstrap.Modal.getInstance(document.getElementById("coachFormModal"))?.hide();
  loadCoaches();
}

async function deleteCoach(id) {
  if (!confirm("Delete this coach?")) return;
  const res = await fetch("/api/coaches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Coach deleted");
  loadCoaches();
}
