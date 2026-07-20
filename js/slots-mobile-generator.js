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

    // Convert time string to number (24h format)
    function timeToNumber(t) {
      const match = t.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
      if (!match) return null;
      let h = parseInt(match[1]);
      const m = parseInt(match[2] || 0);
      const period = match[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      if (m !== 0 && m !== 30) return null; // Only 0 or 30 minutes allowed
      return h + m / 60;
    }

    // Convert number back to string
    function numberToTime(n) {
      const h = Math.floor(n);
      const m = Math.round((n - h) * 60);
      const period = h >= 12 ? "PM" : "AM";
      let hh = h % 12;
      if (hh === 0) hh = 12;
      // return m === 0 ? `${hh}${period}` : `${hh}:${m}${period}`; //6AM 7AM not like 6:00AM format
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

    const slots = [];
    let current = startNum;

    while (current < endNum) {
      const slotStart = numberToTime(current);
      const slotEnd = numberToTime(current + 1); // 1-hour slots only
      //Duplicate Slot Warning 
      const duplicate = allData.find(s =>
        s.date === date &&
        String(s.court_id) === String(court_id) &&
        s.start_time === slotStart &&
        s.end_time === slotEnd
      );

      if (duplicate) {
        current += 1;
        continue;
      }
      //Duplicate Slot Warning ends 

      slots.push({
        date,
        court_id,
        start_time: slotStart,
        end_time: slotEnd,
        time: `${slotStart} - ${slotEnd}`,
        price: price,
        status
      });
      current += 1; // 1-hour step
    }

    // slots.forEach(async s => {
    //   await fetch('/api/admin', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       action: 'add',
    //       data: s
    //     })
    //   });
    // });

    for (const s of slots) {

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add',
          data: s
        })
      });

      if (!response.ok) {
        showToast("Failed creating slot", "error");
        return;
      }
    }

    showToast(`Generated ${slots.length} slots for Court ${court_id}`);
    setTimeout(loadSlots, 500);
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

