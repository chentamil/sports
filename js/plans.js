// ============================================================
// plans.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// MEMBERSHIP PLANS JS
// =================================================

let allPlans = [];
let allStudentMemberships = [];
let allPayments = [];

async function loadPlans() {
  const res = await fetch("/api/membership-plans");
  allPlans = await res.json();
  renderPlanRows(allPlans);
  populatePlanDropdowns();
}

function renderPlanRows(plans) {
  const tbody = document.getElementById("planTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!plans || plans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No plans found</td></tr>`;
    return;
  }
  plans.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.duration_days}</td>
        <td>₹${p.amount}</td>
        <td>${p.description || ""}</td>
        <td><span class="badge ${p.status === 'active' ? 'bg-success' : 'bg-secondary'}">${p.status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm me-1" onclick="editPlan(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePlan(${p.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

function showPlanForm() {
  document.getElementById("plan-id").value = "";
  document.getElementById("plan-name").value = "";
  document.getElementById("plan-duration").value = "";
  document.getElementById("plan-amount").value = "";
  document.getElementById("plan-description").value = "";
  document.getElementById("plan-status").value = "active";
  document.getElementById("planFormModalTitle").textContent = "Add Plan";
  new bootstrap.Modal(document.getElementById("planFormModal")).show();
}

function editPlan(id) {
  const p = allPlans.find(x => x.id === id);
  if (!p) return;
  document.getElementById("plan-id").value = p.id;
  document.getElementById("plan-name").value = p.name || "";
  document.getElementById("plan-duration").value = p.duration_days || "";
  document.getElementById("plan-amount").value = p.amount || "";
  document.getElementById("plan-description").value = p.description || "";
  document.getElementById("plan-status").value = p.status || "active";
  document.getElementById("planFormModalTitle").textContent = "Edit Plan";
  new bootstrap.Modal(document.getElementById("planFormModal")).show();
}

async function savePlan() {
  const id = document.getElementById("plan-id").value;
  const name = document.getElementById("plan-name").value.trim();
  const duration = document.getElementById("plan-duration").value;
  const amount = document.getElementById("plan-amount").value;

  if (!name) { showToast("Plan name is required", "warning"); return; }
  if (!duration) { showToast("Duration is required", "warning"); return; }
  if (!amount) { showToast("Amount is required", "warning"); return; }

  const data = {
    name: name,
    duration_days: parseInt(duration),
    amount: parseFloat(amount),
    description: document.getElementById("plan-description").value.trim(),
    status: document.getElementById("plan-status").value
  };

  const isEdit = !!id;
  const res = await fetch("/api/membership-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast(isEdit ? "Plan updated ✅" : "Plan added ✅");
  bootstrap.Modal.getInstance(document.getElementById("planFormModal"))?.hide();
  loadPlans();
}

async function deletePlan(id) {
  if (!confirm("Delete this plan?")) return;
  const res = await fetch("/api/membership-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Plan deleted");
  loadPlans();
}
