const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { Low, JSONFile } = require("lowdb");
const { nanoid } = require("nanoid");
const cors = require("cors");

const adapter = new JSONFile("db.json");
const db = new Low(adapter);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

(async () => {
  await db.read();
  db.data ||= { members: [], categories: [] };
  await db.write();
})();

// Get all categories
app.get("/categories", async (req, res) => {
  await db.read();
  res.json(db.data.categories);
});

// Get eligible members for a dropped item
app.get("/eligible-members/:categoryId/:itemId", async (req, res) => {
  await db.read();
  const { categoryId, itemId } = req.params;
  const members = db.data.members;

  const eligible = members.filter(member => {
    const hasItem = member.items?.some(
      i => i.categoryId === categoryId && i.itemId === itemId
    );
    if (!hasItem) return false;

    const attended = member.attendance?.filter(a => a === true).length || 0;
    return attended >= 4; // 50% of 8
  });

  res.json(eligible);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
