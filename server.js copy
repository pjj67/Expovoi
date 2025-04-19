const express = require('express');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Load and Save Database
function loadDatabase() {
  const rawData = fs.readFileSync(path.join(__dirname, 'db.json'));
  return JSON.parse(rawData);
}

function saveDatabase(data) {
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
}

// Home
app.get('/', (req, res) => {
  const db = loadDatabase();
  const selectedCategoryId = req.query.categoryId || null;
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
  const db = loadDatabase();
  db.categories.push({ id: uuid.v4(), name: req.body.name, items: [] });
  saveDatabase(db);
  res.redirect('/');
});

// Add Item to Category
app.post('/categories/:id/items', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(c => c.id === req.params.id);
  if (!category) return res.status(404).send('Category not found');
  category.items.push({ id: uuid.v4(), name: req.body.name });
  saveDatabase(db);
  res.redirect('/');
});

// Delete Item from Category
app.post('/categories/:categoryId/items/:itemId/delete', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(c => c.id === req.params.categoryId);
  if (!category) return res.status(404).send('Category not found');

  // Remove the item from the category's items array
  category.items = category.items.filter(i => i.id !== req.params.itemId);

  saveDatabase(db);
  res.redirect('/');
});


// Update Item Name
app.post('/categories/:categoryId/items/:itemId/edit', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(c => c.id === req.params.categoryId);
  if (!category) return res.status(404).send('Category not found');

  const item = category.items.find(i => i.id === req.params.itemId);
  if (!item) return res.status(404).send('Item not found');

  // Update the item's name
  item.name = req.body.name;

  saveDatabase(db);
  res.redirect('/');
});


// Add Member
app.post('/members', (req, res) => {
  const db = loadDatabase();
  db.members.push({
    id: uuid.v4(),
    name: req.body.name,
    attendance: Array(8).fill(false),
    items: []
  });
  saveDatabase(db);
  res.redirect('/');
});

// Delete Member
app.post('/members/:id/delete', (req, res) => {
  const db = loadDatabase();
  db.members = db.members.filter(m => m.id !== req.params.id);
  saveDatabase(db);
  res.redirect('/');
});

// Assign Items to Member with REPLACEMENT per Category
app.post('/members/:id/add-items', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).send('Member not found');

  let itemIds = req.body.itemIds;
  if (!Array.isArray(itemIds)) itemIds = [itemIds];

  itemIds.forEach(itemId => {
    const category = db.categories.find(c => c.items.some(i => i.id === itemId));
    if (!category) return;

    // Remove previous item from this category
    member.items = member.items.filter(i => i.categoryId !== category.id);

    // Add the new one
    member.items.push({ categoryId: category.id, itemId });
  });

  saveDatabase(db);
  res.redirect('/');
});

// Remove Item from Member
app.post('/members/:id/remove-item', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).send('Member not found');

  member.items = member.items.filter(i => i.itemId !== req.body.itemId);
  saveDatabase(db);
  res.redirect('/');
});

// Update Attendance
app.post('/members/:id/attendance', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).send('Member not found');

  // Initialize attendance array
  const attendanceArray = Array(8).fill(false);

  let checkedIndexes = req.body.attendance;

  if (checkedIndexes !== undefined) {
    if (!Array.isArray(checkedIndexes)) {
      checkedIndexes = [checkedIndexes];
    }

    checkedIndexes.forEach((_, i) => {
      const index = parseInt(checkedIndexes[i]);
      if (!isNaN(index) && index >= 0 && index < 8) {
        attendanceArray[index] = true;
      }
    });
  }

  member.attendance = attendanceArray;
  saveDatabase(db);
  res.redirect('/');
});

// Eligibility Check
app.post('/check-eligibility', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();

  const eligibleMembers = db.members
    .filter(member => {
      const hasItem = member.items.some(i => i.itemId === itemId);
      const attendedCount = member.attendance.filter(Boolean).length;
      return hasItem && attendedCount >= 4;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  res.render('index', {
    categories: db.categories,
    members: db.members,
    selectedCategoryId: categoryId,
    selectedItemId: itemId,
    eligibleMembers
  });
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
