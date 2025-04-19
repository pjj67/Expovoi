const express = require('express');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === Load & Save DB ===
function loadDatabase() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'db.json'));
    return JSON.parse(raw);
  } catch (e) {
    console.error("DB Load Error:", e);
    return { categories: [], members: [] };
  }
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("DB Save Error:", e);
  }
}

// === Home ===
app.get('/', (req, res) => {
  const db = loadDatabase();
  const selectedCategoryId = req.query.categoryId || null;
  const sortedMembers = [...db.members].sort((a, b) => a.name.localeCompare(b.name));
  res.render('index', {
    categories: db.categories,
    members: sortedMembers,
    selectedCategoryId,
    selectedItemId: null,
    eligibleMembers: undefined
  });
});

// === Category Routes ===
app.post('/categories', (req, res) => {
  const db = loadDatabase();
  db.categories.push({ id: uuid.v4(), name: req.body.name, items: [] });
  saveDatabase(db);
  res.redirect('/');
});

app.post('/categories/:id/items', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(c => c.id === req.params.id);
  if (!category) return res.status(404).send('Category not found');
  category.items.push({ id: uuid.v4(), name: req.body.name });
  saveDatabase(db);
  res.redirect('/');
});

app.post('/categories/:categoryId/items/:itemId/delete', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(c => c.id === req.params.categoryId);
  if (!category) return res.status(404).send('Category not found');
  category.items = category.items.filter(i => i.id !== req.params.itemId);
  saveDatabase(db);
  res.redirect('/');
});

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

app.post('/categories/:id/edit', (req, res) => {
  const db = loadDatabase();
  const category = db.categories.find(c => c.id === req.params.id);
  if (category) {
    category.name = req.body.name;
    saveDatabase(db);
  }
  res.redirect('/');
});

// === Member Routes ===
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

app.post('/members/:id/delete', (req, res) => {
  const db = loadDatabase();
  db.members = db.members.filter(m => m.id !== req.params.id);
  saveDatabase(db);
  res.redirect('/');
});

app.post('/members/:id/attendance', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).send('Member not found');

  const attendanceArray = Array(8).fill(false);
  let indexes = req.body.attendance;
  if (indexes !== undefined) {
    if (!Array.isArray(indexes)) indexes = [indexes];
    indexes.forEach(idx => {
      const i = parseInt(idx);
      if (!isNaN(i) && i >= 0 && i < 8) attendanceArray[i] = true;
    });
  }

  member.attendance = attendanceArray;
  saveDatabase(db);
  res.redirect('/');
});

/// ✅ New route: Update All Members' Attendance
app.post('/members/update-attendance', (req, res) => {
  const db = loadDatabase();
  const updatedAttendance = req.body.attendance; // attendance[memberId][]

  db.members.forEach(member => {
    const memberChecks = updatedAttendance?.[member.id];
    const attendanceArray = Array(8).fill(false);

    if (memberChecks) {
      const indexes = Array.isArray(memberChecks) ? memberChecks : [memberChecks];
      indexes.forEach(index => {
        const i = parseInt(index);
        if (!isNaN(i) && i >= 0 && i < 8) {
          attendanceArray[i] = true;
        }
      });
    }

    member.attendance = attendanceArray;
  });

  saveDatabase(db);
  res.redirect('/');
});

// ✅ Assign Items to Member
app.post('/members/:id/add-items', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).send('Member not found');

  const categoryItems = req.body.categoryItems || {};
  if (!member.items) member.items = [];

  for (const [categoryId, itemId] of Object.entries(categoryItems)) {
    if (!itemId) continue;
    member.items = member.items.filter(i => i.categoryId !== categoryId);
    member.items.push({ categoryId, itemId });
  }

  saveDatabase(db);
  res.redirect('/');
});

app.post('/members/:id/remove-item', (req, res) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).send('Member not found');
  member.items = member.items.filter(i => i.itemId !== req.body.itemId);
  saveDatabase(db);
  res.redirect('/');
});

// ✅ Eligibility Check
app.post('/check-eligibility', (req, res) => {
  const { categoryId, itemId } = req.body;
  const db = loadDatabase();
  let eligibleMembers = [];
  let selectedItemName = null;

  const getItemName = (cats, id) => {
    for (const c of cats) {
      const item = c.items.find(i => i.id === id);
      if (item) return item.name;
    }
    return null;
  };

  if (categoryId === 'ring') {
    const ringCats = db.categories.filter(c => ['Ring 1', 'Ring 2'].includes(c.name));
    selectedItemName = getItemName(ringCats, itemId);
    if (selectedItemName) {
      eligibleMembers = db.members.filter(m => {
        const attended = m.attendance.filter(Boolean).length >= 4;
        const hasItem = m.items.some(i => {
          const cat = db.categories.find(c => c.id === i.categoryId);
          if (!cat || !['Ring 1', 'Ring 2'].includes(cat.name)) return false;
          const item = cat.items.find(it => it.id === i.itemId);
          return item && item.name === selectedItemName;
        });
        return attended && hasItem;
      });
    }
  } else if (categoryId === 'archboss') {
    const archCats = db.categories.filter(c => ['Archboss Weap 1', 'Archboss Weap 2'].includes(c.name));
    selectedItemName = getItemName(archCats, itemId);
    if (selectedItemName) {
      eligibleMembers = db.members.filter(m => {
        const attended = m.attendance.filter(Boolean).length >= 4;
        const hasItem = m.items.some(i => {
          const cat = db.categories.find(c => c.id === i.categoryId);
          if (!cat || !['Archboss Weap 1', 'Archboss Weap 2'].includes(cat.name)) return false;
          const item = cat.items.find(it => it.id === i.itemId);
          return item && item.name === selectedItemName;
        });
        return attended && hasItem;
      });
    }
  } else {
    eligibleMembers = db.members.filter(m => {
      const attended = m.attendance.filter(Boolean).length >= 4;
      return m.items.some(i => i.itemId === itemId) && attended;
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
