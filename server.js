const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Default DB structure
db.defaults({ members: [], categories: [] }).write();

// Home Page
app.get("/", (req, res) => {
  const members = db.get("members").value();
  const categories = db.get("categories").value();
  res.render("index", { members, categories });
});

// Add Member
app.post("/members", (req, res) => {
  const name = req.body.name;
  db.get("members")
    .push({ id: uuidv4(), name, attendance: Array(8).fill(false), items: [] })
    .write();
  res.redirect("/");
});

// Remove Member
app.post("/members/:id/delete", (req, res) => {
  db.get("members").remove({ id: req.params.id }).write();
  res.redirect("/");
});

// Update Attendance
app.post("/members/:id/attendance", (req, res) => {
  const attendance = req.body.attendance.map(val => val === "on");
  db.get("members")
    .find({ id: req.params.id })
    .assign({ attendance })
    .write();
  res.redirect("/");
});

// Add Category
app.post("/categories", (req, res) => {
  const name = req.body.name;
  db.get("categories")
    .push({ id: uuidv4(), name, items: [] })
    .write();
  res.redirect("/");
});

// Update Category Name
app.post("/categories/:id/edit", (req, res) => {
  const name = req.body.name;
  db.get("categories").find({ id: req.params.id }).assign({ name }).write();
  res.redirect("/");
});

// Add Item to Category
app.post("/categories/:id/items", (req, res) => {
  const item = { id: uuidv4(), name: req.body.name };
  db.get("categories")
    .find({ id: req.params.id })
    .get("items")
    .push(item)
    .write();
  res.redirect("/");
});

// Edit Item in Category
app.post("/categories/:catId/items/:itemId/edit", (req, res) => {
  const { name } = req.body;
  const category = db.get("categories").find({ id: req.params.catId });
  const item = category.get("items").find({ id: req.params.itemId });
  item.assign({ name }).write();
  res.redirect("/");
});

// Delete Item
app.post("/categories/:catId/items/:itemId/delete", (req, res) => {
  db.get("categories")
    .find({ id: req.params.catId })
    .get("items")
    .remove({ id: req.params.itemId })
    .write();
  res.redirect("/");
});

// Add Item to Member
app.post("/members/:memberId/add-item", (req, res) => {
  const { categoryId, itemId } = req.body;

  const member = db.get("members").find({ id: req.params.memberId });

  const existing = member.get("items").find({ categoryId, itemId }).value();
  if (!existing) {
    member.get("items").push({ categoryId, itemId }).write();
  }

  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
