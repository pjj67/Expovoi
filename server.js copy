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
    return { categories: [], members: [] }; // return an empty structure in case of error
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
  
  
function saveDatabase(data) {
  try {
    fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving database:", error);
  }
}
});

// Eligibility Check
app.post('/check-eligibility', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();

  let eligibleMembers = [];
  let selectedItemName = null;

  if (categoryId === 'ring') {
    // Get Ring 1 and Ring 2 categories
    const ringCategories = db.categories.filter(c => c.name === 'Ring 1' || c.name === 'Ring 2');
    const ringCategoryIds = ringCategories.map(c => c.id);

    // Get item name based on ID from Ring 1 or Ring 2
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
    // Get Archboss Weap 1 and Archboss Weap 2 categories
    const archbossCategories = db.categories.filter(c => c.name === 'Archboss Weap 1' || c.name === 'Archboss Weap 2');
    const archbossCategoryIds = archbossCategories.map(c => c.id);

    // Get item name based on ID from Archboss Weap 1 or Archboss Weap 2
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
    // Standard category match (no special case like 'ring' or 'archboss')
    eligibleMembers = db.members.filter(member => {
      const attendedCount = member.attendance.filter(Boolean).length;
      return member.items.some(i => i.itemId === itemId) && attendedCount >= 4;
    });
  }

  // Sort eligible members by name
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
