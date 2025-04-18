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
  res.render('index', { categories: db.categories, members: db.members, results: null });
});

// Add Member Route
app.post('/members', (req, res) => {
  const db = loadDatabase();
  const newMember = {
    id: uuid.v4(),
    name: req.body.name,
    attendance: new Array(8).fill(false),
    items: []
  };
  db.members.push(newMember);
  saveDatabase(db);
  res.redirect('/');
});

// Update Member Attendance Route
app.post('/members/:id/attendance', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (member) {
    member.attendance = req.body.attendance.map(a => a === 'on');
    saveDatabase(db);
  }
  res.redirect('/');
});

// Delete Member Route
app.post('/members/:id/delete', (req, res) => {
  const db = loadDatabase();
  db.members = db.members.filter(m => m.id !== req.params.id);
  saveDatabase(db);
  res.redirect('/');
});

// Add Category Route
app.post('/categories', (req, res) => {
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

// Edit Category Route
app.post('/categories/:id/edit', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(cat => cat.id === req.params.id);
  if (category) {
    category.name = req.body.name;
    saveDatabase(db);
  }
  res.redirect('/');
});

// Add Item to Category Route
app.post('/categories/:id/items', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(cat => cat.id === req.params.id);
  if (category) {
    const newItem = {
      id: uuid.v4(),
      name: req.body.name
    };
    category.items.push(newItem);
    saveDatabase(db);
  }
  res.redirect('/');
});

// Edit Item in Category Route
app.post('/categories/:categoryId/items/:itemId/edit', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(cat => cat.id === req.params.categoryId);
  if (category) {
    const item = category.items.find(it => it.id === req.params.itemId);
    if (item) {
      item.name = req.body.name;
      saveDatabase(db);
    }
  }
  res.redirect('/');
});

// Delete Item Route
app.post('/categories/:categoryId/items/:itemId/delete', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(cat => cat.id === req.params.categoryId);
  if (category) {
    category.items = category.items.filter(it => it.id !== req.params.itemId);
    saveDatabase(db);
  }
  res.redirect('/');
});

// Assign Multiple Items to Members Route
app.post('/members/:id/add-items', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (member) {
    const { itemIds, categoryIds } = req.body;
    const itemsToAssign = itemIds.map((itemId, index) => ({
      categoryId: categoryIds[index],
      itemId: itemId
    }));
    member.items = member.items.concat(itemsToAssign);
    saveDatabase(db);
  }
  res.redirect('/');
});

// Check Item Eligibility Route
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
    // Check if the member has the item assigned
    const itemAssigned = member.items.some(it => it.categoryId === categoryId && it.itemId === itemId);

    // Calculate attendance rate
    const attendanceRate = member.attendance.filter(att => att).length / member.attendance.length;
    
    // Return member if they are assigned the item and have >= 50% attendance
    return itemAssigned && attendanceRate >= 0.5;
  });

  res.render('index', { categories: db.categories, members: db.members, results: eligibleMembers });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
