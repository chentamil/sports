// ============================================================
// slots.js — extracted from original superadmin.html (module split)
// ============================================================
  // =========================
  // GENERATE TIME OPTIONS
  // =========================

  function generateTimeOptions(selectId) {

    const select =
      document.getElementById(selectId);

    select.innerHTML = "";

    for (let h = 1; h <= 12; h++) {

      // 00 mins
      let option1 =
        document.createElement("option");

      option1.value = `${h}:00`;
      option1.text =
        `${h}:00`;

      select.appendChild(option1);

      // 30 mins
      let option2 =
        document.createElement("option");

      option2.value = `${h}:30`;
      option2.text =
        `${h}:30`;

      select.appendChild(option2);
    }
  }

  // pc laptop manual add
  generateTimeOptions("slot-start");
  generateTimeOptions("slot-end");

  // mobile manual
  generateTimeOptions("m-slot-start");
  generateTimeOptions("m-slot-end");

  // ⭐ generator desktop (NEW)
  generateTimeOptions("gen-slot-start");
  generateTimeOptions("gen-slot-end");

  // ⭐ generator mobile (NEW)
  generateTimeOptions("m-gen-slot-start");
  generateTimeOptions("m-gen-slot-end");




  // =========================
  // LOAD & RENDER
  // =========================
  async function loadSlots() {

    try {

      const response =
        await fetch('/api/admin');

      if (!response.ok) {
        throw new Error(
          'Server Error'
        );
      }

      const data =
        await response.json();

      allData = data;

      // Merge booking data from bookings API into slots
      try {
        const bookingRes = await fetch('/api/admin-bookings');
        if (bookingRes.ok) {
          const bookings = await bookingRes.json();
          // For each booking, merge the booking details into the corresponding slot
          bookings.forEach(booking => {
            const slot = allData.find(s => s.id === booking.slot_id);
            if (slot) {
              slot.booking_name = booking.customer_name;
              slot.booking_mobile = booking.customer_mobile;
              slot.booking_email = booking.customer_email;
              slot.booking_notes = booking.booking_notes;
              slot.payment_status = booking.payment_status;
              // Ensure status is booked if there's a booking
              if (slot.status !== 'booked') {
                slot.status = 'booked';
              }
            }
          });
        }
      } catch (bookingErr) {
        console.warn('Could not load bookings for slot merge:', bookingErr);
      }

      renderTable(data);

      updateAnalytics(data);

      renderCharts(data);

      if (document.getElementById("chart-date")) {
        renderAvailabilityChart();
      }

      } catch (err) {

        console.error(err);

        showToast("Unable to load slots", "error");
      }
  }



function renderTable(data) {

  const body = document.getElementById("table-body");
  body.innerHTML = "";

  data.forEach(slot => {

    let rowClass = "";

    if (slot.status === "booked") {
      rowClass = "bg-danger text-white opacity-75";
    }
    else if (slot.status === "disabled") {
      rowClass = "bg-secondary text-white opacity-75";
    }
    else if (slot.status === "closed") {
      rowClass = "table-warning";
    }

    const tr = document.createElement("tr");
    tr.className = rowClass;

    // checkbox
    const tdCheck = document.createElement("td");
    tdCheck.innerHTML = `<input type="checkbox" class="slot-checkbox" data-id="${slot.id}">`;
    tr.appendChild(tdCheck);

    // ID
    const tdId = document.createElement("td");
    tdId.textContent = slot.id;
    tr.appendChild(tdId);

    // DATE (IMPORTANT FIX)
    const tdDate = document.createElement("td");
    tdDate.className = "date-td";
    tdDate.textContent = slot.date;
    tr.appendChild(tdDate);

    // COURT (still needs HTML because select)
    const tdCourt = document.createElement("td");
    tdCourt.innerHTML = `
      <select class="form-select"
        onchange="trackEdit(${slot.id},'court_id',this.value)">
        <option value="1" ${slot.court_id == 1 ? 'selected' : ''}>Court 1</option>
        <option value="2" ${slot.court_id == 2 ? 'selected' : ''}>Court 2</option>
        <option value="3" ${slot.court_id == 3 ? 'selected' : ''}>Court 3</option>
      </select>
    `;
    tr.appendChild(tdCourt);

    // START TIME (SAFE INPUT VALUE)
    const tdStart = document.createElement("td");
    tdStart.innerHTML = `
      <input class="form-control"
        value="${slot.start_time || ''}"
        onchange="trackEdit(${slot.id},'start_time',this.value)">
    `;
    tr.appendChild(tdStart);

    // END TIME
    const tdEnd = document.createElement("td");
    tdEnd.innerHTML = `
      <input class="form-control"
        value="${slot.end_time || ''}"
        onchange="trackEdit(${slot.id},'end_time',this.value)">
    `;
    tr.appendChild(tdEnd);

    // PRICE
    const tdPrice = document.createElement("td");
    tdPrice.innerHTML = `
      <input class="form-control"
        value="${slot.price || 0}"
        onchange="trackEdit(${slot.id},'price',this.value)">
    `;
    tr.appendChild(tdPrice);

    // STATUS
    const tdStatus = document.createElement("td");
    tdStatus.innerHTML = `
      <select class="form-select"
        onchange="trackEdit(${slot.id},'status',this.value)">
        <option value="available" ${slot.status == 'available' ? 'selected' : ''}>Available</option>
        <option value="booked" ${slot.status == 'booked' ? 'selected' : ''}>Booked</option>
        <option value="closed" ${slot.status == 'closed' ? 'selected' : ''}>Closed</option>
        <option value="disabled" ${slot.status == 'disabled' ? 'selected' : ''}>Disabled</option>
      </select>
    `;
    tr.appendChild(tdStatus);

    // DELETE
    const tdDelete = document.createElement("td");
    tdDelete.className = "bg-white";
    tdDelete.innerHTML = `
      <button class="btn btn-danger btn-sm btn-lg w-100"
        onclick="deleteSlot(${slot.id})">
        Delete
      </button>
    `;
    tr.appendChild(tdDelete);

// Book
const tdBooking =
document.createElement("td");
tdBooking.className = "bg-white";

if (
  slot.status === "booked"
) {

  tdBooking.innerHTML = `
    <button
      class="btn btn-secondary btn-sm"
      onclick="viewBookingDetails(${slot.id})">
      Booked
    </button>
  `;

} else {

  tdBooking.innerHTML = `
    <button
      class="btn btn-success btn-sm"
      onclick="openBookingModal(${slot.id})">

      Book

    </button>
  `;

}

    tr.appendChild(tdBooking);

    body.appendChild(tr);
  });
}

