// ============================================================
// slots-mobile-generator.js — extracted from original superadmin.html (module split)
// Must load AFTER slots.js: reassigns the global `renderTable` function.
// ============================================================

  // Add Generator Mobile JS
  async function generateSlotsStandaloneMobile() {

    document.getElementById("gen-slot-date").value =
      document.getElementById("m-gen-slot-date").value;

    document.getElementById("gen-slot-court").value =
      document.getElementById("m-gen-slot-court").value;

    document.getElementById("gen-slot-start").value =
      document.getElementById("m-gen-slot-start").value;

    document.getElementById("gen-slot-start-period").value =
      document.getElementById("m-gen-slot-start-period").value;

    document.getElementById("gen-slot-end").value =
      document.getElementById("m-gen-slot-end").value;

    document.getElementById("gen-slot-end-period").value =
      document.getElementById("m-gen-slot-end-period").value;

    document.getElementById("gen-slot-price").value =
      document.getElementById("m-gen-slot-price").value;

    document.getElementById("gen-slot-status").value =
      document.getElementById("m-gen-slot-status").value;

    //   await generateSlotsStandalone();

    //   bootstrap.Modal
    //     .getInstance(document.getElementById('generatorModal'))
    //     .hide();

    // }
    await generateSlotsStandalone();

    const modal = bootstrap.Modal.getInstance(
      document.getElementById('generatorModal')
    );

    if (modal) modal.hide();

    // setTimeout(() => {
    //   clearModalArtifacts();
    // }, 300);
  }


  async function generateSlotsStandalone() {
    showProcessing("Generating slots…", "Preparing…");
    try {
    const date = document.getElementById("gen-slot-date").value;
    const court_id = document.getElementById("gen-slot-court").value;
    const from = convertTo12Hour(
      document.getElementById("gen-slot-start").value,
      document.getElementById("gen-slot-start-period").value
    );

    const to = convertTo12Hour(
      document.getElementById("gen-slot-end").value,
      document.getElementById("gen-slot-end-period").value
    );
    const price = Number(document.getElementById("gen-slot-price").value) || 400;
    const status = document.getElementById("gen-slot-status").value;

    if (!date || !from || !to) {
      showToast("Please enter date, from and to time", "warning");
      return;
    }

    function timeToNumber(t) {
      const match = t.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
      if (!match) return null;
      let h = parseInt(match[1]);
      const m = parseInt(match[2] || 0);
      const period = match[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      if (m !== 0 && m !== 30) return null;
      return h + m / 60;
    }

    function numberToTime(n) {
      const h = Math.floor(n);
      const m = Math.round((n - h) * 60);
      const period = h >= 12 ? "PM" : "AM";
      let hh = h % 12;
      if (hh === 0) hh = 12;
      const mm = String(m).padStart(2, "0");
      return `${hh}:${mm}${period}`;
    }

    const startNum = timeToNumber(from);
    const endNum = timeToNumber(to);

    if (startNum === null || endNum === null) {
      showToast("Invalid time format. Use hAM/PM or h:30AM/PM", "error");
      return;
    }

    if (startNum >= endNum) {
      showToast("Start time must be before end time");
      return;
    }

    const totalHours = endNum - startNum;
    if (totalHours % 1 !== 0) {
      showToast("Time range must be a multiple of 1 hour (e.g., 6-7, 6:30-7:30)", "info");
      return;
    }

    // Build the full list first.
    // Overlap check considers BOTH existing slots (allData) AND slots already
    // queued in this same run, so "6:00-7:00 + 6:30-7:30" in one click is
    // properly detected even though allData hasn't refreshed yet.
    const existing = allData.filter(s =>
      s.date === date && String(s.court_id) === String(court_id)
    ).map(s => ({
      start: timeToNumber(s.start_time || ""),
      end:   timeToNumber(s.end_time   || "")
    })).filter(r => r.start !== null && r.end !== null);

    const slots = [];
    let current = startNum;

    while (current < endNum) {
      const slotStart = numberToTime(current);
      const slotEnd   = numberToTime(current + 1);
      const newStart  = current;
      const newEnd    = current + 1;

      // Check against existing DB slots
      const dbConflict = existing.find(r =>
        newStart < r.end && newEnd > r.start
      );

      // Check against slots already queued in this loop
      const queuedConflict = slots.find(s =>
        newStart < s._endNum && newEnd > s._startNum
      );

      if (!dbConflict && !queuedConflict) {
        slots.push({
          date,
          court_id,
          start_time: slotStart,
          end_time: slotEnd,
          time: `${slotStart} - ${slotEnd}`,
          price,
          status,
          _sortKey: current,
          _startNum: newStart,
          _endNum: newEnd
        });
      }
      current += 1;
    }
    // 

    if (slots.length === 0) {
      showToast("All selected slots already exist — nothing generated", "info");
      return;
    }

    // Sort chronologically (AM 1AM..12PM, then PM 1PM..11PM),
    // then strip internal bookkeeping fields before POSTing.
    slots.sort((a, b) => a._sortKey - b._sortKey);
    slots.forEach(s => {
      delete s._sortKey;
      delete s._startNum;
      delete s._endNum;
    });

    // POST sequentially in sorted order
    let created = 0, skipped = 0;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      showProcessing(
        "Generating slots…",
        `Creating ${i + 1} of ${slots.length} (${s.start_time})`
      );
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', data: s })
      });
      if (response.status === 409) { skipped++; continue; }
      if (!response.ok) {
        showToast(`Failed on slot ${s.start_time}`, "error");
        return;
      }
      created++;
    }
    if (slots.length === 0) {
      showToast("All selected slots already exist — nothing generated", "info");
    } else if (skipped > 0) {
      showToast(`Created ${created} slot${created !== 1 ? "s" : ""} · ${skipped} already existed`, "info");
    } else {
      showToast(`Generated ${created} slots for Court ${court_id}`);
    }

    setTimeout(loadSlots, 500);

    } finally {
      hideProcessing();
    }
  }

  // =====================
  // Hide/Show Past Slots in Table
  // =====================
  const originalRenderTable = renderTable;

  renderTable = function (data) {

    const showPast =
      document.getElementById("showPastSlots")?.checked;

    if (showPast) {
      originalRenderTable(data);
      return;
    }

    const today = new Date().toLocaleDateString('sv-SE');

    const futureData =
      data.filter(slot => slot.date >= today);

    originalRenderTable(futureData);
  };

  // This automatically removes stuck backdrops whenever any Bootstrap modal closes.
  document.addEventListener('hidden.bs.modal', function () {
    clearModalArtifacts();
  });

