const express = require('express');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));  // Serving static files like CSS, images, etc.

// Load the database (db.json)
function loadDatabase() {
  const rawData = fs.readFileSync(path.join(__dirname, 'db.json'));
  return JSON.parse(rawData);
}

// Save to database (db.json)
function saveDatabase(data) {
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
}

// Home Page - Display Categories, Members, and Assign Items
app.get('/', (req, res) => {
  const db = loadDatabase();
  const selectedCategoryId = req.query.categoryId || null;

  // Sort members alphabetically by name
  const sortedMembers = db.members.sort((a, b) => a.name.localeCompare(b.name));

  res.render('index', {
    categories: db.categories,
    members: sortedMembers,
    selectedCategoryId,
    selectedItemId: null,
    eligibleMembers: undefined
  });
});


// Add Category
app.post('/categories', (req, res) => {
  const { name } = req.body;
  const db = loadDatabase();
  const newCategory = { id: uuid.v4(), name, items: [] };

  db.categories.push(newCategory);
  saveDatabase(db);
  res.redirect('/');
});

// Add Item to Category
app.post('/categories/:id/items', (req, res) => {
  const { name } = req.body;
  const categoryId = req.params.id;
  const db = loadDatabase();

  const category = db.categories.find(c => c.id === categoryId);
  if (!category) return res.status(404).send('Category not found');

  category.items.push({ id: uuid.v4(), name });
  saveDatabase(db);
  res.redirect('/');
});

// Add Member
app.post('/members', (req, res) => {
  const { name } = req.body;
  const db = loadDatabase();

  const newMember = {
    id: uuid.v4(),
    name,
    attendance: Array(8).fill(false),
    items: []
  };

  db.members.push(newMember);
  saveDatabase(db);
  res.redirect('/');
});

// Delete a member
app.post('/members/:id/delete', (req, res) => {
  const memberId = req.params.id;
  const db = loadDatabase();

  db.members = db.members.filter(member => member.id !== memberId);

  saveDatabase(db);
  res.redirect('/');
});


// Assign Items to Member
app.post('/members/:id/add-items', (req, res) => {
  const memberId = req.params.id;
  const db = loadDatabase();
  const member = db.members.find(m => m.id === memberId);
  if (!member) return res.status(404).send('Member not found');

  let itemIds = req.body.itemIds;
  if (!Array.isArray(itemIds)) {
    itemIds = [itemIds]; // handle single selection
  }

  itemIds.forEach(itemId => {
    const category = db.categories.find(c => c.items.some(i => i.id === itemId));
    const itemExists = member.items.some(i => i.itemId === itemId);
    if (category && !itemExists) {
      member.items.push({ categoryId: category.id, itemId });
    }
  });

  saveDatabase(db);
  res.redirect('/');
});

// Remove Item from Member
app.post('/members/:id/remove-item', (req, res) => {
  const memberId = req.params.id;
  const { itemId } = req.body;
  const db = loadDatabase();

  const member = db.members.find(m => m.id === memberId);
  if (!member) return res.status(404).send('Member not found');

  member.items = member.items.filter(item => item.itemId !== itemId);
  saveDatabase(db);
  res.redirect('/');
});

// Update Attendance for Member
app.post('/members/:id/attendance', (req, res) => {
  const memberId = req.params.id;
  const { attendance } = req.body;
  const db = loadDatabase();

  const member = db.members.find(m => m.id === memberId);
  if (!member) return res.status(404).send('Member not found');

  if (!attendance) {
    member.attendance = Array(8).fill(false);
  } else if (Array.isArray(attendance)) {
    member.attendance = Array(8).fill(false);
    attendance.forEach((val, idx) => {
      member.attendance[idx] = true;
    });
  } else {
    // Single checkbox (e.g. only 1 event was checked)
    member.attendance = Array(8).fill(false);
    member.attendance[parseInt(attendance)] = true;
  }

  saveDatabase(db);
  res.redirect('/');
});

// Eligibility Check Handler
app.post('/check-eligibility', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();

  const eligibleMembers = db.members
    .filter(member => {
      const hasItem = member.items.some(i => i.itemId === itemId);
      const attendedCount = member.attendance.filter(Boolean).length;
      return hasItem && attendedCount >= 4;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // 🔡 Sort alphabetically by name

  res.render('index', {
    categories: db.categories,
    members: db.members,
    selectedCategoryId: categoryId,
    selectedItemId: itemId,
    eligibleMembers
  });
});



// Start Server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});