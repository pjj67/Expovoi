const express = require('express');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Load the database (db.json)
function loadDatabase() {
  const rawData = fs.readFileSync(path.join(__dirname, 'db.json'));
  return JSON.parse(rawData);
}

// Save to database (db.json)
function saveDatabase(data) {
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
}

// Homepage Route
app.get('/', (req, res) => {
  const db = loadDatabase();
  res.render('index', { categories: db.categories, results: null, members: db.members });
});

// Add Member Route
app.post('/add-member', (req, res) => {
  const db = loadDatabase();
  const newMember = {
    id: uuid.v4(),
    name: req.body.name,
    attendance: [],
    items: []
  };
  db.members.push(newMember);
  saveDatabase(db);
  res.redirect('/');
});

// Add Category Route
app.post('/add-category', (req, res) => {
  const db = loadDatabase();
  const newCategory = {
    id: uuid.v4(),
    name: req.body.name,
    items: []
  };
  db.categories.push(newCategory);
  saveDatabase(db);
  res.redirect('/');
});

// Add Item Route
app.post('/add-item', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(cat => cat.id === req.body.categoryId);
  const newItem = {
    id: uuid.v4(),
    name: req.body.name
  };
  category.items.push(newItem);
  saveDatabase(db);
  res.redirect('/');
});

// Update Attendance Route
app.post('/update-attendance', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(mem => mem.id === req.body.memberId);
  const attendance = req.body.attendance === 'true';
  member.attendance.push(attendance);
  saveDatabase(db);
  res.redirect('/');
});

// Check Item Route
app.post('/check-item', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();
  const category = db.categories.find(cat => cat.id === categoryId);
  const item = category?.items.find(it => it.id === itemId);
  
  if (!category || !item) {
    return res.redirect('/');
  }

  // Check members with attendance of 50% or more for the item
  const eligibleMembers = db.members.filter(member => {
    const itemAssigned = member.items.some(it => it.categoryId === categoryId && it.itemId === itemId);
    const attendanceRate = member.attendance.filter(att => att).length / member.attendance.length;
    return itemAssigned && attendanceRate >= 0.5;
  });

  res.render('index', { categories: db.categories, results: eligibleMembers, members: db.members });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
