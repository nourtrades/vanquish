const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "leaderboard.json");

app.use(express.json());

// ── GET /api/leaderboard ── return current leaderboard
app.get("/api/leaderboard", (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read leaderboard data" });
  }
});

// ── PUT /api/leaderboard ── replace entire leaderboard (admin)
app.put("/api/leaderboard", (req, res) => {
  try {
    const { month, traders } = req.body;
    if (!month || !Array.isArray(traders)) {
      return res.status(400).json({ error: "Body must include 'month' (string) and 'traders' (array)" });
    }
    const data = { month, traders };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Failed to write leaderboard data" });
  }
});

// ── POST /api/leaderboard/trader ── add or update a single trader
app.post("/api/leaderboard/trader", (req, res) => {
  try {
    const { name, payout, trades, winRate } = req.body;
    if (!name || payout == null) {
      return res.status(400).json({ error: "'name' and 'payout' are required" });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const existing = data.traders.findIndex(t => t.name === name);
    const entry = { name, payout: Number(payout), trades: Number(trades || 0), winRate: Number(winRate || 0) };

    if (existing !== -1) {
      data.traders[existing] = { ...data.traders[existing], ...entry };
    } else {
      data.traders.push(entry);
    }

    // re-rank by payout descending
    data.traders.sort((a, b) => b.payout - a.payout);
    data.traders.forEach((t, i) => (t.rank = i + 1));

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Failed to update trader" });
  }
});

// ── DELETE /api/leaderboard/trader/:name ── remove a trader
app.delete("/api/leaderboard/trader/:name", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.traders = data.traders.filter(t => t.name !== req.params.name);
    data.traders.sort((a, b) => b.payout - a.payout);
    data.traders.forEach((t, i) => (t.rank = i + 1));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trader" });
  }
});

app.listen(PORT, () => console.log(`Leaderboard API running on http://localhost:${PORT}`));
