// ============================================================
// bookings.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// BOOKING JS
// =================================================

// Mark booking as Paid with one click
async function markPaid(bookingId) {

  const res = await fetch("/api/admin-bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      id: bookingId,
      data: { payment_status: "paid" }
    })
  });

  if (!res.ok) { showToast("Update failed", "error"); return; }

  // Update in memory so no full reload needed
  const booking = window.allBookings?.find(b => b.id === bookingId);
  if (booking) booking.payment_status = "paid";

  showToast("Marked as Paid ✅");
  filterBookings(document.querySelector(".btn-group .active")?.id?.replace("filter-","") || "all");
}

// Filter bookings by payment status
function filterBookings(status) {

  // Update active button style
  ["all","pending","paid"].forEach(s => {
    const btn = document.getElementById("filter-" + s);
    if (btn) btn.classList.toggle("active", s === status);
  });

  const bookings = window.allBookings || [];
  const today = new Date().toLocaleDateString("sv-SE");

  const filtered = bookings.filter(b => {
    const slotDate = b.slots?.date || "";
    const dateOk = !slotDate || slotDate >= today;
    const payOk = status === "all" || b.payment_status === status;
    return dateOk && payOk;
  });

  renderBookingRows(filtered);
}

// Renders rows — called by both loadBookings and filterBookings
function renderBookingRows(bookings) {

  const tbody = document.getElementById("bookingTableBody");
  tbody.innerHTML = "";

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No bookings found</td></tr>`;
    return;
  }

  bookings.forEach(b => {
    const slot = b.slots || {};
    const slotLabel = slot.date
      ? `${slot.date}<br><small class="text-muted">${slot.start_time||""} - ${slot.end_time||""}</small>`
      : `Slot #${b.slot_id}`;

    const payBadge = b.payment_status === "paid"
      ? `<span class="badge bg-success">Paid</span>`
      : `<span class="badge bg-warning text-dark">Pending</span>`;

    tbody.innerHTML += `
      <tr>
        <td>${slotLabel}</td>
        <td>${b.customer_name || ""}</td>
        <td><a href="tel:${b.customer_mobile}">${b.customer_mobile || ""}</a></td>
        <td><a href="mailto:${b.customer_email}">${b.customer_email || ""}</a></td>
        <td>${payBadge}</td>
        <td>${b.booking_notes || ""}</td>
        <td>
          ${b.payment_status !== "paid"
            ? `<button class="btn btn-success btn-sm my-1 me-1" onclick="markPaid(${b.id})">✅ Paid</button>`
            : ""}
          <button class="btn btn-primary btn-sm me-1 my-1" onclick="editBooking(${b.id})">Edit</button>
          <button class="btn btn-danger btn-sm my-1" onclick="deleteBooking(${b.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}
// 
// 
async function loadBookings() {

  const res =
    await fetch("/api/admin-bookings");

  const bookings =
    await res.json();
  // All bookings,present+past+future bookings:

  // window.allBookings = bookings;  
  // const tbody =
  //   document.getElementById(
  //     "bookingTableBody"
  //   );
  // tbody.innerHTML = "";
  // bookings.forEach(b => {

  // present and future booking only
window.allBookings = bookings;
  filterBookings("all"); // renders with current active filter
}
//Announcements ends here 

// VIEW BOOKING DETAILS MODAL (click "Booked" button) on table
function viewBookingDetails(slotId) {

  // Find the booking that matches this slot
  const booking = window.allBookings?.find(b => b.slot_id == slotId);

  if (!booking) {
    showToast("Booking data not loaded yet. Please wait.", "warning");
    return;
  }

  // Find the slot for date/time info
  const slot = allData.find(s => s.id == slotId);

  // Fill the view modal fields
  document.getElementById("view-slot-info").textContent =
    slot ? `${slot.date} | Court ${slot.court_id} | ${slot.start_time} - ${slot.end_time}` : `Slot #${slotId}`;

  document.getElementById("view-booking-id").textContent   = booking.id;
  document.getElementById("view-name").textContent         = booking.customer_name || "-";
  // document.getElementById("view-mobile").textContent       = booking.customer_mobile || "-";
  const mobileEl = document.getElementById("view-mobile");
  mobileEl.textContent = booking.customer_mobile || "-";
  mobileEl.href = booking.customer_mobile ? `tel:${booking.customer_mobile}` : "#";
  // document.getElementById("view-email").textContent        = booking.customer_email || "-";
  const emailEl = document.getElementById("view-email");
  emailEl.textContent = booking.customer_email || "-";
  emailEl.href = booking.customer_email ? `mailto:${booking.customer_email}` : "#";
  document.getElementById("view-payment").textContent      = booking.payment_status || "-";
  document.getElementById("view-notes").textContent        = booking.booking_notes || "-";

  // Wire up the Edit and Delete buttons with this booking id
  document.getElementById("view-edit-btn").onclick   = () => {
    bootstrap.Modal.getInstance(document.getElementById("viewBookingModal")).hide();
    editBooking(booking.id);
  };

  document.getElementById("view-delete-btn").onclick = () => {
    bootstrap.Modal.getInstance(document.getElementById("viewBookingModal")).hide();
    deleteBooking(booking.id);
  };

  new bootstrap.Modal(
    document.getElementById("viewBookingModal")
  ).show();
}

