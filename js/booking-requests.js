window.allBookingRequests = [];

async function loadBookingRequests() {
  const tb = document.getElementById("brBody");
  try {
    const r = await fetch("/api/admin-booking-request", { credentials: "include" });
    if (!r.ok) return;
    window.allBookingRequests = await r.json();
    renderBookingRequests(window.allBookingRequests);
  } catch (e) {
    if (tb) tb.innerHTML = `<tr><td colspan="8" class="text-danger text-center">${e.message}</td></tr>`;
  }
}

function renderBookingRequests(list) {
  const tb = document.getElementById("brBody");
  const badge = document.getElementById("brPendingBadge");
  if (!tb) return;

  const pending = list.filter(r => r.status === "pending");
  if (badge) {
    badge.textContent = pending.length;
    badge.classList.toggle("d-none", pending.length === 0);
  }

  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No requests</td></tr>`;
    return;
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  tb.innerHTML = list.map(r => {
    const s = r.slots || {};
    const badgeClass = { pending:"bg-warning text-dark", accepted:"bg-success", declined:"bg-secondary" }[r.status] || "bg-light";
    const canAct = r.status === "pending" && s.status === "available";
    const actions = r.status === "pending"
      ? (canAct
          ? `<button class="btn btn-success btn-sm me-1" onclick="acceptBR(${r.id})">Accept</button>
             <button class="btn btn-outline-danger btn-sm" onclick="declineBR(${r.id})">Decline</button>`
          : `<span class="text-muted small">Slot taken</span>
             <button class="btn btn-outline-danger btn-sm ms-2" onclick="declineBR(${r.id})">Decline</button>`)
      : "—";

    return `<tr>
      <td><input type="checkbox" class="br-check" data-id="${r.id}" data-status="${r.status}"></td>
      <td>${r.id}</td>
      <td>${s.date || ""}<br><small>${s.start_time || ""} - ${s.end_time || ""} · Court ${s.court_id || ""}</small></td>
      <td>${esc(r.player_name)}</td>
      <td><a href="mailto:${esc(r.player_email)}">${esc(r.player_email)}</a><br><a href="tel:${esc(r.player_mobile)}">${esc(r.player_mobile)}</a></td>
      <td style="max-width:200px;">${esc(r.notes || "")}</td>
      <td><span class="badge ${badgeClass}">${r.status}</span></td>
      <td>${actions}</td>
    </tr>`;
  }).join("");
}

async function acceptBR(id) {
  if (!confirm("Accept request #" + id + " and create booking?")) return;
  const r = await fetch("/api/admin-booking-request", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ action: "accept", id })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { showToast(d.error || "Accept failed", "error"); return; }
  showToast("Booking #" + d.booking_id + " created ✅");
  loadBookingRequests();
  if (typeof loadBookings === "function") loadBookings();
  if (typeof loadSlots === "function") loadSlots();
}

async function declineBR(id) {
  if (!confirm("Decline request #" + id + "?")) return;
  await fetch("/api/admin-booking-request", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ action: "decline", id })
  });
  showToast("Declined");
  loadBookingRequests();
}

function toggleAllBR(master) {
  document.querySelectorAll(".br-check").forEach(cb => cb.checked = master.checked);
}

function bulkAcceptBR() {
  const ids = [...document.querySelectorAll(".br-check:checked")].map(cb => Number(cb.dataset.id));
  const pendingIds = ids.filter(id => {
    const r = window.allBookingRequests.find(x => x.id === id);
    return r && r.status === "pending";
  });
  if (!pendingIds.length) { showToast("No pending requests selected", "warning"); return; }
  if (!confirm(`Accept ${pendingIds.length} request(s)?`)) return;
  (async () => {
    let ok = 0, fail = 0;
    for (const id of pendingIds) {
      const r = await fetch("/api/admin-booking-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "accept", id })
      });
      if (r.ok) ok++; else fail++;
    }
    showToast(`Accepted ${ok}${fail ? ", " + fail + " failed" : ""}`);
    loadBookingRequests();
    if (typeof loadBookings === "function") loadBookings();
    if (typeof loadSlots === "function") loadSlots();
  })();
}

function bulkDeleteBR() {
  const ids = [...document.querySelectorAll(".br-check:checked")].map(cb => Number(cb.dataset.id));
  if (!ids.length) { showToast("None selected", "warning"); return; }
  if (!confirm(`Delete ${ids.length} request(s)?`)) return;
  (async () => {
    for (const id of ids) {
      await fetch("/api/admin-booking-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "delete", id })
      });
    }
    showToast("Deleted " + ids.length);
    loadBookingRequests();
  })();
}

function deleteAllDeclinedBR() {
  const declined = window.allBookingRequests.filter(r => r.status === "declined");
  if (!declined.length) { showToast("No declined requests", "info"); return; }
  if (!confirm(`Delete ${declined.length} declined request(s)?`)) return;
  (async () => {
    for (const r of declined) {
      await fetch("/api/admin-booking-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "delete", id: r.id })
      });
    }
    showToast("Cleaned " + declined.length);
    loadBookingRequests();
  })();
}