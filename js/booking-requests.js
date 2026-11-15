// ============================================================
// booking-requests.js — Admin UI for public booking requests
// ============================================================

window.allBookingRequests = [];
window._brFilteredCache = [];

// Format date as today by default
function brTodayStr() {
  return new Date().toLocaleDateString("sv-SE");
}

async function loadBookingRequests() {
  const loading = document.getElementById("brLoading");
  if (loading) loading.classList.remove("d-none");
  try {
    const r = await fetch("/api/admin-booking-request", { credentials: "include" });
    if (!r.ok) {
      if (loading) loading.classList.add("d-none");
      return;
    }
    window.allBookingRequests = await r.json();

    // Default: only today's slot dates
    const dateInput = document.getElementById("br-date-filter");
    if (dateInput && !dateInput.value) dateInput.value = brTodayStr();

    renderBookingRequests(window.allBookingRequests);
  } catch (e) {
    if (loading) loading.classList.add("d-none");
    const tb = document.getElementById("brBody");
    if (tb) tb.innerHTML = `<tr><td colspan="8" class="text-danger text-center">${e.message}</td></tr>`;
  }
}

function clearBrDateFilter() {
  const dateInput = document.getElementById("br-date-filter");
  if (dateInput) dateInput.value = "";
  renderBookingRequests(window.allBookingRequests);
}

function escHTML(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])
  );
}

function _brStatusBadge(status) {
  const map = {
    pending:  "bg-warning text-dark",
    accepted: "bg-success",
    declined: "bg-secondary"
  };
  return `<span class="badge ${map[status] || "bg-light"}">${escHTML(status)}</span>`;
}

function _brSlotLine(r) {
  const s = r.slots || {};
  const date = escHTML(s.date || "");
  const time = `${escHTML(s.start_time || "")} - ${escHTML(s.end_time || "")}`;
  const court = escHTML(s.court_id || "");
  const slotId = escHTML(r.slot_id || s.id || "");
  const price = escHTML(s.price || 0);
  return { date, time, court, slotId, price };
}