// Quick Filter Function
// Multi-select filter state: all active filters AND together.
// e.g. dateFilter='today' + statusFilter='available' + courts={1} shows
// only today's available Court 1 slots.
const activeFilters = {
  dateFilter: null,   // 'today' | null
  statusFilter: null, // 'available' | 'booked' | 'closed' | 'disabled' | null
  courts: new Set()   // e.g. {1, 2}
};

function toggleDateFilter(type) {
  activeFilters.dateFilter = (activeFilters.dateFilter === type) ? null : type;
  applyFilters();
}

function toggleStatusFilter(type) {
  activeFilters.statusFilter = (activeFilters.statusFilter === type) ? null : type;
  applyFilters();
}

function toggleCourtFilter(courtId) {
  if (activeFilters.courts.has(courtId)) {
    activeFilters.courts.delete(courtId);
  } else {
    activeFilters.courts.add(courtId);
  }
  applyFilters();
}

function resetFilters() {
  activeFilters.dateFilter = null;
  activeFilters.statusFilter = null;
  activeFilters.courts.clear();
  applyFilters();
}

function applyFilters() {
  const today = new Date().toLocaleDateString('sv-SE');
  let filtered = [...allData];

  if (activeFilters.dateFilter === "today") {
    filtered = filtered.filter(s => s.date === today);
  }

  if (activeFilters.statusFilter) {
    filtered = filtered.filter(s => s.status === activeFilters.statusFilter);
  }

  if (activeFilters.courts.size > 0) {
    filtered = filtered.filter(s => activeFilters.courts.has(Number(s.court_id)));
  }

  renderTable(filtered);
  updateFilterButtonStyles();
}

function updateFilterButtonStyles() {
  document.querySelectorAll("[data-filter-date]").forEach(btn => {
    btn.classList.toggle("active", activeFilters.dateFilter === btn.dataset.filterDate);
  });
  document.querySelectorAll("[data-filter-status]").forEach(btn => {
    btn.classList.toggle("active", activeFilters.statusFilter === btn.dataset.filterStatus);
  });
  document.querySelectorAll("[data-filter-court]").forEach(btn => {
    btn.classList.toggle("active", activeFilters.courts.has(Number(btn.dataset.filterCourt)));
  });
}

// Kept for backward compatibility - anything still calling the old
// single-select filterSlots('today') etc. keeps working.
function filterSlots(type) {
  if (type === "all") { resetFilters(); return; }
  if (type === "today") { toggleDateFilter("today"); return; }
  toggleStatusFilter(type);
}
  // =========================
  // EDIT TRACK
  // =========================
  function trackEdit(id, field, value) {

    if (!editedSlots[id]) {

      editedSlots[id] = {};

    }

    editedSlots[id][field] = value;

  }

  // =========================
  // SAVE ALL
  // =========================
  async function saveAllChanges() {

    const updates = Object.keys(editedSlots);

    if (updates.length === 0) {

      showToast("No changes made");

      return;
    }

    for (const id of updates) {

      const updateData = editedSlots[id];

      if (
        updateData.start_time
        ||
        updateData.end_time
      ) {

        const existing =
          allData.find(s => s.id == id);

        const start =
          updateData.start_time
          || existing.start_time;

        const end =
          updateData.end_time
          || existing.end_time;

        updateData.time =
          `${start} - ${end}`;
      }

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          id,
          data: updateData
        })
      });

      if (!response.ok) {

        showToast("Update failed");

        return;
      }

    }

    editedSlots = {};

    showToast("All changes saved!");

    loadSlots();
  }

  // time changes 12h to 24h format
  function convertTo12Hour(timeValue, period) {

    if (!timeValue) return "";

    return `${timeValue}${period}`;
  }

  // =========================
  // ADD SLOT
  // =========================
  async function addSlot() {

    const date =
      document.getElementById("slot-date").value;

    const court_id =
      document.getElementById("slot-court").value;

    const start_time = convertTo12Hour(
      document.getElementById("slot-start").value,
      document.getElementById("slot-start-period").value
    );

    const end_time = convertTo12Hour(
      document.getElementById("slot-end").value,
      document.getElementById("slot-end-period").value
    );

    const price =
      document.getElementById("slot-price").value;

    const status =
      document.getElementById("slot-status").value;

      //Duplicate Slot Warning 
      const duplicate = allData.find(s =>
        s.date === date &&
        String(s.court_id) === String(court_id) &&
        s.start_time === start_time
      );

      if (duplicate) {
        showToast("Slot already exists", "warning");
        return;
      } 
      //Duplicate Slot Warning  ends 

    const time =
      `${start_time} - ${end_time}`;

    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'add',
        data: {
          date,
          court_id,
          start_time,
          end_time,
          time,
          price,
          status
        }
      })
    });

    if (!response.ok) {
      showToast("Add failed");
      return;
    }

    showToast("Slot added successfully!");

    loadSlots();
  }

  // Mobile modal slots
  async function addSlotMobile() {

    document.getElementById("slot-date").value =
      document.getElementById("m-slot-date").value;

    document.getElementById("slot-court").value =
      document.getElementById("m-slot-court").value;

    document.getElementById("slot-start").value =
      document.getElementById("m-slot-start").value;

    document.getElementById("slot-start-period").value =
      document.getElementById("m-slot-start-period").value;

    document.getElementById("slot-end").value =
      document.getElementById("m-slot-end").value;

    document.getElementById("slot-end-period").value =
      document.getElementById("m-slot-end-period").value;

    document.getElementById("slot-price").value =
      document.getElementById("m-slot-price").value;

    document.getElementById("slot-status").value =
      document.getElementById("m-slot-status").value;

    await addSlot();

    const modal = bootstrap.Modal.getInstance(
      document.getElementById('addSlotModal')
    );

    if (modal) modal.hide();

    // setTimeout(() => {
    //   clearModalArtifacts();
    // }, 300);

    // await addSlot();

    // bootstrap.Modal
    //   .getInstance(document.getElementById('addSlotModal'))
    //   .hide();

  }

  // =========================
  // DELETE SLOT
  // =========================
  async function deleteSlot(id) {

    if (!confirm("Delete slot?")) return;

    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete',
        id
      })
    });

    if (!response.ok) {
      showToast("Delete failed", "error");
      return;
    }

    showToast("Slot deleted");

    loadSlots();
  }

  // =========================
  // ANALYTICS
  // =========================
  function setRevenueMode(value) {

  document.getElementById(
    "revenueHistoryToggle"
  ).checked = value;

  renderCharts(allData);

}

