// Expense Tracker - frontend logic

// PHASE 2
// Your backend from Phase 1 is already running, with real expenses in the
// database (from schema.sql). Build this page directly against it with
// fetch and async/await - there is no in-memory or localStorage stage
// this time, and no sample data file.

//   - async function getExpenses()          fetch(API_URL), return the JSON
// const API_URL = "http://" + window.location.hostname + ":3000/api/expenses"; //for phone
const API_URL = "http://localhost:3000/api/expenses";
//   - async function addExpense(data)       fetch(API_URL, { method: "POST", ... })
//   - async function updateExpense(id,data) fetch(API_URL + "/" + id, { method: "PUT", ... })
//   - async function deleteExpense(id)      fetch(API_URL + "/" + id, { method: "DELETE" })
//   - async function refresh()              get the list, then call renderTable and renderSummary
//   - renderTable(list)                     build the table rows from the array the API returned
//   - renderSummary(list)                   update the summary cards
//   - applyFilter()                         re-render with the list filtered by category
const spinner = document.getElementById("spinner");
const alertBox = document.getElementById("alertBox");
const tableBody = document.getElementById("expensesBody");
const form = document.getElementById("expenseForm");
const expenseIdInput = document.getElementById("expenseId");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const filterSelect = document.getElementById("filterCategory");
const totalEl = document.getElementById("totalAmount");
const countEl = document.getElementById("expenseCount");
const highestEl = document.getElementById("highestAmount");

let allExpenses = [];
 
// ---------- دوال مساعدة ----------
 
// إظهار / إخفاء الـ spinner (Bootstrap)
function showSpinner(show) {
  spinner.classList.toggle("d-none", !show);
}
 
// منع حقن HTML من النصوص
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
 
// إظهار رسالة خطأ (Bootstrap alert)
function showError(message) {
  alertBox.innerHTML = `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}
 
function clearError() {
  alertBox.innerHTML = "";
}
 
// دالة وحدة تنفذ أي طلب: spinner + try/catch + alert عند الفشل
// ترجع البيانات لو نجح، أو null لو فشل
async function callApi(url, options) {
  showSpinner(true);
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  } catch (err) {
    showError(err.message === "Failed to fetch" ? "Cannot reach the server. Is the backend running?" : err.message);
    return null;
  } finally {
    showSpinner(false);
  }
}
 
// ---------- دوال الـ API ----------
 
// GET: كل المصروفات
async function getExpenses() {
  return await callApi(API_URL);
}
 
// POST: إضافة مصروف
async function addExpense(data) {
  return await callApi(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
 
// PUT: تعديل مصروف
async function updateExpense(id, data) {
  return await callApi(API_URL + "/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
 
// DELETE: حذف مصروف
async function deleteExpense(id) {
  return await callApi(API_URL + "/" + id, { method: "DELETE" });
}
 
// ---------- عرض البيانات ----------
 
// يبني صفوف الجدول من المصفوفة
function renderTable(list) {
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No expenses found</td></tr>`;
    return;
  }
 
  tableBody.innerHTML = list
    .map(
      (e) => `
      <tr>
        <td>${escapeHtml(e.title)}</td>
        <td>${e.amount.toFixed(2)}</td>
        <td>${escapeHtml(e.category)}</td>
        <td>${e.date}</td>
        <td>
          <button class="btn btn-sm btn-warning" data-action="edit" data-id="${e.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${e.id}">Delete</button>
        </td>
      </tr>`
    )
    .join("");
}
 
// يحدّث بطاقات الملخص
function renderSummary(list) {
  const total = list.reduce((sum, e) => sum + e.amount, 0);
  const highest = list.length > 0 ? Math.max(...list.map((e) => e.amount)) : 0;
 
  totalEl.textContent = total.toFixed(2);
  countEl.textContent = list.length;
  highestEl.textContent = highest.toFixed(2);
}
 
// يعبّي قائمة الفلتر بالتصنيفات الموجودة
function fillCategoryFilter(list) {
  const selected = filterSelect.value; // نحفظ الاختيار الحالي
  const categories = [...new Set(list.map((e) => e.category))];
 
  filterSelect.innerHTML =
    `<option value="">All categories</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
 
  // نرجّع الاختيار لو التصنيف ما زال موجود
  if (categories.includes(selected)) {
    filterSelect.value = selected;
  }
}
 
// يعيد العرض بالقائمة المفلترة حسب التصنيف
function applyFilter() {
  const category = filterSelect.value;
  const list = category ? allExpenses.filter((e) => e.category === category) : allExpenses;
  renderTable(list);
  renderSummary(list);
}
 
// يجيب القائمة من السيرفر ثم يعرضها
async function refresh() {
  const list = await getExpenses();
  if (list === null) return; // صار خطأ والـ alert ظاهر
  clearError();
  allExpenses = list;
  fillCategoryFilter(list);
  applyFilter(); // يستدعي renderTable و renderSummary
}
 
// ---------- الأحداث ----------
 
// إرسال الفورم: إضافة أو تعديل
form.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  const data = {
    title: titleInput.value,
    amount: Number(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
  };
 
  const id = expenseIdInput.value;
  const result = id ? await updateExpense(id, data) : await addExpense(data);
 
  if (result) {
    form.reset();
    expenseIdInput.value = "";
    await refresh(); // دايماً نعرض اللي حفظه السيرفر فعلاً
  }
});
 
// أزرار Edit و Delete داخل الجدول
tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
 
  const id = button.dataset.id;
 
  if (button.dataset.action === "edit") {
    const expense = allExpenses.find((e) => String(e.id) === id);
    expenseIdInput.value = expense.id;
    titleInput.value = expense.title;
    amountInput.value = expense.amount;
    categoryInput.value = expense.category;
    dateInput.value = expense.date;
    form.scrollIntoView();
  }
 
  if (button.dataset.action === "delete") {
    if (!confirm("Delete this expense?")) return;
    const result = await deleteExpense(id);
    if (result) {
      await refresh();
    }
  }
});
 
// تغيير الفلتر
filterSelect.addEventListener("change", applyFilter);



//dark mode 
// ---------- Dark mode ----------
const themeToggle = document.getElementById("themeToggle");

function setTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  localStorage.setItem("theme", theme); // نتذكر اختيار المستخدم
  themeToggle.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-bs-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

setTheme(localStorage.getItem("theme") || "light");
 
// أول تحميل للصفحة
refresh();


