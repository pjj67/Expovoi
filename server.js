const express = require('express');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Load the database (db.json)
function loadDatabase(callback) {
  fs.readFile(path.join(__dirname, 'db.json'), 'utf8', (err, rawData) => {
    if (err) {
      console.error('Error loading database:', err);
      callback({});
    } else {
      console.log('Database loaded successfully');
      callback(JSON.parse(rawData));
    }
  });
}

// Save to database (db.json)
function saveDatabase(data) {
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
}

// Homepage Route
app.get('/', (req, res) => {
  console.log('Loading homepage...');
  loadDatabase((db) => {
    console.log('Rendering homepage with categories:', db.categories);
    res.render('index', { categories: db.categories, results: null });
  });
});

// Check Item Route
app.post('/check-item', (req, res) => {
  const { categoryId, itemId } = req.body;
  console.log('Received categoryId:', categoryId, 'itemId:', itemId);
  
  loadDatabase((db) => {
    console.log('Loaded database in /check-item route');

    const category = db.categories.find(cat => cat.id === categoryId);
    const item = category?.items.find(it => it.id === itemId);

    if (!category || !item) {
      console.log('Category or item not found. Redirecting...');
      return res.redirect('/');  // If category or item is not found, redirect
    }

    console.log('Item found:', item);
    
    // Check members with attendance of 50% or more for the item
    const eligibleMembers = db.members.filter(member => {
      const itemAssigned = member.items.some(it => it.categoryId === categoryId && it.itemId === itemId);
      const attendanceRate = member.attendance.filter(att => att).length / member.attendance.length;
      return itemAssigned && attendanceRate >= 0.5;
    });

    console.log('Eligible members:', eligibleMembers);
    res.render('index', { categories: db.categories, results: eligibleMembers });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
