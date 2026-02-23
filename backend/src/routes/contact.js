const express = require("express");
const nodemailer = require("nodemailer");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_TYPES = ["bug", "predlog", "pitanje"];

const TYPE_LABELS = {
  bug: "🐛 Bug",
  predlog: "💡 Predlog",
  pitanje: "❓ Pitanje",
};

// POST /api/contact — šalje feedback email adminu
router.post("/", authenticate, async (req, res) => {
  try {
    const { type, subject, message } = req.body;

    // Validacija
    if (!type || !subject || !message) {
      return res.status(400).json({
        error: "Sva polja su obavezna (tip, naslov, poruka).",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        error: "Nevažeći tip poruke. Dozvoljeni: bug, predlog, pitanje.",
      });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({
        error: "Naslov mora imati najmanje 3 karaktera.",
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        error: "Poruka mora imati najmanje 10 karaktera.",
      });
    }

    // Proveri SMTP konfiguraciju
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL } =
      process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) {
      console.error("SMTP konfiguracija nije kompletna u .env fajlu.");
      return res.status(500).json({
        error: "Email servis nije konfigurisan. Kontaktirajte administratora.",
      });
    }

    // Kreiraj transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Podaci korisnika
    const userName =
      `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() ||
      req.user.nickname ||
      "Nepoznat";
    const userEmail = req.user.email;
    const userNickname = req.user.nickname || "-";

    // Sastavi email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🏋️ FitRecords — ${TYPE_LABELS[type]}</h2>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #6b7280; width: 120px;">Tip:</td>
              <td style="padding: 8px 12px;">${TYPE_LABELS[type]}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #6b7280;">Korisnik:</td>
              <td style="padding: 8px 12px;">${userName} (${userNickname})</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #6b7280;">Email:</td>
              <td style="padding: 8px 12px;"><a href="mailto:${userEmail}">${userEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #6b7280;">Naslov:</td>
              <td style="padding: 8px 12px; font-weight: bold;">${subject}</td>
            </tr>
          </table>
          <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 8px; color: #374151;">Poruka:</h3>
            <p style="margin: 0; white-space: pre-wrap; color: #1f2937; line-height: 1.6;">${message}</p>
          </div>
        </div>
        <div style="background: #f3f4f6; padding: 12px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            Poslato iz FitRecords aplikacije — ${new Date().toLocaleString("sr-RS")}
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"FitRecords Podrška" <${SMTP_USER}>`,
      to: ADMIN_EMAIL,
      replyTo: userEmail,
      subject: `[${TYPE_LABELS[type]}] ${subject}`,
      html: htmlBody,
    });

    res.json({
      message: "Poruka je uspešno poslata! Hvala na povratnoj informaciji.",
    });
  } catch (error) {
    console.error("Greška pri slanju kontakt poruke:", error);
    res.status(500).json({
      error: "Došlo je do greške pri slanju poruke. Pokušajte ponovo.",
    });
  }
});

module.exports = router;
