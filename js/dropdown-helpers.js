// ============================================================
// dropdown-helpers.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// DROPDOWN HELPERS
// =================================================

function populatePlanDropdowns() {
  // For student membership form
  const select = document.getElementById("sm-plan");
  if (!select) return;
  select.innerHTML = '<option value="">Select Plan *</option>';
  if (allPlans) {
    allPlans.filter(p => p.status === 'active').forEach(p => {
      select.innerHTML += `<option value="${p.id}" data-amount="${p.amount}">${p.name} - ₹${p.amount} (${p.duration_days} days)</option>`;
    });
  }
  
  // Auto-calculate final amount when plan changes
  document.getElementById("sm-plan")?.addEventListener('change', function() {
    const amount = this.options[this.selectedIndex]?.dataset?.amount || 0;
    const discount = parseFloat(document.getElementById("sm-discount").value) || 0;
    document.getElementById("sm-final-amount").value = amount - discount;
  });
  
  document.getElementById("sm-discount")?.addEventListener('input', function() {
    const planSelect = document.getElementById("sm-plan");
    const amount = parseFloat(planSelect.options[planSelect.selectedIndex]?.dataset?.amount) || 0;
    const discount = parseFloat(this.value) || 0;
    document.getElementById("sm-final-amount").value = amount - discount;
  });
}

async function populateBatchOptionsForStudent(studentId) {
  const batchSelect = document.getElementById("sm-batch");
  if (!batchSelect) return;
  const current = batchSelect.value;
  batchSelect.innerHTML = '<option value="">Which Batch is this for? (recommended)</option>';

  let batchesToShow = [];
  if (studentId) {
    const res = await fetch(`/api/student-batches?student_id=${studentId}&status=active`);
    const enrollments = await res.json();
    batchesToShow = (enrollments || [])
      .filter(sb => sb.batches)
      .map(sb => ({ id: sb.batch_id, batch_name: sb.batches.batch_name }));
  }
  if (batchesToShow.length === 0) {
    batchesToShow = (window.allBatches || []).filter(b => b.status === 'active');
  }
  batchesToShow.forEach(b => {
    batchSelect.innerHTML += `<option value="${b.id}">${b.batch_name}</option>`;
  });
  batchSelect.value = current || "";
}

function attachMembershipBatchListener() {
  const studentSelect = document.getElementById("sm-student");
  if (studentSelect && !studentSelect.dataset.batchListenerAdded) {
    studentSelect.addEventListener('change', () => populateBatchOptionsForStudent(studentSelect.value));
    studentSelect.dataset.batchListenerAdded = "true";
  }
}

function populateStudentMembershipDropdowns() {
  populateStudentList("sm-student");
  populatePlanDropdowns();
  populateBatchOptionsForStudent(document.getElementById("sm-student").value);
  attachMembershipBatchListener();
}

function attachPaymentListeners() {
  const studentSelect = document.getElementById("pay-student");
  const membershipSelect = document.getElementById("pay-membership");
  const amountInput = document.getElementById("pay-amount");
  if (!studentSelect || !membershipSelect) return;

  if (!studentSelect.dataset.membershipListenerAdded) {
    studentSelect.addEventListener('change', function() {
      const studentId = this.value;
      membershipSelect.innerHTML = '<option value="">Select Membership</option>';
      if (studentId && allStudentMemberships) {
        const memberships = allStudentMemberships.filter(m => m.student_id == studentId && m.status !== 'cancelled');
        memberships.forEach(m => {
          const plan = allPlans.find(p => p.id == m.plan_id);
          const batch = (window.allBatches || []).find(b => b.id === m.batch_id);
          const label = m.status === 'expired' ? ' (Expired - renews on payment)' : '';
          membershipSelect.innerHTML += `<option value="${m.id}" data-amount="${m.final_amount || 0}" data-batch-name="${batch ? batch.batch_name : ''}">${plan?.name || 'Plan'} - ₹${m.final_amount}${label}</option>`;
        });
      }
    });
    studentSelect.dataset.membershipListenerAdded = "true";
  }

  if (!membershipSelect.dataset.amountListenerAdded) {
    membershipSelect.addEventListener('change', function() {
      const selected = this.options[this.selectedIndex];
      const amount = selected ? selected.dataset.amount : null;
      if (amount) amountInput.value = amount;

      const batchName = selected ? selected.dataset.batchName : "";
      const remarksInput = document.getElementById("pay-remarks");
      if (remarksInput && batchName) {
        remarksInput.value = `Fees For ${batchName}`;
      }
    });
    membershipSelect.dataset.amountListenerAdded = "true";
  }
}

function populatePaymentDropdowns() {
  populateStudentList("pay-student");
  attachPaymentListeners();
}

function populateStudentList(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">Select Student *</option>';
  if (window.allStudents) {
    window.allStudents.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.first_name} ${s.last_name || ''} (${s.mobile || ''})</option>`;
    });
  }
}