// Booking Modal starts here
function openBookingModal(slotId){

  document
    .getElementById(
      "booking-slot-id"
    ).value = slotId;

  document.getElementById("booking-notify-email").checked = true;

  new bootstrap.Modal(

    document
      .getElementById(
        "bookingModal"
      )

  ).show();

}

async function saveBooking(){

  const slot_id =
    document
    .getElementById(
      "booking-slot-id"
    ).value;

  const customer_name =
    document
    .getElementById(
      "booking-name"
    ).value;

  const customer_mobile =
    document
    .getElementById(
      "booking-mobile"
    ).value;

  const customer_email =
    document
    .getElementById(
      "booking-email"
    ).value;

  const booking_notes =
    document
    .getElementById(
      "booking-notes"
    ).value;

  const payment_status =
    document
    .getElementById(
      "payment-status"
    ).value;

  const res =
    await fetch(
      "/api/admin-bookings",
      {
        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:JSON.stringify({

          action:"add",

          data:{

            slot_id,

            customer_name,

            customer_mobile,

            customer_email,

            booking_notes,

            payment_status

          }

        })

      }
    );

  if(!res.ok){

    showToast(
      "Booking failed",
      "error"
    );

    return;
  }

  showToast(
    "Booking saved"
  );

  // Send booking confirmation email if customer opted in and we have their email
  const shouldNotify = document.getElementById("booking-notify-email")?.checked;
  if (shouldNotify && customer_email) {
    const slot = (allData || []).find(s => s.id == slot_id);
    const bookingIdLabel = `SEBA-${slot_id}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#198754;">Booking Confirmed ✅</h2>
        <p>Dear ${customer_name || "Customer"},</p>
        <p>Your court booking is confirmed:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td><strong>${bookingIdLabel}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666;">Date</td><td>${slot?.date || ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Time</td><td>${slot?.start_time || slot?.time || ""} - ${slot?.end_time || ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Amount</td><td><strong>₹${slot?.price || 0}</strong></td></tr>
        </table>
        <p style="margin-top:16px;">See you on court!</p>
        <p style="color:#888;">Shivani Elite Badminton Academy</p>
      </div>
    `;
    sendMail(customer_email, "Booking Confirmed - Shivani Elite Badminton Academy", html);
  }

  bootstrap.Modal
    .getInstance(
      document.getElementById(
        "bookingModal"
      )
    )
    .hide();

  loadSlots();
  loadBookings(); // ← AUTO REFRESH bottom Booking Management table


}
// 
async function deleteBooking(id) {

  if (!confirm("Delete booking and restore slot to Available?")) return;

  // Find the booking to get slot_id before deleting
  const booking = window.allBookings?.find(b => b.id === id);
  const slotId = booking?.slot_id;
  const shouldNotify = booking && booking.customer_email
    ? confirm("Also inform the customer by email that their booking was cancelled?")
    : false;

  const res = await fetch("/api/admin-bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });

  if (!res.ok) {
    showToast("Delete failed", "error");
    return;
  }

  // Revert slot status back to available
  if (slotId) {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: slotId,
        data: { status: "available" }
      })
    });
  }

  showToast("Booking deleted & slot restored to Available");

  if (shouldNotify) {
    const slot = (allData || []).find(s => s.id == slotId);
    const bookingIdLabel = `SEBA-${slotId}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#dc3545;">Booking Cancelled</h2>
        <p>Dear ${booking.customer_name || "Customer"},</p>
        <p>Your court booking has been cancelled:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td><strong>${bookingIdLabel}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666;">Date</td><td>${slot?.date || ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Time</td><td>${slot?.start_time || slot?.time || ""} - ${slot?.end_time || ""}</td></tr>
        </table>
        <p style="margin-top:16px;">If this wasn't expected, please contact us.</p>
        <p style="color:#888;">Shivani Elite Badminton Academy</p>
      </div>
    `;
    sendMail(booking.customer_email, "Booking Cancelled - Shivani Elite Badminton Academy", html);
  }

  loadBookings();
  loadSlots();
}

