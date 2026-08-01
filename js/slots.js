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
function renderAvailabilityChart() {
  const dateInput = document.getElementById("chart-date");
  const date = dateInput.value || new Date().toLocaleDateString('sv-SE');
  dateInput.value = date;

  const daySlots = allData.filter(s => s.date === date);
  const courts = [...new Set(daySlots.map(s => Number(s.court_id)))].sort((a, b) => a - b);
  const times = [...new Set(daySlots.map(s => s.start_time || s.time || ""))].sort();

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
      const clickAttr = slotId ? `onclick="scrollToSlotRow(${slotId})"` : '';
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
      <span class="text-muted"><i class="bi bi-hand-index-thumb"></i> Click dot to jump to slot</span>
    </div>
  `;

  container.innerHTML = cardsHtml + tableHtml + legendHtml;
}

// Optional nice-to-have: clicking a chart cell jumps to that row in the main table
function scrollToSlotRow(slotId) {
  const row = document.querySelector(`.slot-checkbox[data-id="${slotId}"]`);
  if (row) {
    row.closest("tr").scrollIntoView({ behavior: "smooth", block: "center" });
    row.closest("tr").style.outline = "3px solid #0d6efd";
    setTimeout(() => { row.closest("tr").style.outline = ""; }, 1500);
  }
}