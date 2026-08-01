// ============================================================
// auth.js — extracted from original superadmin.html (module split)
// ============================================================
  // =========================
  // AUTH
  // =========================

  async function login() {

    const email =
      document.getElementById("email").value;

    const password =
      document.getElementById("password").value;

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!response.ok) {

      showToast("Invalid login", "error");

      return;
    }

    showDashboard();
  }

  async function logout() {

    await fetch('/api/logout');

    location.reload();
  }

function scrollToSection(id) {
  const el = document.getElementById(id);
  const dashTabBtn = document.getElementById("dashboard-tab");
  if (dashTabBtn && !dashTabBtn.classList.contains("active")) {
    bootstrap.Tab.getOrCreateInstance(dashTabBtn).show();
  }
  const offcanvasEl = document.getElementById("mobileMenu");
  const offcanvasInstance = offcanvasEl && bootstrap.Offcanvas.getInstance(offcanvasEl);
  if (offcanvasInstance) offcanvasInstance.hide();
  if (el) {
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
}

function switchTopTab(tabId) {
  const btn = document.getElementById(tabId);
  if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  const offcanvasEl = document.getElementById("mobileMenu");
  const offcanvasInstance = offcanvasEl && bootstrap.Offcanvas.getInstance(offcanvasEl);
  if (offcanvasInstance) offcanvasInstance.hide();
  setTimeout(() => {
    const el = document.getElementById(tabId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

function showDashboard() {

  document.getElementById("login-box").style.display="none";

  document.getElementById("dashboard").style.display="block";

  // Attendance can only be marked for today or earlier — no future dates
  const todayStr = new Date().toISOString().split("T")[0];
  const attDateInput = document.getElementById("attendance-date");
  if (attDateInput) {
    attDateInput.max = todayStr;
    if (!attDateInput.value) attDateInput.value = todayStr;
  }

  loadSlots();

  loadAnnouncements();

  loadBookings();

  loadStudents();
  loadCoaches();
  loadBatches();
  loadPlans();
  loadStudentMemberships();
  loadPayments();
  loadExpenses();
  loadFinancialDashboard();
  loadNotifications();
  loadHomeSummary();
  loadRenewalsDue();
  loadPublicSettings();
  applyDevModeVisibility();
  loadDailyReport();
  loadEnquiries();
  startRealtimeUpdates();
  document.getElementById('feesReportMonth').value = new Date().toISOString().slice(0, 7);
  loadFeesReport();
  populateBatchDropdowns();
  populateReportStudentDropdown();

  // Set today's date for attendance
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('attendance-date').value = today;
  loadAttendance();
}

  async function checkUser() {

    const response = await fetch('/api/me', {
      credentials: "include"
    });

    if (response.status === 401) {

      document.getElementById("login-box").style.display = "block";

      return;
    }

    showDashboard();
  }
