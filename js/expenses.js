// ============================================================
// expenses.js — extracted from original superadmin.html (module split)
// ============================================================
// =================================================
// EXPENSES JS
// =================================================

let allExpenses = [];
let financeChart = null;
let expenseCategoryChart = null;

async function loadExpenses() {
  const startDate = document.getElementById("expense-filter-start")?.value || '';
  const endDate = document.getElementById("expense-filter-end")?.value || '';
  const category = document.getElementById("expense-filter-category")?.value || '';

  let url = '/api/expenses?';
  if (startDate) url += `start_date=${startDate}&`;
  if (endDate) url += `end_date=${endDate}&`;
  if (category) url += `category=${category}&`;

  const res = await fetch(url);
  allExpenses = await res.json();
  renderExpenseRows(allExpenses);
}

function renderExpenseRows(expenses) {
  window._expensesFiltered = expenses || [];
  const tbody = document.getElementById("expenseTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No expenses found</td></tr>`;
    document.getElementById("expensesPagination").innerHTML = "";
    return;
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const { items, page, totalPages } = paginateArray(expenses, 'expenses');

  items.forEach(e => {
    const categoryEmojis = {
      'Shuttle Purchase': '🏸',
      'Court Maintenance': '🔧',
      'Electricity': '⚡',
      'Water': '💧',
      'Staff Salary': '👨‍🏫',
      'Coach Salary': '🧑‍🏫',
      'Equipment': '🎯',
      'Cleaning': '🧹',
      'Repairs': '🔨',
      'Marketing': '📢',
      'Other': '📌'
    };
    const emoji = categoryEmojis[e.category] || '📌';

    tbody.innerHTML += `
      <tr>
        <td>${e.id}</td>
        <td>${e.expense_date || ""}</td>
        <td>${emoji} ${e.category}</td>
        <td><strong>₹${e.amount}</strong></td>
        <td>${e.paid_to || ""}</td>
        <td>${e.payment_mode || ""}</td>
        <td>
          <button class="btn btn-primary btn-sm me-1" onclick="editExpense(${e.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">Delete</button>
        </td>
      </tr>
    `;
  });

  // Total row always reflects the full filtered set, not just the visible page
  tbody.innerHTML += `
    <tr class="table-warning">
      <td colspan="3"><strong>TOTAL (all ${expenses.length} filtered)</strong></td>
      <td><strong>₹${total}</strong></td>
      <td colspan="3"></td>
    </tr>
  `;

  renderPaginationControls("expensesPagination", "expenses", totalPages, page, "() => renderExpenseRows(window._expensesFiltered)");
}

function showExpenseForm() {
  document.getElementById("expense-id").value = "";
  document.getElementById("expense-date").value = new Date().toISOString().split('T')[0];
  document.getElementById("expense-category").value = "";
  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-paid-to").value = "";
  document.getElementById("expense-payment-mode").value = "cash";
  document.getElementById("expense-reference").value = "";
  document.getElementById("expense-remarks").value = "";
  document.getElementById("expenseFormModalTitle").textContent = "Add Expense";
  new bootstrap.Modal(document.getElementById("expenseFormModal")).show();
}

function editExpense(id) {
  const e = allExpenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById("expense-id").value = e.id;
  document.getElementById("expense-date").value = e.expense_date || "";
  document.getElementById("expense-category").value = e.category || "";
  document.getElementById("expense-amount").value = e.amount || "";
  document.getElementById("expense-paid-to").value = e.paid_to || "";
  document.getElementById("expense-payment-mode").value = e.payment_mode || "cash";
  document.getElementById("expense-reference").value = e.reference_number || "";
  document.getElementById("expense-remarks").value = e.remarks || "";
  document.getElementById("expenseFormModalTitle").textContent = "Edit Expense";
  new bootstrap.Modal(document.getElementById("expenseFormModal")).show();
}

async function saveExpense() {
  const id = document.getElementById("expense-id").value;
  const category = document.getElementById("expense-category").value;
  const amount = document.getElementById("expense-amount").value;

  if (!category) { showToast("Please select a category", "warning"); return; }
  if (!amount) { showToast("Amount is required", "warning"); return; }

  const data = {
    expense_date: document.getElementById("expense-date").value,
    category: category,
    amount: parseFloat(amount),
    paid_to: document.getElementById("expense-paid-to").value.trim(),
    payment_mode: document.getElementById("expense-payment-mode").value,
    reference_number: document.getElementById("expense-reference").value.trim(),
    remarks: document.getElementById("expense-remarks").value.trim()
  };

  const isEdit = !!id;
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isEdit
      ? { action: "update", id: Number(id), data }
      : { action: "add", data })
  });

  if (!res.ok) { showToast("Save failed", "error"); return; }

  showToast(isEdit ? "Expense updated ✅" : "Expense added ✅");
  bootstrap.Modal.getInstance(document.getElementById("expenseFormModal"))?.hide();
  loadExpenses();
  loadFinancialDashboard();
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id })
  });
  if (!res.ok) { showToast("Delete failed", "error"); return; }
  showToast("Expense deleted");
  loadExpenses();
  loadFinancialDashboard();
}
