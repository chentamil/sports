// ============================================================
// attendance.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// ATTENDANCE MANAGEMENT JS (FIXED)
// =================================================

let attendanceData = [];
let attendanceStudents = [];

function openMarkHoliday() {
  document.getElementById("holiday-date").value = document.getElementById("attendance-date").value || new Date().toISOString().split("T")[0];
  new bootstrap.Modal(document.getElementById("markHolidayModal")).show();
}

async function confirmMarkHoliday() {
  const date = document.getElementById("holiday-date").value;
  if (!date) { showToast("Pick a date first", "warning"); return; }
  if (!confirm(`Mark ${date} as a holiday for ALL active students in ALL active batches? This overwrites any existing attendance for that date.`)) return;

  const res = await fetch("/api/mark-holiday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date })
  });
  const result = await res.json();

  if (!res.ok) { showToast("Failed to mark holiday: " + (result.error || ""), "error"); return; }

  showToast(`Marked ${result.marked || 0} student(s) as Holiday for ${date} ✅`);
  bootstrap.Modal.getInstance(document.getElementById("markHolidayModal")).hide();

  if (document.getElementById("attendance-date").value === date) {
    loadAttendance();
  }
}

async function loadAttendance() {
  const date = document.getElementById("attendance-date").value;
  const batchId = document.getElementById("attendance-batch").value;

  if (!date) {
    showToast("Please select a date", "warning");
    return;
  }

  try {
    let students = [];
    let batchName = "N/A";

    // If a specific batch is selected
    if (batchId) {
      // Step 1: Get student-batch links for this batch
      const sbRes = await fetch(`/api/student-batches?batch_id=${batchId}&status=eq.active`);
      const sbData = await sbRes.json();
      
      // Step 2: Get student details for these IDs
      const studentIds = sbData.map(sb => sb.student_id);
      
      if (studentIds.length > 0) {
        const studentsRes = await fetch(`/api/students`);
        const allStudents = await studentsRes.json();
        students = allStudents.filter(s => studentIds.includes(s.id) && s.status === 'active');
      }
      
      // Get batch name from window.allBatches
      if (window.allBatches) {
        const batch = window.allBatches.find(b => b.id == batchId);
        batchName = batch ? batch.batch_name : "N/A";
      }
      
    } else {
      // "All Batches" - show all active students
      const studentsRes = await fetch(`/api/students`);
      const allStudents = await studentsRes.json();
      students = allStudents.filter(s => s.status === 'active');
    }

    attendanceStudents = students;

    // Fetch existing attendance for this date
    let url = `/api/attendance?date=${date}`;
    if (batchId) {
      url += `&batch_id=${batchId}`;
    }
    const attRes = await fetch(url);
    attendanceData = await attRes.json();

    // Render the table with batch name
    renderAttendanceTable(students, attendanceData, batchId, batchName);

  } catch (err) {
    showToast("Failed to load attendance", "error");
    console.error(err);
  }
}

function renderAttendanceTable(students, attendanceRecords, batchId, batchName) {
  const tbody = document.getElementById("attendanceTableBody");
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">
      ${batchId ? 'No students assigned to this batch yet.' : 'No active students found.'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  students.forEach(student => {
    // Find if this student has attendance for today
    const record = attendanceRecords.find(a => a.student_id === student.id);
    const status = record ? record.status : 'present'; // Default to present

    tbody.innerHTML += `
      <tr>
        <td><strong>${student.first_name} ${student.last_name || ""}</strong></td>
        <td>${batchName}</td>
        <td>
          <select class="form-select attendance-status" 
                  data-student-id="${student.id}" 
                  data-record-id="${record?.id || ''}"
                  data-batch-id="${batchId || ''}">
            <option value="present" ${status === 'present' ? 'selected' : ''}>✅ Present</option>
            <option value="absent" ${status === 'absent' ? 'selected' : ''}>❌ Absent</option>
            <option value="leave" ${status === 'leave' ? 'selected' : ''}>🏖️ Leave</option>
            <option value="holiday" ${status === 'holiday' ? 'selected' : ''}>🎉 Holiday</option>
          </select>
        </td>
      </tr>
    `;
  });
}

async function saveAttendance() {
  const date = document.getElementById("attendance-date").value;
  const batchId = document.getElementById("attendance-batch").value;

  if (!date) {
    showToast("Please select a date", "warning");
    return;
  }

  if (!batchId) {
    showToast("Please select a specific batch (not 'All Batches') to save", "warning");
    return;
  }

  const selects = document.querySelectorAll(".attendance-status");
  const attendancePayload = [];

  selects.forEach(select => {
    const studentId = parseInt(select.dataset.studentId);
    const status = select.value;
    
    attendancePayload.push({
      student_id: studentId,
      batch_id: parseInt(batchId),
      attendance_date: date,
      status: status,
      remarks: "",
      marked_by: "admin"
    });
  });

  if (attendancePayload.length === 0) {
    showToast("No attendance data to save", "warning");
    return;
  }

  try {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulkUpsert",
        data: attendancePayload
      })
    });

    if (!res.ok) {
      const error = await res.text();
      showToast(`Failed to save attendance: ${error}`, "error");
      return;
    }

    showToast(`Attendance saved for ${attendancePayload.length} students ✅`);
    loadAttendance(); // Reload to reflect saved data

  } catch (err) {
    showToast("Error saving attendance", "error");
    console.error(err);
  }
}
