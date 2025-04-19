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
  const selectedCategoryId = req.query.categoryId || null;  // Get selected category ID from query params
  const selectedItemId = req.query.itemId || null;          // Get selected item ID from query params

  res.render('index', { 
    categories: db.categories, 
    members: db.members,
    selectedCategoryId,  // Pass selected category ID to EJS
    selectedItemId,      // Pass selected item ID to EJS
    eligibleMembers: [], // Initialize eligibleMembers as an empty array
  });
});

// Check Eligibility for Members Based on Category and Item
app.post('/check-eligibility', (req, res) => {
  const db = loadDatabase();
  const { categoryId, itemId } = req.body;

  // Find the selected category and item
  const selectedCategory = db.categories.find(c => c.id === categoryId);
  const selectedItem = selectedCategory ? selectedCategory.items.find(i => i.id === itemId) : null;

  // Find eligible members
  const eligibleMembers = db.members.filter(member => {
    // Check if member has the selected item
    const hasItem = member.items.some(item => item.itemId === itemId);
    // Check if member attended at least 4 out of 8 events
    const attendanceCount = member.attendance.filter(attended => attended).length;
    return hasItem && attendanceCount >= 4;
  });

  // Pass eligible members and selected item/category to the EJS
  res.render('index', { 
    categories: db.categories, 
    members: db.members,
    selectedCategoryId: categoryId,  // Keep selected category
    selectedItemId: itemId,          // Keep selected item
    eligibleMembers: eligibleMembers // Pass eligible members
  });
});

// Add Items to Member
app.post('/members/:id/add-items', (req, res) => {
  const memberId = req.params.id;
  const { itemIds } = req.body; // itemIds is an array of selected item IDs
  const db = loadDatabase();

  const member = db.members.find(m => m.id === memberId);

  // Add each selected item to the member's items list
  itemIds.forEach(itemId => {
    const item = db.categories.flatMap(category => category.items).find(item => item.id === itemId);
    if (item) {
      const categoryId = db.categories.find(category => category.items.includes(item)).id;
      member.items.push({ categoryId, itemId });
    }
  });

  saveDatabase(db);
  res.redirect('/');
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
  const newItem = { id: uuid.v4(), name };
  
  category.items.push(newItem);
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

  // Update attendance
  member.attendance = attendance.map(a => a === 'on');  // Convert 'on' values to boolean

  saveDatabase(db);
  res.redirect('/');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
