// ============================================================
// notifications.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// NOTIFICATIONS JS
// =================================================

let allNotifications = [];

async function loadNotifications() {
  try {
    const res = await fetch('/api/notifications');
    allNotifications = await res.json();
    renderNotifications(allNotifications);
    updateNotificationBadge(allNotifications);
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

function renderNotifications(notifications) {
  const container = document.getElementById("notificationList");
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = `<p class="text-muted text-center">No notifications found</p>`;
    return;
  }

  container.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.is_read ? 'bg-light' : 'bg-white border-start border-4 border-primary'}" 
         style="padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; border-left: 4px solid ${n.is_read ? '#dee2e6' : '#0d6efd'};">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <strong>${n.title}</strong>
          <p class="mb-1">${n.message}</p>
          <small class="text-muted">
            ${n.students ? `${n.students.first_name} ${n.students.last_name || ''}` : 'General'} • 
            ${new Date(n.created_at).toLocaleDateString()} ${new Date(n.created_at).toLocaleTimeString()}
          </small>
        </div>
        <div>
          ${!n.is_read ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationRead(${n.id})">Mark Read</button>` : ''}
          <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteNotification(${n.id})">×</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateNotificationBadge(notifications) {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;
  const unread = notifications?.filter(n => !n.is_read).length || 0;
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }
}

async function markNotificationRead(id) {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markRead', id })
  });
  if (res.ok) {
    loadNotifications();
    showToast("Notification marked as read");
  }
}

async function markAllNotificationsRead() {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markAllRead' })
  });
  if (res.ok) {
    loadNotifications();
    showToast("All notifications marked as read");
  }
}

async function deleteNotification(id) {
  if (!confirm("Delete this notification?")) return;
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  if (res.ok) {
    loadNotifications();
    showToast("Notification deleted");
  }
}

async function checkExpiringMemberships() {
  try {
    // Call the SQL function directly via Supabase
    const response = await fetch('/api/expiring-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to check expiring memberships');
    }
    
    showToast("Expiring memberships checked ✅");
    loadNotifications();
  } catch (err) {
    showToast("Error checking memberships: " + err.message, "error");
    console.error(err);
  }
}