function renderBookingRequests(list) {
  const desktopBody = document.getElementById("brBody");
  const mobileList  = document.getElementById("brCardList");
  const badge       = document.getElementById("brPendingBadge");
  const loading     = document.getElementById("brLoading");
  const empty       = document.getElementById("brEmpty");
  const countLabel  = document.getElementById("brCountLabel");

  if (loading) loading.classList.add("d-none");

  const dateFilter = document.getElementById("br-date-filter")?.value || "";
  const filtered = (list || []).filter(r => {
    if (!dateFilter) return true;
    const slotDate = r.slots?.date || "";
    return slotDate === dateFilter;
  });

  window._brFilteredCache = filtered;

  // Counts label
  if (countLabel) {
    const total = (list || []).length;
    countLabel.textContent = dateFilter
      ? `Showing ${filtered.length} of ${total} (date: ${dateFilter})`
      : `Showing all ${total}`;
  }

  // Pending badge across ALL (not filtered) — admin needs a glance at totals
  const pending = (list || []).filter(r => r.status === "pending");
  if (badge) {
    badge.textContent = pending.length;
    badge.classList.toggle("d-none", pending.length === 0);
  }

  if (!filtered.length) {
    if (empty) empty.classList.remove("d-none");
    if (desktopBody) desktopBody.innerHTML = "";
    if (mobileList) mobileList.innerHTML = "";
    return;
  }
  if (empty) empty.classList.add("d-none");

  // ---- Desktop table ----
  if (desktopBody) {
    desktopBody.innerHTML = filtered.map(r => {
      const sl = _brSlotLine(r);
      const canAct = r.status === "pending"
  && (!r.slots || r.slots.status === undefined || r.slots.status === "available");
      const acceptBtn = r.status === "pending"
        ? (canAct
            ? `<button class="btn btn-success btn-sm" onclick="openAcceptBR(${r.id})" title="Accept"><i class="bi bi-check-lg"></i> Accept</button>`
            : `<button class="btn btn-success btn-sm" disabled title="Slot taken"><i class="bi bi-check-lg"></i> Accept</button>`)
        : "";
      const declineBtn = r.status === "pending"
        ? `<button class="btn btn-outline-danger btn-sm" onclick="declineBR(${r.id})" title="Decline"><i class="bi bi-x-lg"></i></button>`
        : "";
      const editBtn = `<button class="btn btn-outline-primary btn-sm btn-icon-only" onclick="openEditBR(${r.id})" title="Edit"><i class="bi bi-pencil"></i></button>`;
      const deleteBtn = `<button class="btn btn-outline-danger btn-sm btn-icon-only" onclick="deleteBR(${r.id})" title="Delete"><i class="bi bi-trash"></i></button>`;

      return `<tr>
        <td><input type="checkbox" class="br-check" data-id="${r.id}" data-status="${r.status}"></td>
        <td>${r.id}</td>
        <td>
          <div class="fw-semibold">${sl.date}</div>
          <small class="text-muted">${sl.time} · Court ${sl.court}</small><br>
          <small class="text-muted">Slot ID: #${sl.slotId}</small>
        </td>
        <td>${escHTML(r.player_name)}</td>
        <td>
          <a href="mailto:${escHTML(r.player_email)}">${escHTML(r.player_email)}</a><br>
          <a href="tel:${escHTML(r.player_mobile)}">${escHTML(r.player_mobile)}</a>
        </td>
        <td style="max-width:200px;">${escHTML(r.notes || "")}</td>
        <td>${_brStatusBadge(r.status)}</td>
        <td>
          <div class="br-action-group">
            ${acceptBtn}
            ${declineBtn}
            ${editBtn}
            ${deleteBtn}
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  // ---- Mobile cards ----
  if (mobileList) {
    mobileList.innerHTML = filtered.map(r => {
      const sl = _brSlotLine(r);
      const canAct = r.status === "pending"
  && (!r.slots || r.slots.status === undefined || r.slots.status === "available");
      const acceptBtn = r.status === "pending"
        ? (canAct
            ? `<button class="btn btn-success btn-sm flex-fill" onclick="openAcceptBR(${r.id})"><i class="bi bi-check-lg"></i> Accept</button>`
            : `<button class="btn btn-success btn-sm flex-fill" disabled><i class="bi bi-check-lg"></i> Accept</button>`)
        : "";
      const declineBtn = r.status === "pending"
        ? `<button class="btn btn-outline-danger btn-sm flex-fill" onclick="declineBR(${r.id})"><i class="bi bi-x-lg"></i> Decline</button>`
        : "";
      const iconRow = `<div class="d-flex gap-1 mt-2 justify-content-end">
        <button class="btn btn-outline-primary btn-sm btn-icon-only" onclick="openEditBR(${r.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-danger btn-sm btn-icon-only" onclick="deleteBR(${r.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </div>`;

      return `<div class="card shadow-sm border-0 mb-3" style="border-radius:16px;">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-start gap-2">
              <input type="checkbox" class="br-check form-check-input mt-1" data-id="${r.id}" data-status="${r.status}">
              <div>
                <div class="fw-bold">${escHTML(r.player_name)}</div>
                <small class="text-muted">Request #${r.id}</small>
              </div>
            </div>
            ${_brStatusBadge(r.status)}
          </div>
          <div class="mb-2">
            <i class="bi bi-calendar-event me-1"></i>
            <strong>${sl.date}</strong> · ${sl.time}
            <br><i class="bi bi-geo-alt me-1"></i>Court ${sl.court} · ₹${sl.price}
            <br><i class="bi bi-hash me-1"></i><small class="text-muted">Slot ID: #${sl.slotId}</small>
          </div>
          <div class="mb-1 small">
            <a href="mailto:${escHTML(r.player_email)}" class="text-decoration-none"><i class="bi bi-envelope me-1"></i>${escHTML(r.player_email)}</a>
          </div>
          <div class="mb-2 small">
            <a href="tel:${escHTML(r.player_mobile)}" class="text-decoration-none"><i class="bi bi-telephone me-1"></i>${escHTML(r.player_mobile)}</a>
          </div>
          ${r.notes ? `<div class="small text-muted mb-2"><i class="bi bi-chat-left-text me-1"></i>${escHTML(r.notes)}</div>` : ""}
          ${r.status === "pending"
            ? `<div class="d-flex gap-2 mt-2">${acceptBtn}${declineBtn}</div>`
            : ""}
          ${iconRow}
        </div>
      </div>`;
    }).join("");
  }
}

// ---------- Accept flow ----------