// EXPORT BOOKINGS AS CSV
function exportBookingsCSV() {

  const bookings = window.allBookings;

  if (!bookings || bookings.length === 0) {
    showToast("No bookings to export", "warning");
    return;
  }

  // Define columns and their labels
  const headers = [
    "Booking ID", "Slot ID", "Date", "Court",
    "Start Time", "End Time",
    "Customer Name", "Mobile", "Email",
    "Payment Status", "Notes", "Created At"
  ];

  // Build each row
  const rows = bookings.map(b => {
    const slot = b.slots || {};

    // Wrap value in quotes and escape any inner quotes
    function esc(val) {
      const v = val === null || val === undefined ? "" : String(val);
      return `"${v.replace(/"/g, '""')}"`;
    }

    return [
      esc(b.id),
      esc(b.slot_id),
      esc(slot.date || ""),
      esc(slot.court_id ? "Court " + slot.court_id : ""),
      esc(slot.start_time || ""),
      esc(slot.end_time || ""),
      esc(b.customer_name),
      esc(b.customer_mobile),
      esc(b.customer_email),
      esc(b.payment_status),
      esc(b.booking_notes),
      esc(b.created_at ? b.created_at.slice(0, 10) : "")
    ].join(",");
  });

  // Combine header + rows
  const csv = [headers.join(","), ...rows].join("\n");

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const today = new Date().toLocaleDateString("sv-SE");
  a.href     = url;
  a.download = `bookings-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`Exported ${bookings.length} bookings`);
}

// booking modal EDIT JS starts
function editBooking(id) {

  const booking =
    window.allBookings?.find(b => b.id === id);

  if (!booking) return;

  document.getElementById("edit-booking-id").value = id;
  document.getElementById("edit-payment").value = booking.payment_status;
  document.getElementById("edit-mobile").value = booking.customer_mobile;
  document.getElementById("edit-email").value = booking.customer_email;
  document.getElementById("edit-notes").value = booking.booking_notes || "";

  new bootstrap.Modal(
    document.getElementById("editBookingModal")
  ).show();
}
// SAVE EDIT (BACKEND CALL)
async function saveEditBooking() {

  const id =
    document.getElementById("edit-booking-id").value;

  const payment_status =
    document.getElementById("edit-payment").value;

  const customer_mobile =
    document.getElementById("edit-mobile").value;

  const customer_email =
    document.getElementById("edit-email").value;

  const booking_notes =
    document.getElementById("edit-notes").value;

  const res = await fetch("/api/admin-bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "update",
      id,
      data: {
        payment_status,
        customer_mobile,
        customer_email,
        booking_notes
      }
    })
  });

  if (!res.ok) {
    showToast("Update failed", "error");
    return;
  }

  showToast("Booking updated");

  bootstrap.Modal.getInstance(
    document.getElementById("editBookingModal")
  ).hide();

  loadBookings();
}

// Booking Modal ends here
