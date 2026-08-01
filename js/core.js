// ============================================================
// core.js — extracted from original superadmin.html (module split)
// ============================================================


  // ===================================================
  // SESSION EXPIRY DETECTION
  // Wraps window.fetch once so every existing /api/ call in this file
  // automatically triggers the red "Session Expired" modal on 401,
  // with zero changes needed at each individual call site.
  // ===================================================
  (function () {
    const originalFetch = window.fetch;
    let sessionModalShown = false;

    window.fetch = async function (...args) {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
        const isApiCall = url.startsWith("/api/");
        const isAuthEndpoint = url.startsWith("/api/login") || url.startsWith("/api/logout") || url.startsWith("/api/me");

        if (isApiCall && !isAuthEndpoint && response.status === 401 && !sessionModalShown) {
          sessionModalShown = true;
          const modalEl = document.getElementById("sessionExpiredModal");
          if (modalEl && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
          }
        }
      } catch (e) { /* never let the interceptor itself break the app */ }
      return response;
    };
  })();

  let allData = [];
  let announcements = [];
  let editedSlots = {};

  let courtRevenueChart = null;
  let statusChart = null;

  // =========================
  // TOAST
  // =========================
function showToast(msg, type = "success") {

  const toast = document.getElementById("toast");

  const el = document.createElement("div");

  const classes = {
    success: "alert alert-success shadow",
    error: "alert alert-danger shadow",
    warning: "alert alert-warning shadow",
    info: "alert alert-info shadow"
  };

  el.className = classes[type] || classes.success;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
  };

  el.textContent =
    `${icons[type] || "✅"} ${msg}`;

  toast.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 5000);
}

  // remove toast in mobile bug
  function clearModalArtifacts() {
    document.body.classList.remove("modal-open");

    document.querySelectorAll(".modal-backdrop")
      .forEach(el => el.remove());

    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
