// ============================================================
// audit.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// AUDIT LOGS JS
// =================================================

async function loadAuditLogs() {
  const table = document.getElementById("audit-table-filter").value;
  const startDate = document.getElementById("audit-start").value;
  const endDate = document.getElementById("audit-end").value;

  let url = '/api/audit-logs?';
  if (table) url += `table=${table}&`;
  if (startDate) url += `start_date=${startDate}&`;
  if (endDate) url += `end_date=${endDate}&`;

  try {
    const res = await fetch(url);
    const logs = await res.json();
    renderAuditLogs(logs);
  } catch (err) {
    showToast("Failed to load audit logs", "error");
    console.error(err);
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No audit logs found</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td>${log.user_email || log.user_id || 'System'}</td>
      <td><span class="badge ${log.action === 'INSERT' ? 'bg-success' : log.action === 'UPDATE' ? 'bg-warning' : 'bg-danger'}">${log.action}</span></td>
      <td>${log.table_name || '-'}</td>
      <td>${log.record_id || '-'}</td>
    </tr>
  `).join('');
}