async function openAcceptBR(id) {
  // Re-fetch to be sure we're working with fresh data
  let r = window.allBookingRequests.find(x => x.id === id);
  if (!r) {
    // Maybe the cache is stale — refresh from server before giving up
    try {
      const res = await fetch("/api/admin-booking-request", { credentials: "include" });
      if (res.ok) {
        window.allBookingRequests = await res.json();
        r = window.allBookingRequests.find(x => x.id === id);
      }
    } catch (_) {}
  }
  if (!r) { showToast("Request not found", "error"); return; }
  if (r.status !== "pending") { showToast("This request is already " + r.status, "warning"); return; }

  const s = r.slots || {};
  document.getElementById("br-accept-id").value = r.id;
  document.getElementById("br-accept-slot-id").value = r.slot_id;
  document.getElementById("brAcceptSlotInfo").textContent =
    `${s.date || ""} · ${s.start_time || ""} - ${s.end_time || ""} · Court ${s.court_id || ""} · Slot ID #${r.slot_id} · ₹${s.price || 0}`;

  document.getElementById("br-accept-name").value = r.player_name || "";
  document.getElementById("br-accept-mobile").value = r.player_mobile || "";
  document.getElementById("br-accept-email").value = r.player_email || "";
  document.getElementById("br-accept-notes").value = r.notes || "";
  document.getElementById("payment-status-br").value = "pending";
  document.getElementById("br-accept-notify-email").checked = true;

  new bootstrap.Modal(document.getElementById("brAcceptModal")).show();
}

async function confirmAcceptBR() {
  const id = Number(document.getElementById("br-accept-id").value);
  const name = document.getElementById("br-accept-name").value.trim();
  const mobile = document.getElementById("br-accept-mobile").value.trim();
  const email = document.getElementById("br-accept-email").value.trim();
  const notes = document.getElementById("br-accept-notes").value.trim();
  const payment = document.getElementById("payment-status-br").value;
  const notify = document.getElementById("br-accept-notify-email").checked;

  if (!name) return showToast("Name required", "warning");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showToast("Invalid email", "warning");
  if (!/^[0-9+\-\s()]{7,20}$/.test(mobile)) return showToast("Invalid mobile", "warning");

  showProcessing("Accepting request…", "Please wait");

  try {
    const r = await fetch("/api/admin-booking-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "accept",
        id,
        overrides: {
          customer_name: name,
          customer_mobile: mobile,
          customer_email: email,
          booking_notes: notes,
          payment_status: payment
        }
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) {
      showToast(d.error || "Accept failed", "error");
      return;
    }

    // Send confirmation email — same shape as saveBooking in bookings.js.
    // Uses slot_id (SEBA-1243) as required.
    if (notify && email) {
      const req = window.allBookingRequests.find(x => x.id === id);
      const slot = req?.slots || {};
      const bookingIdLabel = `SEBA-${d.slot_id || req?.slot_id || "?"}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#198754;">Booking Confirmed ✅</h2>
          <p>Dear ${escHTML(name)},</p>
          <p>Your court booking is confirmed:</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td><strong>${bookingIdLabel}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666;">Date</td><td>${escHTML(slot.date || "")}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Time</td><td>${escHTML(slot.start_time || "")} - ${escHTML(slot.end_time || "")}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Court</td><td>Court ${escHTML(slot.court_id || "")}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Amount</td><td><strong>₹${escHTML(slot.price || 0)}</strong></td></tr>
          </table>
          <p style="margin-top:16px;">See you on court!</p>
          <p style="color:#888;">Shivani Elite Badminton Academy</p>
        </div>`;
      if (typeof sendMail === "function") {
        sendMail(email, "Booking Confirmed - Shivani Elite Badminton Academy", html);
      }
    }

    bootstrap.Modal.getInstance(document.getElementById("brAcceptModal")).hide();
    showToast("Booking accepted ✅");
    loadBookingRequests();
    if (typeof loadBookings === "function") loadBookings();
    if (typeof loadSlots === "function") loadSlots();
  } finally {
    hideProcessing();
  }
}

// ---------- Decline / delete ----------

async function declineBR(id) {
  if (!confirm("Decline request #" + id + "?")) return;
  await fetch("/api/admin-booking-request", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ action: "decline", id })
  });
  showToast("Declined");
  loadBookingRequests();
}

async function deleteBR(id) {
  if (!confirm("Delete request #" + id + "?")) return;
  await fetch("/api/admin-booking-request", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ action: "delete", id })
  });
  showToast("Deleted");
  loadBookingRequests();
}

// ---------- Edit flow ----------

async function openEditBR(id) {
  let r = window.allBookingRequests.find(x => x.id === id);
  if (!r) {
    try {
      const res = await fetch("/api/admin-booking-request", { credentials: "include" });
      if (res.ok) {
        window.allBookingRequests = await res.json();
        r = window.allBookingRequests.find(x => x.id === id);
      }
    } catch (_) {}
  }
  if (!r) { showToast("Request not found", "error"); return; }
  const s = r.slots || {};
  document.getElementById("br-edit-id").value = r.id;
  document.getElementById("brEditSlotInfo").textContent =
    `${s.date || ""} · ${s.start_time || ""} - ${s.end_time || ""} · Court ${s.court_id || ""} · Slot ID #${r.slot_id || ""}`;
  document.getElementById("br-edit-name").value = r.player_name || "";
  document.getElementById("br-edit-mobile").value = r.player_mobile || "";
  document.getElementById("br-edit-email").value = r.player_email || "";
  document.getElementById("br-edit-notes").value = r.notes || "";
  new bootstrap.Modal(document.getElementById("brEditModal")).show();
}

