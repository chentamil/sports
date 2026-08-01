// ============================================================
// main.js — app bootstrap. MUST load LAST, after every other module.
//
// In the original single-file version, `clearModalArtifacts(); checkUser();`
// ran immediately near the top of the script, and relied on JS function
// hoisting (all code was one script block) plus the fact that checkUser()
// awaits a network fetch before calling showDashboard() - by the time that
// fetch resolved, the rest of the (single) script had already finished
// parsing, so every loadXxx() function showDashboard() calls was defined.
//
// Now that the code is split across separate <script src> files, that
// hoisting safety net no longer applies across files. So this trigger is
// relocated here, to the final script tag, guaranteeing every module
// (coaches.js, batches.js, students.js, etc.) is fully loaded and every
// function showDashboard() depends on already exists before this fires.
// Behavior is identical from the user's perspective: it still fires once,
// immediately, as soon as the page's scripts finish loading.
// ============================================================

clearModalArtifacts();
checkUser();

// PWA: register service worker (enables "Install App" prompt in Chrome)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Registration failing shouldn't break the app - it's a progressive enhancement
  });
}
