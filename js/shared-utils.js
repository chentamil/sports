// ============================================================
// shared-utils.js — used by BOTH booking-admin.html and academy-admin.html.
// Split out of the original dashboard.js during the two-product split:
// these functions have no student/academy-specific dependencies, and
// bookings.js (confirm/cancel emails) needs sendMail() + the dev mail
// toggle, and slots.js (public slots switch) needs loadPublicSettings()/
// togglePublicSlots() — so both products need this file loaded.
// ============================================================

// ---- Reusable pagination helper (Students, Expenses, Payments, etc.) ----
const paginationState = {};
const PAGE_SIZE = 10;

function paginateArray(array, key) {
  if (!paginationState[key]) paginationState[key] = 1;
  const totalPages = Math.max(1, Math.ceil(array.length / PAGE_SIZE));
  if (paginationState[key] > totalPages) paginationState[key] = totalPages;
  const page = paginationState[key];
  const start = (page - 1) * PAGE_SIZE;
  return { items: array.slice(start, start + PAGE_SIZE), page, totalPages, total: array.length };
}

function goToPage(key, page, rerenderFn) {
  paginationState[key] = page;
  rerenderFn();
}

function renderPaginationControls(containerId, key, totalPages, currentPage, rerenderFnName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ""; return; }

  let html = `<nav class="mt-2"><ul class="pagination pagination-sm justify-content-center mb-0 flex-wrap">`;
  html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button class="page-link" onclick="goToPage('${key}', ${currentPage - 1}, ${rerenderFnName})">‹ Prev</button></li>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i !== 1 && i !== totalPages && Math.abs(i - currentPage) > 2) {
      if (i === 2 || i === totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      continue;
    }
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><button class="page-link" onclick="goToPage('${key}', ${i}, ${rerenderFnName})">${i}</button></li>`;
  }

  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button class="page-link" onclick="goToPage('${key}', ${currentPage + 1}, ${rerenderFnName})">Next ›</button></li>`;
  html += `</ul></nav>`;
  container.innerHTML = html;
}

// ---- Public slots visibility toggle (used by Slot Management in booking-admin) ----
async function loadPublicSettings() {
  try {
    const res = await fetch("/api/public-settings");
    const settings = await res.json();
    const toggle = document.getElementById("publicSlotsToggle");
    if (toggle) toggle.checked = settings.show_booking_slots !== "false";
  } catch (e) { /* non-critical */ }
}

async function togglePublicSlots() {
  const isOn = document.getElementById("publicSlotsToggle").checked;
  const res = await fetch("/api/public-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "show_booking_slots", value: isOn })
  });
  if (!res.ok) { showToast("Failed to update setting", "error"); return; }
  showToast(isOn ? "Booking slots are now visible to customers" : "Booking slots hidden from customers");
}

// ---- Hidden developer options panel (click footer copyright 5x) ----
let devTriggerClickCount = 0;
let devTriggerClickTimer = null;

function handleDevTrigger() {
  devTriggerClickCount++;
  clearTimeout(devTriggerClickTimer);
  devTriggerClickTimer = setTimeout(() => { devTriggerClickCount = 0; }, 1500);

  if (devTriggerClickCount >= 5) {
    devTriggerClickCount = 0;
    document.getElementById("devMailToggle").checked = localStorage.getItem("devMailOff") === "true";
    document.getElementById("devModeToggle").checked = localStorage.getItem("devMode") === "true";
    new bootstrap.Modal(document.getElementById("devOptionsModal")).show();
  }
}

function toggleDevMailMode() {
  const isOff = document.getElementById("devMailToggle").checked;
  localStorage.setItem("devMailOff", isOff ? "true" : "false");
  showToast(isOff ? "📴 Dev mode: emails are now OFF" : "📧 Emails are back ON");
}

function toggleDevMode() {
  const isOn = document.getElementById("devModeToggle").checked;
  localStorage.setItem("devMode", isOn ? "true" : "false");
  applyDevModeVisibility();
  showToast(isOn ? "🛠️ Developer Mode ON — hidden fields/tabs revealed" : "🛠️ Developer Mode OFF — hidden again");
}

function applyDevModeVisibility() {
  const isOn = localStorage.getItem("devMode") === "true";
  document.querySelectorAll(".dev-only").forEach(el => {
    el.classList.toggle("d-none", !isOn);
  });
  const quickLinks = document.getElementById("devQuickLinks");
  if (quickLinks) quickLinks.style.display = isOn ? "flex" : "none";
}

// ---- Email sending (Resend, via Cloudflare Pages Function) ----
// Used by: booking confirm/cancel emails (bookings.js), receipt/welcome/
// reminder emails (payments.js, students.js, financial-dashboard.js).
async function sendMail(to, subject, html) {
  if (!to) { showToast("No email address on file", "warning"); return false; }

  if (localStorage.getItem("devMailOff") === "true") {
    showToast(`📴 [DEV MODE] Email skipped (would send to ${to})`, "success");
    return true;
  }

  showToast("Sending email…", "success");
  try {
    const res = await fetch("/api/send-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html })
    });
    const result = await res.json();
    if (!res.ok) {
      showToast("Email failed: " + (result.error || "unknown error"), "error");
      return false;
    }
    showToast("Email sent ✅");
    return true;
  } catch (e) {
    showToast("Email failed to send", "error");
    return false;
  }
}
