// ============================================================
// financial-dashboard.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// FINANCIAL DASHBOARD JS
// =================================================

let allRenewalsDue = [];

function sendRenewalReminderEmail(email, name, planName, amount, endDate) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
      <h2 style="color:#dc3545;">Membership Renewal Reminder</h2>
      <p>Dear ${name},</p>
      <p>This is a friendly reminder that your <strong>${planName}</strong> membership (₹${amount}) expires on <strong>${endDate}</strong>.</p>
      <p>Please renew at your earliest convenience to continue enjoying uninterrupted access.</p>
      <p style="margin-top:16px;">Thank you!</p>
      <p style="color:#888;">Shivani Elite Badminton Academy</p>
    </div>
  `;
  sendMail(email, `Membership Renewal Reminder - Shivani Elite Badminton Academy`, html);
}

function renewalRowHtml(r) {
  let when;
  if (r.daysLeft < 0) when = `expired ${Math.abs(r.daysLeft)} day(s) ago`;
  else if (r.daysLeft === 0) when = `expires today`;
  else when = `expires in ${r.daysLeft} day(s)`;

  const urgency = r.daysLeft <= 0 ? "text-danger" : r.daysLeft <= 2 ? "text-warning" : "text-muted";
  const safeName = (r.name || "").replace(/'/g, "");

  return `<div class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
      <span><strong>${r.name}</strong>'s ${r.planName} (₹${r.amount || 0}) <span class="${urgency} fw-semibold">${when}</span> (${r.endDate}). Please follow up for renewal.</span>
      <span class="d-flex gap-1">
        ${r.mobile ? `<button class="btn btn-outline-success btn-sm" onclick="remindNow('${r.mobile}', '${safeName}', ${r.amount || 0}, '${r.endDate}')"><i class="bi bi-whatsapp"></i></button>` : ``}
        ${r.email ? `<button class="btn btn-outline-primary btn-sm" onclick="sendRenewalReminderEmail('${r.email}', '${safeName}', '${(r.planName||'').replace(/'/g,'')}', ${r.amount || 0}, '${r.endDate}')"><i class="bi bi-envelope"></i></button>` : ``}
        ${!r.mobile && !r.email ? `<span class="text-muted small">No contact info</span>` : ``}
      </span>
    </div>`;
}

async function loadRenewalsDue() {
  const days = document.getElementById("renewalsDaysAhead")?.value || "7";
  const res = await fetch(`/api/renewals-due?days=${days}`);
  const data = await res.json();
  const list = document.getElementById("renewalsList");
  const badge = document.getElementById("renewalsBadge");
  const renewals = data.renewals || [];
  allRenewalsDue = renewals;

  if (renewals.length === 0) {
    badge.style.display = "none";
    list.innerHTML = `<div class="list-group-item text-muted text-center">No renewals due in the next 7 days 🎉</div>`;
    return;
  }

  badge.style.display = "inline-block";
  badge.textContent = renewals.length;

  const topFive = renewals.slice(0, 5);
  list.innerHTML = topFive.map(renewalRowHtml).join("");

  const viewAllWrap = document.getElementById("renewalsViewAllWrap");
  if (renewals.length > 5) {
    viewAllWrap.style.display = "block";
    document.getElementById("renewalsViewAllCount").textContent = renewals.length - 5;
  } else {
    viewAllWrap.style.display = "none";
  }
}

function openAllRenewals() {
  const modalList = document.getElementById("allRenewalsList");
  modalList.innerHTML = allRenewalsDue.length
    ? allRenewalsDue.map(renewalRowHtml).join("")
    : `<div class="list-group-item text-muted text-center">No renewals due</div>`;
  new bootstrap.Modal(document.getElementById("allRenewalsModal")).show();
}
