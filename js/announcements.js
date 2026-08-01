// ============================================================
// announcements.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// ANNOUNCEMENTS JS
// =================================================

function showAnnouncementForm() {
  document.getElementById("ann-id").value = "";
  document.getElementById("ann-title").value = "";
  document.getElementById("ann-message").value = "";
  document.getElementById("ann-start").value = "";
  document.getElementById("ann-end").value = "";
  document.getElementById("ann-active").value = "true";
  document.getElementById("ann-marquee").value = "false";
  document.getElementById("ann-alert").value = "false";
  document.getElementById("announcementFormModalTitle").textContent = "Add Announcement";
  new bootstrap.Modal(document.getElementById("announcementFormModal")).show();
}

function editAnnouncement(id) {

  const ann =
    announcements.find(
      a => a.id === id
    );

  if(!ann) return;

  document.getElementById(
    "ann-id"
  ).value = ann.id;

  document.getElementById(
    "ann-title"
  ).value = ann.title || "";

  document.getElementById(
    "ann-message"
  ).value = ann.message || "";

  document.getElementById(
    "ann-start"
  ).value = ann.start_date || "";

  document.getElementById(
    "ann-end"
  ).value = ann.end_date || "";

  document.getElementById(
    "ann-active"
  ).value =
    ann.active
      ? "true"
      : "false";

  document.getElementById(
    "announcementFormModalTitle"
  ).textContent = "Edit Announcement";

  document.getElementById("ann-marquee").value =
    ann.show_in_marquee ? "true" : "false";

  document.getElementById("ann-alert").value =
    ann.show_as_alert ? "true" : "false";

  new bootstrap.Modal(document.getElementById("announcementFormModal")).show();
}

async function loadAnnouncements() {

  const res =
    await fetch(
      "/api/admin-announcements"
    );

  const data =
    await res.json();

  announcements = data;

  renderAnnouncements();
}



function renderAnnouncements() {

  const body =
    document.getElementById(
      "announcement-body"
    );

  body.innerHTML = "";

  announcements.forEach(a => {

    body.innerHTML += `

<tr>

<td>${a.id}</td>

<td>${a.title}</td>

<td>${a.message}</td>

<td>${a.active ? '✅' : '❌'}</td>

<td>${a.show_in_marquee ? '📢 Yes' : 'No'}</td>

<td>${a.show_as_alert ? '🔔 Yes' : 'No'}</td>

<td>${a.start_date || ''}</td>

<td>${a.end_date || ''}</td>

<td>

<button
 class="btn btn-primary btn-sm me-1 my-1"
 onclick="editAnnouncement(${a.id})">

 Edit

</button>

<button
 class="btn btn-danger btn-sm my-1"
 onclick="deleteAnnouncement(${a.id})">

 Delete

</button>

</td>

</tr>

`;

  });

}

async function addAnnouncement() {

  const title =
    document.getElementById(
      "ann-title"
    ).value;

  const message =
    document.getElementById(
      "ann-message"
    ).value;

  const start_date =
    document.getElementById(
      "ann-start"
    ).value;

  const end_date =
    document.getElementById(
      "ann-end"
    ).value;

  const active =
    document.getElementById(
      "ann-active"
    ).value === "true";

  const id =
  document.getElementById(
    "ann-id"
  ).value;

  const res =
    await fetch(
      "/api/admin-announcements",
      {
        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:JSON.stringify({
          action: id
            ? "update"
            : "add",

            id:id,

          data:{
            title,
            message,
            start_date,
            end_date,
            active,
            show_in_marquee:
            document.getElementById("ann-marquee").value === "true",
            show_as_alert:
            document.getElementById("ann-alert").value === "true"
          }
        })
      }
    );

  if(!res.ok){

    showToast(
      "Failed",
      "error"
    );

    return;
  }

  showToast(
    id ? "Announcement updated ✅" : "Announcement added ✅"
  );

  bootstrap.Modal.getInstance(document.getElementById("announcementFormModal"))?.hide();

  loadAnnouncements();
}

async function deleteAnnouncement(id) {

  if(
    !confirm(
      "Delete announcement?"
    )
  ) return;

  const res =
    await fetch(
      "/api/admin-announcements",
      {
        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:JSON.stringify({
          action:"delete",
          id
        })
      }
    );

  if(!res.ok){

    showToast(
      "Delete failed",
      "error"
    );

    return;
  }

  showToast(
    "Deleted"
  );

  loadAnnouncements();
}
