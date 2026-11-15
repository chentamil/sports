window.allBookingRequests = [];

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
    renderBookingRequests(window.allBookingRequests);
  } catch (e) {
    if (loading) loading.classList.add("d-none");
    const tb = document.getElementById("brBody");
    if (tb) tb.innerHTML = `<tr><td colspan="8" class="text-danger text-center">${e.message}</td></tr>`;
  }
}

function renderBookingRequests(list) {
  const desktopBody = document.getElementById("brBody");
  const mobileList  = document.getElementById("brCardList");
  const badge       = document.getElementById("brPendingBadge");
  const loading     = document.getElementById("brLoading");
  const empty       = document.getElementById("brEmpty");

  if (loading) loading.classList.add("d-none");

  if (!list || list.length === 0) {
    if (empty) empty.classList.remove("d-none");
    if (desktopBody) desktopBody.innerHTML = "";
    if (mobileList) mobileList.innerHTML = "";
    if (badge) badge.classList.add("d-none");
    return;
  }
  if (empty) empty.classList.add("d-none");

  const pending = list.filter(r => r.status === "pending");
  if (badge) {
    badge.textContent = pending.length;
    badge.classList.toggle("d-none", pending.length === 0);
  }

  const esc = s => String(s == null ? "" : s)
    .replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  const badgeClass = {
    pending:  "bg-warning text-dark",
    accepted: "bg-success",
    declined: "bg-secondary"
  };

  // ---- Desktop table rows ----
  if (desktopBody) {
    desktopBody.innerHTML = list.map(r => {
      const s = r.slots || {};
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
        <td>${esc(s.date || "")}<br><small class="text-muted">${esc(s.start_time || "")} - ${esc(s.end_time || "")} · Court ${esc(s.court_id || "")}</small></td>
        <td>${esc(r.player_name)}</td>
        <td>
          <a href="mailto:${esc(r.player_email)}">${esc(r.player_email)}</a><br>
          <a href="tel:${esc(r.player_mobile)}">${esc(r.player_mobile)}</a>
        </td>
        <td style="max-width:200px;">${esc(r.notes || "")}</td>
        <td><span class="badge ${badgeClass[r.status] || 'bg-light'}">${esc(r.status)}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join("");
  }

  // ---- Mobile cards ----
  if (mobileList) {
    mobileList.innerHTML = list.map(r => {
      const s = r.slots || {};
      const canAct = r.status === "pending" && s.status === "available";
      const actionButtons = r.status === "pending"
        ? (canAct
            ? `<div class="d-flex gap-2 mt-2">
                 <button class="btn btn-success btn-sm flex-fill" onclick="acceptBR(${r.id})">
                   <i class="bi bi-check-lg"></i> Accept
                 </button>
                 <button class="btn btn-outline-danger btn-sm flex-fill" onclick="declineBR(${r.id})">
                   <i class="bi bi-x-lg"></i> Decline
                 </button>
               </div>`
            : `<div class="d-flex gap-2 mt-2">
                 <button class="btn btn-outline-danger btn-sm flex-fill" onclick="declineBR(${r.id})">
                   Decline (slot taken)
                 </button>
               </div>`)
        : "";

      return `<div class="card shadow-sm border-0 mb-3" style="border-radius:16px;">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="fw-bold">${esc(r.player_name)}</div>
              <small class="text-muted">#${r.id}</small>
            </div>
            <span class="badge ${badgeClass[r.status] || 'bg-light'}">${esc(r.status)}</span>
          </div>
          <div class="mb-2">
            <i class="bi bi-calendar-event me-1"></i>
            <strong>${esc(s.date || "")}</strong> · ${esc(s.start_time || "")} - ${esc(s.end_time || "")}
            <br><i class="bi bi-geo-alt me-1"></i>Court ${esc(s.court_id || "")} · ₹${esc(s.price || 0)}
          </div>
          <div class="mb-1 small">
            <a href="mailto:${esc(r.player_email)}" class="text-decoration-none"><i class="bi bi-envelope me-1"></i>${esc(r.player_email)}</a>
          </div>
          <div class="mb-2 small">
            <a href="tel:${esc(r.player_mobile)}" class="text-decoration-none"><i class="bi bi-telephone me-1"></i>${esc(r.player_mobile)}</a>
          </div>
          ${r.notes ? `<div class="small text-muted mb-1"><i class="bi bi-chat-left-text me-1"></i>${esc(r.notes)}</div>` : ""}
          ${actionButtons}
        </div>
      </div>`;
    }).join("");
  }
}

async function acceptBR(id) {
  if (!confirm("Accept request #" + id + " and create booking?")) return;

  // Capture request details BEFORE accepting so we can send the email after
  const req = window.allBookingRequests?.find(x => x.id === id);
  const r = await fetch("/api/admin-booking-request", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ action: "accept", id })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { showToast(d.error || "Accept failed", "error"); return; }

  showToast("Booking #" + d.booking_id + " created ✅");

  // Send confirmation email — same path as saveBooking()
  if (req && req.player_email) {
    const slot = req.slots || {};
    const bookingIdLabel = `SEBA-${d.booking_id}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#198754;">Booking Confirmed ✅</h2>
        <p>Dear ${req.player_name || "Customer"},</p>
        <p>Your court booking is confirmed:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td><strong>${bookingIdLabel}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666;">Date</td><td>${slot.date || ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Time</td><td>${slot.start_time || ""} - ${slot.end_time || ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Court</td><td>Court ${slot.court_id || ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Amount</td><td><strong>₹${slot.price || 0}</strong></td></tr>
        </table>
        <p style="margin-top:16px;">See you on court!</p>
        <p style="color:#888;">Shivani Elite Badminton Academy</p>
      </div>
    `;
    if (typeof sendMail === "function") {
      sendMail(req.player_email, "Booking Confirmed - Shivani Elite Badminton Academy", html);
    }
  }

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
      const req = window.allBookingRequests.find(x => x.id === id);
      const r = await fetch("/api/admin-booking-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "accept", id })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { fail++; continue; }
      ok++;

      // Send confirmation email per accepted request
      if (req && req.player_email) {
        const slot = req.slots || {};
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
            <h2 style="color:#198754;">Booking Confirmed ✅</h2>
            <p>Dear ${req.player_name || "Customer"},</p>
            <p>Your court booking is confirmed:</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td><strong>SEBA-${d.booking_id}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666;">Date</td><td>${slot.date || ""}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Time</td><td>${slot.start_time || ""} - ${slot.end_time || ""}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Court</td><td>Court ${slot.court_id || ""}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Amount</td><td><strong>₹${slot.price || 0}</strong></td></tr>
            </table>
            <p style="margin-top:16px;">See you on court!</p>
            <p style="color:#888;">Shivani Elite Badminton Academy</p>
          </div>
        `;
        if (typeof sendMail === "function") {
          sendMail(req.player_email, "Booking Confirmed - Shivani Elite Badminton Academy", html);
        }
      }
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