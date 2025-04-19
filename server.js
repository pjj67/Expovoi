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
  try {
    const rawData = fs.readFileSync(path.join(__dirname, 'db.json'));
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error loading database:", error);
    return { categories: [], members: [] };
  }
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving database:", error);
  }
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

// ✅ Updated: Assign Items to Member (preserving non-updated items)
app.post("/members/:id/add-items", (req, res) => {
  const memberId = req.params.id;
  const categoryItems = req.body.categoryItems; // format: { categoryId: itemId }

  const db = loadDatabase(); // Load the database

  const member = db.members.find((m) => m.id === memberId);
  if (!member) return res.status(404).send("Member not found");

  // If member doesn't have an 'items' array, initialize it
  if (!member.items) member.items = [];

  // Loop through each category and update items
  for (const [categoryIdStr, itemIdStr] of Object.entries(categoryItems || {})) {
    const categoryId = categoryIdStr;
    const itemId = itemIdStr;
    
    // Skip if no item is selected (empty string)
    if (!itemId) continue;

    // Remove old item assignment from the same category
    member.items = member.items.filter((item) => item.categoryId !== categoryId);

    // Add the new item to the member's items
    member.items.push({ categoryId, itemId });
  }

  // Save the updated database
  saveDatabase(db);

  res.redirect("/"); // Redirect back to the main page
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

// ✅ Updated: Bulk Update Attendance for All Members
app.post('/members/attendance', (req, res) => {
  const db = loadDatabase();

  // Extract attendance data for all members
  const updatedAttendance = req.body.attendance; // Format: { memberId: [eventIndexes] }

  db.members.forEach(member => {
    const attendanceArray = Array(8).fill(false);
    const memberAttendance = updatedAttendance[member.id];

    if (memberAttendance) {
      memberAttendance.forEach(eventIndex => {
        const i = parseInt(eventIndex);
        if (!isNaN(i) && i >= 0 && i < 8) {
          attendanceArray[i] = true;
        }
      });
    }

    member.attendance = attendanceArray;
  });

  // Save the updated database
  saveDatabase(db);

  res.redirect('/'); // Redirect back to the main page
});

// Eligibility Check
app.post('/check-eligibility', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();

  let eligibleMembers = [];
  let selectedItemName = null;

  if (categoryId === 'ring') {
    const ringCategories = db.categories.filter(c => c.name === 'Ring 1' || c.name === 'Ring 2');
    const ringCategoryIds = ringCategories.map(c => c.id);

    for (const category of ringCategories) {
      const match = category.items.find(i => i.id === itemId);
      if (match) {
        selectedItemName = match.name;
        break;
      }
    }

    if (selectedItemName) {
      eligibleMembers = db.members.filter(member => {
        const attendedCount = member.attendance.filter(Boolean).length;
        const hasMatchingItem = member.items.some(i => {
          const cat = db.categories.find(c => c.id === i.categoryId);
          if (!cat || !ringCategoryIds.includes(cat.id)) return false;
          const item = cat.items.find(it => it.id === i.itemId);
          return item && item.name === selectedItemName;
        });
        return hasMatchingItem && attendedCount >= 4;
      });
    }
  } else if (categoryId === 'archboss') {
    const archbossCategories = db.categories.filter(c => c.name === 'Archboss Weap 1' || c.name === 'Archboss Weap 2');
    const archbossCategoryIds = archbossCategories.map(c => c.id);

    for (const category of archbossCategories) {
      const match = category.items.find(i => i.id === itemId);
      if (match) {
        selectedItemName = match.name;
        break;
      }
    }

    if (selectedItemName) {
      eligibleMembers = db.members.filter(member => {
        const attendedCount = member.attendance.filter(Boolean).length;
        const hasMatchingArchbossItem = member.items.some(i => {
          const cat = db.categories.find(c => c.id === i.categoryId);
          if (!cat || !archbossCategoryIds.includes(cat.id)) return false;
          const item = cat.items.find(it => it.id === i.itemId);
          return item && item.name === selectedItemName;
        });
        return hasMatchingArchbossItem && attendedCount >= 4;
      });
    }
  } else {
    eligibleMembers = db.members.filter(member => {
      const attendedCount = member.attendance.filter(Boolean).length;
      return member.items.some(i => i.itemId === itemId) && attendedCount >= 4;
    });
  }

  eligibleMembers.sort((a, b) => a.name.localeCompare(b.name));

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