function setStatusMode(value) {

  document.getElementById(
    "statusHistoryToggle"
  ).checked = value;

  renderCharts(allData);

}

  function renderCharts(data) {

    const revenueByCourt = {
      1: 0,
      2: 0,
      3: 0
    };

    let available = 0;
    let booked = 0;
    let closed = 0;
    let disabled = 0;

// This shows Revenue By Court = for all datas,past Historic 
    // data.forEach(slot => {

    //   if (slot.status === "booked") {

    //     revenueByCourt[slot.court_id] +=
    //       Number(slot.price || 0);

    //     booked++;
    //   }

    //   if (slot.status === "available")
    //     available++;

    //   if (slot.status === "closed")
    //     closed++;

    //   if (slot.status === "disabled")
    //     disabled++;

    // });

    // Shows Revenue By Court = Current Month Only
  const month =
  new Date()
  .toLocaleDateString('sv-SE')
  .slice(0, 7);

  const showRevenueHistory =
  document.getElementById("revenueHistoryToggle")?.checked;

  
    const today =
    new Date()
    .toLocaleDateString('sv-SE');

const showStatusHistory =
  document.getElementById("statusHistoryToggle")?.checked;

const chartData =
  showStatusHistory
    ? data
    : data.filter(
        s => s.date >= today
      ); 

document.getElementById(
  "statusChartTitle"
).innerText =
  showStatusHistory
    ? "Total Slot Distribution"
    : "Upcoming Slot Distribution";      

data.forEach(slot => {

  if (slot.status !== "booked")
    return;

  if (
    !showRevenueHistory &&
    !slot.date.startsWith(month)
  ) {
    return;
  }

  revenueByCourt[slot.court_id] +=
    Number(slot.price || 0);

});

// Change Revenue Heading Dynamically
document.getElementById(
  "revenueChartTitle"
).innerText =
  showRevenueHistory
    ? "Total Revenue By Court"
    : "Current Month Revenue By Court";  

// monthly 266
chartData.forEach(slot => {

  if (slot.status === "available")
    available++;

  if (slot.status === "booked")
    booked++;

  if (slot.status === "closed")
    closed++;

  if (slot.status === "disabled")
    disabled++;

}); //

    // Destroy old charts

    if (courtRevenueChart) {
      courtRevenueChart.destroy();
    }

    if (statusChart) {
      statusChart.destroy();
    }

    // Revenue Chart

    courtRevenueChart =
      new Chart(
        document.getElementById(
          "courtRevenueChart"
        ),
        {
          type: "bar",

          data: {
            labels: [
              "Court 1",
              "Court 2",
              "Court 3"
            ],

            datasets: [{
              label: "Revenue ₹",

              data: [
                revenueByCourt[1],
                revenueByCourt[2],
                revenueByCourt[3]
              ],

              backgroundColor: [
                "#2563eb",
                "#16a34a",
                "#f59e0b"
              ]
            }]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        }
      );

    // Status Chart

    statusChart =
      new Chart(
        document.getElementById(
          "statusChart"
        ),
        {
          type: "doughnut",

          data: {
            labels: [
              `Available (${available})`,
              `Booked (${booked})`,
              `Closed (${closed})`,
              `Disabled (${disabled})`
            ],

            datasets: [{
              data: [
                available,
                booked,
                closed,
                disabled
              ],

              backgroundColor: [
                "#22c55e",
                "#ef4444",
                "#f59e0b",
                "#6b7280"
              ]
            }]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        }
      );
  }
  // 

  function updateAnalytics(data) {

    // const today = new Date().toISOString().slice(0, 10);
    const today = new Date().toLocaleDateString('sv-SE');
    const month = today.slice(0, 7);

    let todayRev = 0, todayBook = 0;
    let monthRev = 0;

    let hourMap = {};

    let todayTotal = 0;
    let todayBooked = 0;

    data.forEach(s => {

      if (s.date === today) {
  todayTotal++;

  if (s.status === "booked") {
    todayBooked++;
  }
}


      if (s.status !== "booked") return;

      const price = Number(s.price || 0);

      if (s.date === today) {
        todayRev += price;
        todayBook++;
      }

      if (s.date.startsWith(month)) {
        monthRev += price;
      }

      const h = s.start_time || "Unknown";
      hourMap[h] = (hourMap[h] || 0) + 1;
    });

    let peak = "-", max = 0;

    Object.keys(hourMap).forEach(h => {
      if (hourMap[h] > max) {
        max = hourMap[h];
        peak = h;
      }
    });

    document.getElementById("revToday").innerText = todayRev;
    document.getElementById("bookToday").innerText = todayBook;
    document.getElementById("revMonth").innerText = monthRev;
    document.getElementById("peakHour").innerText = peak;

    // Live slot Status Counts for whole historic datas
    // const available =
    //   data.filter(s => s.status === "available").length;

    // const booked =
    //   data.filter(s => s.status === "booked").length;

    // const closed =
    //   data.filter(s => s.status === "closed").length;

    // const disabled =
    //   data.filter(s => s.status === "disabled").length;
    //-------------------------------------------------------------- 

    // Upcoming Slots Only (Today + Future)
    // const upcoming =
    //   data.filter(s => s.date >= today);

    // const available =
    //   upcoming.filter(s => s.status === "available").length;

    // const booked =
    //   upcoming.filter(s => s.status === "booked").length;

    // const closed =
    //   upcoming.filter(s => s.status === "closed").length;

    // const disabled =
    //   upcoming.filter(s => s.status === "disabled").length;
   //-------------------------------------------------------------- 
   
   // Respect Show Past Slots checkbox
    const showPast =
      document.getElementById("showPastSlots")?.checked;

    const countData =
      showPast
        ? data
        : data.filter(s => s.date >= today);

    const available =
      countData.filter(
        s => s.status === "available"
      ).length;

    const booked =
      countData.filter(
        s => s.status === "booked"
      ).length;

    const closed =
      countData.filter(
        s => s.status === "closed"
      ).length;

    const disabled =
      countData.filter(
        s => s.status === "disabled"
      ).length;
    //--------------------------------------------------------------  

const distinctCourts = [...new Set(allData.map(s => Number(s.court_id)))].sort((a, b) => a - b);
const courtButtonsHtml = distinctCourts.map(cid =>
  `<button class="btn btn-outline-info btn-sm" data-filter-court="${cid}" onclick="toggleCourtFilter(${cid})">Court ${cid}</button>`
).join(" ");

document.getElementById("slotFilterBar").innerHTML = `

<div class="d-flex flex-wrap gap-2 align-items-center">

<span class="text-muted small me-1">Date:</span>
<button
  class="btn btn-outline-primary btn-sm"
  data-filter-date="today"
  onclick="toggleDateFilter('today')">

  Today

</button>

<span class="text-muted small ms-2 me-1">Status:</span>
<button
  class="btn btn-outline-success btn-sm"
  data-filter-status="available"
  onclick="toggleStatusFilter('available')">

  Available (${available})

</button>

<button
  class="btn btn-outline-danger btn-sm"
  data-filter-status="booked"
  onclick="toggleStatusFilter('booked')">

  Booked (${booked})

</button>

<button
  class="btn btn-outline-warning btn-sm"
  data-filter-status="closed"
  onclick="toggleStatusFilter('closed')">

  Closed (${closed})

</button>

<button
  class="btn btn-outline-secondary btn-sm"
  data-filter-status="disabled"
  onclick="toggleStatusFilter('disabled')">

  Disabled (${disabled})

</button>

<span class="text-muted small ms-2 me-1">Court:</span>
${courtButtonsHtml}

<button
  class="btn btn-outline-dark btn-sm ms-2"
  onclick="resetFilters()">

  Reset

</button>

</div>

<style>
  #slotFilterBar button.active {
    box-shadow: inset 0 0 0 2px currentColor;
    font-weight: 600;
  }
</style>
`;
updateFilterButtonStyles();

    // 
    const utilization =
      todayTotal === 0
        ? 0
        : Math.round((todayBooked / todayTotal) * 100);

    document.getElementById("utilization").innerText =
      utilization + "%";
  }

// ---- Visual Availability Chart (V5 Executive Dashboard) ----
// =========================
// TIME SORTING HELPERS
// =========================

/**
 * Converts a 12-hour time string to minutes since midnight for sorting
 * @param {string} timeStr - Time in format like "10:00AM", "10:00 PM", "12:30PM"
 * @returns {number} - Minutes since midnight (0-1439)
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  const clean = timeStr.replace(/\s/g, '').toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  
  const timeOnly = clean.replace(/[AP]M$/, '');
  const [hours, minutes = 0] = timeOnly.split(':').map(Number);
  
  let hour24 = hours;
  if (isPM && hours !== 12) hour24 += 12;
  if (isAM && hours === 12) hour24 = 0;
  
  return hour24 * 60 + minutes;
}

/**
 * Compare two time strings for sorting
 * @param {string} a - First time string
 * @param {string} b - Second time string
 * @returns {number} - Negative if a < b, positive if a > b, 0 if equal
 */
function compareTimes(a, b) {
  return timeToMinutes(a) - timeToMinutes(b);
}
// helper ends
function renderAvailabilityChart() {
  const dateInput = document.getElementById("chart-date");
  const date = dateInput.value || new Date().toLocaleDateString('sv-SE');
  dateInput.value = date;

  const daySlots = allData.filter(s => s.date === date);
  const courts = [...new Set(daySlots.map(s => Number(s.court_id)))].sort((a, b) => a - b);
  //const times = [...new Set(daySlots.map(s => s.start_time || s.time || ""))].sort();
  //NEW FIX: Get unique times and sort chronologically
  const times = [...new Set(daySlots.map(s => s.start_time || s.time || ""))]
    .filter(t => t) // Remove empty strings
    .sort(compareTimes);

  const container = document.getElementById("availabilityChartBody");

  // Build summary per court
  const summary = {};
  courts.forEach(c => {
    summary[c] = {
      available: 0,
      booked: 0,
      closed: 0,
      disabled: 0
    };
  });

  daySlots.forEach(slot => {
    if (summary[slot.court_id]) {
      summary[slot.court_id][slot.status]++;
    }
  });

  // Calculate overall totals
  let totalAvailable = 0, totalBooked = 0, totalClosed = 0, totalDisabled = 0;
  courts.forEach(c => {
    totalAvailable += summary[c].available;
    totalBooked += summary[c].booked;
    totalClosed += summary[c].closed;
    totalDisabled += summary[c].disabled;
  });
  const totalSlots = totalAvailable + totalBooked + totalClosed + totalDisabled;
  const overallOccupancy = totalSlots === 0 ? 0 : Math.round((totalBooked / totalSlots) * 100);

  if (times.length === 0 || courts.length === 0) {
    container.innerHTML = `<p class="text-muted text-center py-3">No slots found for ${date}</p>`;
    return;
  }

  const courtColors = {
    1: { primary: '#2563eb', bg: '#eff6ff' },
    2: { primary: '#16a34a', bg: '#f0fdf4' },
    3: { primary: '#f59e0b', bg: '#fffbeb' }
  };

  // Build Court Cards HTML
  let cardsHtml = `<div class="row g-3 mb-4">`;

  courts.forEach(c => {
    const s = summary[c];
    const total = s.available + s.booked + s.closed + s.disabled;
    const occupancy = total === 0 ? 0 : Math.round((s.booked / total) * 100);
    const color = courtColors[c] || { primary: '#6b7280', bg: '#f9fafb' };

    cardsHtml += `
      <div class="col-6 col-md-3">
        <div class="card shadow-sm border-0 h-100 court-card court-${c}">
          <div class="card-body">
            <h6 class="court-number">Court ${c}</h6>
            <div class="occupancy-percent">${occupancy}%</div>
            <div class="occupancy-label">Occupancy</div>
            <div class="progress mt-2">
              <div class="progress-bar" style="width:${occupancy}%"></div>
            </div>
            <div class="court-stats row g-0 text-center">
              <div class="col">
                <div class="stat-number text-success">${s.available}</div>
                <div class="stat-label">Available</div>
              </div>
              <div class="col">
                <div class="stat-number text-danger">${s.booked}</div>
                <div class="stat-label">Booked</div>
              </div>
              <div class="col">
                <div class="stat-number text-warning">${s.closed}</div>
                <div class="stat-label">Closed</div>
              </div>
              <div class="col">
                <div class="stat-number text-secondary">${s.disabled}</div>
                <div class="stat-label">Disabled</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  // Overall Summary Card
  const progressColor = overallOccupancy > 70 ? 'bg-success' : (overallOccupancy > 40 ? 'bg-warning' : 'bg-danger');
  cardsHtml += `
    <div class="col-6 col-md-3">
      <div class="overall-card">
        <div class="overall-percent">${overallOccupancy}%</div>
        <div class="overall-label">Overall Occupancy</div>
        <div class="progress mt-2">
          <div class="progress-bar ${progressColor}" style="width:${overallOccupancy}%"></div>
        </div>
        <div class="overall-stats row g-0 text-center">
          <div class="col">
            <div class="stat-number">${totalSlots}</div>
            <div class="stat-label">Total Slots</div>
          </div>
          <div class="col">
            <div class="stat-number text-success">${totalAvailable}</div>
            <div class="stat-label">Available</div>
          </div>
          <div class="col">
            <div class="stat-number text-danger">${totalBooked}</div>
            <div class="stat-label">Booked</div>
          </div>
        </div>
      </div>
    </div>
  `;
  cardsHtml += `</div>`;

  // Build Availability Table
  const statusDot = (status) => {
    const map = {
      'available': 'available',
      'booked': 'booked',
      'closed': 'closed',
      'disabled': 'disabled'
    };
    return `<span class="status-dot ${map[status] || ''}" title="${status || ''}" onclick="${status ? `scrollToSlotRow(${slotId})` : ''}"></span>`;
  };

  let tableHtml = `
    <div class="availability-table-wrapper">
      <div class="table-responsive">
        <table class="table table-bordered text-center align-middle mb-0">
          <thead>
            <tr>
              <th style="min-width:70px;">Time</th>
  `;

  courts.forEach(c => {
    tableHtml += `
      <th>
        <span class="court-label">Court ${c}</span>
      </th>
    `;
  });

  tableHtml += `
            </tr>
          </thead>
          <tbody>
  `;

  times.forEach(t => {
    tableHtml += `<tr><td>${t}</td>`;
    courts.forEach(c => {
      const slot = daySlots.find(s => (s.start_time || s.time) === t && Number(s.court_id) === c);
      const status = slot ? slot.status : null;
      const slotId = slot ? slot.id : null;
      const dotClass = status ? `status-dot ${status}` : 'status-dot';
      const clickAttr = slotId ? `onclick="showSlotDetails(${slotId})" title="Click to view details"` : '';
      tableHtml += `
        <td>
          <span class="${dotClass}" ${clickAttr} title="${status || 'Empty'}"></span>
        </td>
      `;
    });
    tableHtml += `</tr>`;
  });

  tableHtml += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Legend
  const legendHtml = `
    <div class="d-flex gap-3 flex-wrap justify-content-center mt-3 small">
      <span><span class="legend-dot available"></span><span class="legend-text">Available</span></span>
      <span><span class="legend-dot booked"></span><span class="legend-text">Booked</span></span>
      <span><span class="legend-dot closed"></span><span class="legend-text">Closed</span></span>
      <span><span class="legend-dot disabled"></span><span class="legend-text">Disabled</span></span>
      <span class="text-muted"><i class="bi bi-hand-index-thumb"></i> Click dot for details</span>
    </div>
  `;

  container.innerHTML = cardsHtml + tableHtml + legendHtml;
}

// =========================
// SLOT DETAILS MODAL WITH FULL ACTIONS
// =========================

// Store the currently viewed slot ID
let currentViewSlotId = null;
let isEditMode = false;

function showSlotDetails(slotId) {
  // Find the slot in allData
  const slot = allData.find(s => s.id === slotId);
  if (!slot) {
    showToast("Slot not found", "error");
    return;
  }
  
  currentViewSlotId = slotId;
  isEditMode = false;
  
  // Get the modal instance
  const modal = new bootstrap.Modal(document.getElementById('slotDetailsModal'));
  
  // Generate time options for edit form
  generateTimeOptions("edit-slot-start");
  generateTimeOptions("edit-slot-end");
  
  // Build the details HTML
  const statusColors = {
    'available': 'success',
    'booked': 'danger',
    'closed': 'warning',
    'disabled': 'secondary'
  };
  
  const statusIcons = {
    'available': '✅',
    'booked': '🔴',
    'closed': '🟡',
    'disabled': '⚫'
  };
  
  const statusLabels = {
    'available': 'Available',
    'booked': 'Booked',
    'closed': 'Closed',
    'disabled': 'Disabled'
  };
  
  // Parse time for display
  const startTime = slot.start_time || '';
  const endTime = slot.end_time || '';
  
  const content = `
    <div class="slot-details" id="slotDetailsView">
      <div class="row g-3">
        <div class="col-6">
          <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
            <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Date</div>
            <div class="fw-bold fs-5">${slot.date || 'N/A'}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
            <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Court</div>
            <div class="fw-bold fs-5">🏸 Court ${slot.court_id || 'N/A'}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
            <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Start Time</div>
            <div class="fw-bold fs-5">🕐 ${startTime || 'N/A'}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
            <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">End Time</div>
            <div class="fw-bold fs-5">🕐 ${endTime || 'N/A'}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
            <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Price</div>
            <div class="fw-bold fs-5">💰 ₹${slot.price || 0}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
            <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Status</div>
            <div class="fw-bold fs-5">
              <span class="badge bg-${statusColors[slot.status] || 'secondary'}">
                ${statusIcons[slot.status] || '⬜'} ${statusLabels[slot.status] || slot.status}
              </span>
            </div>
          </div>
        </div>
          ${slot.status === 'booked' ? `
          <div class="col-12">
            <div class="detail-item p-3 rounded-3" style="background:#f0f7ff;border-left:4px solid #2563eb;">
              <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Booking Details</div>
              <div class="mt-1">
                <div><strong>Customer:</strong> ${slot.booking_name || slot.customer_name || 'N/A'}</div>
                <div><strong>Mobile:</strong> ${slot.booking_mobile || slot.customer_mobile || 'N/A'}</div>
                <div><strong>Email:</strong> ${slot.booking_email || slot.customer_email || 'N/A'}</div>
                <div><strong>Payment:</strong> ${slot.payment_status || 'N/A'}</div>
                ${slot.booking_notes ? `<div><strong>Notes:</strong> ${slot.booking_notes}</div>` : ''}
              </div>
            </div>
          </div>
          ` : `
          <div class="col-12">
            <div class="detail-item p-3 rounded-3" style="background:#f8fafc;border-left:4px solid #94a3b8;">
              <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Slot ID</div>
              <div class="fw-bold">#${slot.id}</div>
            </div>
          </div>
          `}
      </div>
    </div>
  `;
  
  // Set the content
  document.getElementById('slotDetailsContent').innerHTML = content;
  
  // Hide edit form, show view
  document.getElementById('slotEditForm').style.display = 'none';
  document.getElementById('slotDetailsView').style.display = 'block';
  
  // Show/Hide action buttons based on status
  const deleteBtn = document.getElementById('slotDetailsDeleteBtn');
  const bookBtn = document.getElementById('slotDetailsBookBtn');
  
  // Show delete button always (but with confirmation)
  deleteBtn.style.display = 'inline-block';
  
  // Show Book button only if slot is NOT booked
  if (slot.status === 'booked') {
    bookBtn.style.display = 'none';
  } else {
    bookBtn.style.display = 'inline-block';
  }
  
  // Show Edit button, hide Save/Cancel buttons
  document.getElementById('slotDetailsEditBtn').style.display = 'inline-block';
  document.getElementById('slotDetailsSaveBtn').style.display = 'none';
  document.getElementById('slotDetailsCancelBtn').style.display = 'none';
  
  // Show the modal
  modal.show();
}

// Toggle between view and edit mode
function toggleSlotEditMode() {
  if (isEditMode) {
    // If already in edit mode, just return
    return;
  }
  
  isEditMode = true;
  
  // Find the slot
  const slot = allData.find(s => s.id === currentViewSlotId);
  if (!slot) {
    showToast("Slot not found", "error");
    return;
  }
  
  // Hide view, show edit form
  document.getElementById('slotDetailsView').style.display = 'none';
  document.getElementById('slotEditForm').style.display = 'block';
  
  // Populate edit form with current values
  document.getElementById('edit-slot-id').value = slot.id;
  document.getElementById('edit-slot-date').value = slot.date || '';
  document.getElementById('edit-slot-court').value = slot.court_id || 1;
  document.getElementById('edit-slot-price').value = slot.price || 400;
  document.getElementById('edit-slot-status').value = slot.status || 'available';
  
  // Parse and set time values
  if (slot.start_time) {
    const startParts = parseTimeString(slot.start_time);
    document.getElementById('edit-slot-start').value = startParts.time;
    document.getElementById('edit-slot-start-period').value = startParts.period;
  }
  
  if (slot.end_time) {
    const endParts = parseTimeString(slot.end_time);
    document.getElementById('edit-slot-end').value = endParts.time;
    document.getElementById('edit-slot-end-period').value = endParts.period;
  }
  
  // Hide action buttons (Delete, Book) and Edit button
  document.getElementById('slotDetailsDeleteBtn').style.display = 'none';
  document.getElementById('slotDetailsBookBtn').style.display = 'none';
  document.getElementById('slotDetailsEditBtn').style.display = 'none';
  
  // Show Save/Cancel buttons
  document.getElementById('slotDetailsSaveBtn').style.display = 'inline-block';
  document.getElementById('slotDetailsCancelBtn').style.display = 'inline-block';
}

// Cancel edit mode
function cancelSlotEdit() {
  isEditMode = false;
  
  // Show view, hide edit form
  document.getElementById('slotDetailsView').style.display = 'block';
  document.getElementById('slotEditForm').style.display = 'none';
  
  // Show action buttons and Edit button
  const slot = allData.find(s => s.id === currentViewSlotId);
  if (slot) {
    // Show delete button
    document.getElementById('slotDetailsDeleteBtn').style.display = 'inline-block';
    
    // Show Book button only if not booked
    if (slot.status === 'booked') {
      document.getElementById('slotDetailsBookBtn').style.display = 'none';
    } else {
      document.getElementById('slotDetailsBookBtn').style.display = 'inline-block';
    }
  }
  
  document.getElementById('slotDetailsEditBtn').style.display = 'inline-block';
  document.getElementById('slotDetailsSaveBtn').style.display = 'none';
  document.getElementById('slotDetailsCancelBtn').style.display = 'none';
}

// Save edited slot
async function saveSlotEdit() {
  const id = parseInt(document.getElementById('edit-slot-id').value);
  const date = document.getElementById('edit-slot-date').value;
  const court_id = document.getElementById('edit-slot-court').value;
  const price = document.getElementById('edit-slot-price').value;
  const status = document.getElementById('edit-slot-status').value;
  
  // Get start time with period
  const startTime = document.getElementById('edit-slot-start').value;
  const startPeriod = document.getElementById('edit-slot-start-period').value;
  const start_time = `${startTime}${startPeriod}`;
  
  // Get end time with period
  const endTime = document.getElementById('edit-slot-end').value;
  const endPeriod = document.getElementById('edit-slot-end-period').value;
  const end_time = `${endTime}${endPeriod}`;
  
  // Validate
  if (!date || !startTime || !endTime) {
    showToast("Please fill all required fields", "warning");
    return;
  }
  
  // Check for duplicate (excluding current slot)
  const duplicate = allData.find(s => 
    s.id !== id &&
    s.date === date &&
    String(s.court_id) === String(court_id) &&
    s.start_time === start_time
  );
  
  if (duplicate) {
    showToast("Another slot already exists at this time on this court", "warning");
    return;
  }
  
  // Prepare update data - preserve booking details if status is booked
  const updateData = {
    date: date,
    court_id: court_id,
    start_time: start_time,
    end_time: end_time,
    time: `${start_time} - ${end_time}`,
    price: price,
    status: status
  };

  // If status is being changed to booked, we need to keep booking details
  // If status is being changed from booked to something else, we should clear booking details
  const originalSlot = allData.find(s => s.id === id);
  if (status === 'booked' && originalSlot && originalSlot.status === 'booked') {
    // Preserve existing booking details
    if (originalSlot.booking_name) updateData.booking_name = originalSlot.booking_name;
    if (originalSlot.booking_mobile) updateData.booking_mobile = originalSlot.booking_mobile;
    if (originalSlot.booking_email) updateData.booking_email = originalSlot.booking_email;
    if (originalSlot.booking_notes) updateData.booking_notes = originalSlot.booking_notes;
    if (originalSlot.payment_status) updateData.payment_status = originalSlot.payment_status;
  } else if (status !== 'booked' && originalSlot && originalSlot.status === 'booked') {
    // Clearing booking details when changing from booked to something else
    updateData.booking_name = null;
    updateData.booking_mobile = null;
    updateData.booking_email = null;
    updateData.booking_notes = null;
    updateData.payment_status = null;
  }
  
  try {
    // Send update to server
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update',
        id: id,
        data: updateData
      })
    });
    
    if (!response.ok) {
      showToast("Update failed", "error");
      return;
    }
    
    showToast("Slot updated successfully!", "success");
    
    // Reload data
    await loadSlots();
    
    // Refresh the availability chart
    renderAvailabilityChart();
    
    // Update the modal with new data (instead of closing)
    // Reset edit mode
    isEditMode = false;
    
    // Get the updated slot
    const updatedSlot = allData.find(s => s.id === id);
    if (updatedSlot) {
      // Rebuild the view with updated data
      const statusColors = {
        'available': 'success',
        'booked': 'danger',
        'closed': 'warning',
        'disabled': 'secondary'
      };
      
      const statusIcons = {
        'available': '✅',
        'booked': '🔴',
        'closed': '🟡',
        'disabled': '⚫'
      };
      
      const statusLabels = {
        'available': 'Available',
        'booked': 'Booked',
        'closed': 'Closed',
        'disabled': 'Disabled'
      };
      
      const startTimeDisplay = updatedSlot.start_time || '';
      const endTimeDisplay = updatedSlot.end_time || '';
      
      const content = `
        <div class="slot-details" id="slotDetailsView">
          <div class="row g-3">
            <div class="col-6">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Date</div>
                <div class="fw-bold fs-5">${updatedSlot.date || 'N/A'}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Court</div>
                <div class="fw-bold fs-5">🏸 Court ${updatedSlot.court_id || 'N/A'}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Start Time</div>
                <div class="fw-bold fs-5">🕐 ${startTimeDisplay || 'N/A'}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">End Time</div>
                <div class="fw-bold fs-5">🕐 ${endTimeDisplay || 'N/A'}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Price</div>
                <div class="fw-bold fs-5">💰 ₹${updatedSlot.price || 0}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Status</div>
                <div class="fw-bold fs-5">
                  <span class="badge bg-${statusColors[updatedSlot.status] || 'secondary'}">
                    ${statusIcons[updatedSlot.status] || '⬜'} ${statusLabels[updatedSlot.status] || updatedSlot.status}
                  </span>
                </div>
              </div>
            </div>
            ${updatedSlot.status === 'booked' ? `
            <div class="col-12">
              <div class="detail-item p-3 rounded-3" style="background:#f0f7ff;border-left:4px solid #2563eb;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Booking Details</div>
                <div class="mt-1">
                  <div><strong>Customer:</strong> ${updatedSlot.booking_name || 'N/A'}</div>
                  <div><strong>Mobile:</strong> ${updatedSlot.booking_mobile || 'N/A'}</div>
                  <div><strong>Email:</strong> ${updatedSlot.booking_email || 'N/A'}</div>
                  <div><strong>Payment:</strong> ${updatedSlot.payment_status || 'N/A'}</div>
                </div>
              </div>
            </div>
            ` : `
            <div class="col-12">
              <div class="detail-item p-3 rounded-3" style="background:#f8fafc;border-left:4px solid #94a3b8;">
                <div class="text-muted small fw-semibold text-uppercase" style="font-size:0.65rem;letter-spacing:0.5px;">Slot ID</div>
                <div class="fw-bold">#${updatedSlot.id}</div>
              </div>
            </div>
            `}
          </div>
        </div>
      `;
      
      document.getElementById('slotDetailsContent').innerHTML = content;
      
      // Hide edit form, show view
      document.getElementById('slotEditForm').style.display = 'none';
      document.getElementById('slotDetailsView').style.display = 'block';
      
      // Show/Hide action buttons based on status
      const deleteBtn = document.getElementById('slotDetailsDeleteBtn');
      const bookBtn = document.getElementById('slotDetailsBookBtn');
      
      deleteBtn.style.display = 'inline-block';
      
      if (updatedSlot.status === 'booked') {
        bookBtn.style.display = 'none';
      } else {
        bookBtn.style.display = 'inline-block';
      }
      
      // Show Edit button, hide Save/Cancel
      document.getElementById('slotDetailsEditBtn').style.display = 'inline-block';
      document.getElementById('slotDetailsSaveBtn').style.display = 'none';
      document.getElementById('slotDetailsCancelBtn').style.display = 'none';
    }
    
  } catch (err) {
    console.error(err);
    showToast("Error updating slot", "error");
  }
}

// Delete slot from modal
async function deleteSlotFromModal() {
  if (!currentViewSlotId) {
    showToast("No slot selected", "warning");
    return;
  }
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete Slot #${currentViewSlotId}?`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete',
        id: currentViewSlotId
      })
    });
    
    if (!response.ok) {
      showToast("Delete failed", "error");
      return;
    }
    
    showToast("Slot deleted successfully!", "success");
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('slotDetailsModal'));
    if (modal) modal.hide();
    
    // Reload data
    await loadSlots();
    
    // Refresh the availability chart
    renderAvailabilityChart();
    
  } catch (err) {
    console.error(err);
    showToast("Error deleting slot", "error");
  }
}

