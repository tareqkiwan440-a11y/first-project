// Expense Tracker - backend (Express API + PostgreSQL)
// Expense Tracker - backend (Express API + PostgreSQL)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// تفعيل CORS عشان الفرونت إند يقدر يكلم السيرفر
app.use(cors());
// عشان السيرفر يفهم JSON اللي يجي في body
app.use(express.json());

// Pool واحد بقيم من ملف .env
// (غيّر أسماء المتغيرات لو ملف .env.example عندك يستخدم أسماء ثانية)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'expense_tracker',
});

// نفس الأعمدة في كل SELECT:
// amount يرجع رقم (float8) و date يرجع نص بصيغة YYYY-MM-DD
const COLUMNS = `id, title, amount::float8 AS amount, category, to_char(date, 'YYYY-MM-DD') AS date`;

// ---------- دوال مساعدة ----------

// التحقق من الـ id قبل أي استعلام
function isValidId(id) {
  return /^\d+$/.test(id); // أرقام فقط
}

// التحقق من بيانات المصروف، ترجع نص الخطأ أو null لو كل شيء سليم
function validateExpense(body) {
  const { title, amount, category, date } = body;

  if (typeof title !== 'string' || title.trim() === '') {
    return 'title is required and must be a non-empty text';
  }
  if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
    return 'amount is required and must be a number greater than 0';
  }
  if (typeof category !== 'string' || category.trim() === '') {
    return 'category is required and must be a non-empty text';
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
    return 'date is required and must be in the format YYYY-MM-DD';
  }
  return null;
}

// ---------- الـ Endpoints ----------

// GET /api/expenses : كل المصروفات
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM expenses ORDER BY date DESC, id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/:id : مصروف واحد
app.get('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM expenses WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expenses : إضافة مصروف
app.post('/api/expenses', async (req, res) => {
  const error = validateExpense(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const { title, amount, category, date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO expenses (title, amount, category, date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [title.trim(), amount, category.trim(), date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/expenses/:id : تعديل مصروف
app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }
  const error = validateExpense(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const { title, amount, category, date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE expenses
       SET title = $1, amount = $2, category = $3, date = $4
       WHERE id = $5
       RETURNING ${COLUMNS}`,
      [title.trim(), amount, category.trim(), date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/:id : حذف مصروف
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }
  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- تشغيل السيرفر ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.
