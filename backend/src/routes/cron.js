const express = require("express");
const router = express.Router();
const { processReminders } = require("../services/cronReminders");

/**
 * GET /api/cron/reminders?secret=CRON_SECRET
 *
 * Endpoint za cPanel cron job.
 * cPanel setup: 0 8 * * * curl -s "https://your-domain.com/api/cron/reminders?secret=YOUR_SECRET"
 *
 * Generiše dnevne notifikacije i šalje email podsetnike.
 */
router.get("/reminders", async (req, res) => {
  try {
    const secret = req.query.secret;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return res
        .status(500)
        .json({ error: "CRON_SECRET nije podešen u env varijablama." });
    }

    if (secret !== cronSecret) {
      return res.status(403).json({ error: "Neispravan secret." });
    }

    const result = await processReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[CRON endpoint] Greška:", err.message);
    res.status(500).json({ error: "Greška pri obradi podsetnika." });
  }
});

module.exports = router;