// Book slot from modal - opens the booking modal
function bookSlotFromModal() {
  if (!currentViewSlotId) {
    showToast("No slot selected", "warning");
    return;
  }
  
  // Close the slot details modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('slotDetailsModal'));
  if (modal) modal.hide();
  
  // Open the booking modal for this slot
  // Small delay to allow slot modal to close first
  setTimeout(() => {
    openBookingModal(currentViewSlotId);
  }, 300);
}

// Helper function to parse time string like "10:00AM" into {time: "10:00", period: "AM"}
function parseTimeString(timeStr) {
  if (!timeStr) return { time: '12:00', period: 'AM' };
  
  const clean = timeStr.trim().toUpperCase();
  let period = 'AM';
  let time = clean;
  
  if (clean.includes('PM')) {
    period = 'PM';
    time = clean.replace('PM', '');
  } else if (clean.includes('AM')) {
    period = 'AM';
    time = clean.replace('AM', '');
  }
  
  // Ensure time has colon format
  if (!time.includes(':')) {
    // If it's like "100", convert to "1:00"
    if (time.length <= 2) {
      time = `${time}:00`;
    } else {
      const hours = time.slice(0, -2);
      const mins = time.slice(-2);
      time = `${hours}:${mins}`;
    }
  }
  
  return { time: time.trim(), period: period };
}

// Keep the old function for backward compatibility (optional)
function scrollToSlotRow(slotId) {
  showSlotDetails(slotId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Load slots first, then bookings
  loadSlots().then(() => {
    if (typeof loadBookings === 'function') {
      loadBookings();
    }
  });
});