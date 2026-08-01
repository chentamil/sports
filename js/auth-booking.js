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

  loadSlots();

  loadBookings();

  loadPublicSettings();

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
