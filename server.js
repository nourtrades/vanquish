const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "leaderboard.json");
const SUBS_FILE = path.join(__dirname, "submissions.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Serve standalone pages ──
app.get("/submit", (_req, res) => res.sendFile(path.join(__dirname, "submit.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "admin.html")));

// ═══════════ LEADERBOARD ENDPOINTS ═══════════

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

// ═══════════ SUBMISSION ENDPOINTS ═══════════

function readSubs() {
  return JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
}
function writeSubs(data) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(data, null, 2) + "\n");
}

// ── POST /api/submissions ── trader submits a payout (with optional screenshot)
app.post("/api/submissions", upload.single("screenshot"), (req, res) => {
  try {
    const { name, payout } = req.body;
    if (!name || payout == null) {
      return res.status(400).json({ error: "'name' and 'payout' are required" });
    }
    const data = readSubs();
    const submission = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      payout: Number(payout),
      proofUrl: req.file ? `/uploads/${req.file.filename}` : "",
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    data.submissions.push(submission);
    writeSubs(data);
    res.json({ success: true, submission });
  } catch (err) {
    res.status(500).json({ error: "Failed to create submission" });
  }
});

// ── GET /api/submissions ── admin gets all submissions
app.get("/api/submissions", (_req, res) => {
  try {
    const data = readSubs();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read submissions" });
  }
});

// ── POST /api/submissions/:id/approve ── approve & add to leaderboard
app.post("/api/submissions/:id/approve", (req, res) => {
  try {
    const subs = readSubs();
    const sub = subs.submissions.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    if (sub.status !== "pending") return res.status(400).json({ error: "Already processed" });

    sub.status = "approved";
    sub.reviewedAt = new Date().toISOString();
    writeSubs(subs);

    // Add to leaderboard
    const lb = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const existing = lb.traders.findIndex(t => t.name === sub.name);
    if (existing !== -1) {
      lb.traders[existing].payout += sub.payout;
    } else {
      lb.traders.push({ name: sub.name, payout: sub.payout, trades: 0, winRate: 0 });
    }
    lb.traders.sort((a, b) => b.payout - a.payout);
    lb.traders.forEach((t, i) => (t.rank = i + 1));
    fs.writeFileSync(DATA_FILE, JSON.stringify(lb, null, 2) + "\n");

    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve submission" });
  }
});

// ── POST /api/submissions/:id/deny ── deny a submission
app.post("/api/submissions/:id/deny", (req, res) => {
  try {
    const subs = readSubs();
    const sub = subs.submissions.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    if (sub.status !== "pending") return res.status(400).json({ error: "Already processed" });

    sub.status = "denied";
    sub.reviewedAt = new Date().toISOString();
    writeSubs(subs);

    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ error: "Failed to deny submission" });
  }
});

app.listen(PORT, () => console.log(`Leaderboard API running on http://localhost:${PORT}`));
