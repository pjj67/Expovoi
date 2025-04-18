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

// Check Item Route (Eligibility Check)
app.post('/check-item', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();

  const category = db.categories.find(cat => cat.id === categoryId);
  const item = category?.items.find(it => it.id === itemId);

  if (!category || !item) {
    return res.redirect('/');
  }

  // Filter members who have the item assigned and at least 4 out of 8 events attended
  const eligibleMembers = db.members.filter(member => {
    const itemAssigned = member.items.some(it => it.categoryId === categoryId && it.itemId === itemId);

    if (!itemAssigned) {
      return false;
    }

    const eventsAttended = member.attendance.filter(att => att).length; // Number of events attended
    const totalEvents = member.attendance.length; // Total number of events (8)

    // Member is eligible if they attended at least 50% of the events (4 out of 8)
    return eventsAttended >= 4; 
  });

  res.render('index', { categories: db.categories, members: db.members, results: eligibleMembers });
});

// Add Member
app.post('/members', (req, res) => {
  const { name } = req.body;
  const db = loadDatabase();

  const newMember = {
    id: uuid.v4(),
    name,
    attendance: Array(8).fill(false),  // 8 events by default, all set to false
    items: []
  };

  db.members.push(newMember);
  saveDatabase(db);

  res.redirect('/');
});

// Update Attendance for a Member
app.post('/members/:id/attendance', (req, res) => {
  const memberId = req.params.id;
  const { attendance } = req.body;
  const db = loadDatabase();

  const member = db.members.find(m => m.id === memberId);
  member.attendance = attendance.map(att => att === 'on');  // Convert 'on' to true/false

  saveDatabase(db);
  res.redirect('/');
});

// Remove Member
app.post('/members/:id/delete', (req, res) => {
  const memberId = req.params.id;
  const db = loadDatabase();

  db.members = db.members.filter(m => m.id !== memberId);
  saveDatabase(db);

  res.redirect('/');
});

// Add Category
app.post('/categories', (req, res) => {
  const { name } = req.body;
  const db = loadDatabase();

  const newCategory = {
    id: uuid.v4(),
    name,
    items: []
  };

  db.categories.push(newCategory);
  saveDatabase(db);

  res.redirect('/');
});

// Edit Category Name
app.post('/categories/:id/edit', (req, res) => {
  const { name } = req.body;
  const categoryId = req.params.id;
  const db = loadDatabase();

  const category = db.categories.find(c => c.id === categoryId);
  category.name = name;

  saveDatabase(db);
  res.redirect('/');
});

// Add Item to Category
app.post('/categories/:id/items', (req, res) => {
  const { name } = req.body;
  const categoryId = req.params.id;
  const db = loadDatabase();

  const category = db.categories.find(c => c.id === categoryId);

  const newItem = {
    id: uuid.v4(),
    name
  };

  category.items.push(newItem);
  saveDatabase(db);

  res.redirect('/');
});

// Edit Item Name
app.post('/categories/:categoryId/items/:itemId/edit', (req, res) => {
  const { name } = req.body;
  const { categoryId, itemId } = req.params;
  const db = loadDatabase();

  const category = db.categories.find(c => c.id === categoryId);
  const item = category.items.find(i => i.id === itemId);
  item.name = name;

  saveDatabase(db);
  res.redirect('/');
});

// Delete Item
app.post('/categories/:categoryId/items/:itemId/delete', (req, res) => {
  const { categoryId, itemId } = req.params;
  const db = loadDatabase();

  const category = db.categories.find(c => c.id === categoryId);
  category.items = category.items.filter(i => i.id !== itemId);

  saveDatabase(db);
  res.redirect('/');
});

// Assign Multiple Items to Members
app.post('/members/:id/add-items', (req, res) => {
  const memberId = req.params.id;
  const { itemIds, categoryIds } = req.body;
  const db = loadDatabase();

  const member = db.members.find(m => m.id === memberId);

  // Add each selected item to the member's items list
  itemIds.forEach((itemId, index) => {
    const categoryId = categoryIds[index];
    member.items.push({ categoryId, itemId });
  });

  saveDatabase(db);
  res.redirect('/');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