async function saveBRChanges() {
  const id = Number(document.getElementById("br-edit-id").value);
  const name = document.getElementById("br-edit-name").value.trim();
  const mobile = document.getElementById("br-edit-mobile").value.trim();
  const email = document.getElementById("br-edit-email").value.trim();
  const notes = document.getElementById("br-edit-notes").value.trim();

  if (!name) return showToast("Name required", "warning");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showToast("Invalid email", "warning");
  if (!/^[0-9+\-\s()]{7,20}$/.test(mobile)) return showToast("Invalid mobile", "warning");

  const r = await fetch("/api/admin-booking-request", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({
      action: "update",
      id,
      data: { player_name: name, player_mobile: mobile, player_email: email, notes }
    })
  });
  if (!r.ok) { showToast("Save failed", "error"); return; }
  showToast("Request updated");
  bootstrap.Modal.getInstance(document.getElementById("brEditModal")).hide();
  loadBookingRequests();
}

// ---------- Bulk actions ----------

function toggleAllBR(master) {
  document.querySelectorAll(".br-check").forEach(cb => cb.checked = master.checked);
}

function _selectedBrIds() {
  return [...document.querySelectorAll(".br-check:checked")].map(cb => Number(cb.dataset.id));
}

async function bulkAcceptBR() {
  const ids = _selectedBrIds();
  const pending = ids.filter(id => {
    const r = window.allBookingRequests.find(x => x.id === id);
    // If slot.status isn't loaded (older API payload), trust pending.
    // Server will reject on accept if the slot really isn't available.
    const slotOk = !r?.slots || r.slots.status === undefined || r.slots.status === "available";
    return r && r.status === "pending" && slotOk;
  });
  if (!pending.length) { showToast("No acceptable pending requests selected", "warning"); return; }
  if (!confirm(`Accept ${pending.length} request(s)? A confirmation modal per request will open.`)) return;

  // Use the modal for the first; bulk-accept the rest silently with original data
  openAcceptBR(pending[0]);

  if (pending.length > 1) {
    // Queue the rest to be accepted with their stored details
    window._brBulkQueue = pending.slice(1);
    showToast(`Accept #${pending[0]} first, then the remaining ${pending.length - 1} will follow.`, "info");
  }
}

async function bulkDeleteBR() {
  const ids = _selectedBrIds();
  if (!ids.length) { showToast("None selected", "warning"); return; }
  if (!confirm(`Delete ${ids.length} request(s)?`)) return;
  for (const id of ids) {
    await fetch("/api/admin-booking-request", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action: "delete", id })
    });
  }
  showToast("Deleted " + ids.length);
  loadBookingRequests();
}

async function deleteAllDeclinedBR() {
  const declined = window.allBookingRequests.filter(r => r.status === "declined");
  if (!declined.length) { showToast("No declined requests", "info"); return; }
  if (!confirm(`Delete ${declined.length} declined request(s)?`)) return;
  for (const r of declined) {
    await fetch("/api/admin-booking-request", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action: "delete", id: r.id })
    });
  }
  showToast("Cleaned " + declined.length);
  loadBookingRequests();
}

// Optional auto-polling (kept from previous version)
window._brLastSeenIds = new Set();
window._brPollTimer = null;
function startBrPolling() {
  if (window._brPollTimer) return;
  const tick = async () => {
    if (!document.getElementById("section-booking-requests")) return;
    try {
      const res = await fetch("/api/admin-booking-request", { credentials: "include" });
      if (!res.ok) return;
      const list = await res.json();
      const pending = (list || []).filter(r => r.status === "pending");
      const fresh = pending.filter(r => !window._brLastSeenIds.has(r.id));
      if (window._brLastSeenIds.size > 0 && fresh.length > 0) {
        fresh.forEach(r => {
          if (typeof showToast === "function") showToast(`📥 New request from ${r.player_name || "guest"}`, "info");
        });
      }
      window._brLastSeenIds = new Set(pending.map(r => r.id));
      if (typeof renderBookingRequests === "function") renderBookingRequests(list);
    } catch (_) {}
  };
  tick();
  window._brPollTimer = setInterval(tick, 30000);
}