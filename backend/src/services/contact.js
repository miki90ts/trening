const nodemailer = require("nodemailer");
const { httpError } = require("../helpers/httpError");

const VALID_TYPES = ["bug", "predlog", "pitanje"];

const TYPE_LABELS = {
  bug: "🐛 Bug",
  predlog: "💡 Predlog",
  pitanje: "❓ Pitanje",
};

function validatePayload(body) {
  const { type, subject, message } = body;

  if (!type || !subject || !message) {
    throw httpError(400, "Sva polja su obavezna (tip, naslov, poruka).");
  }

  if (!VALID_TYPES.includes(type)) {
    throw httpError(
      400,
      "Nevažeći tip poruke. Dozvoljeni: bug, predlog, pitanje.",
    );
  }

  if (subject.trim().length < 3) {
    throw httpError(400, "Naslov mora imati najmanje 3 karaktera.");
  }

  if (message.trim().length < 10) {
    throw httpError(400, "Poruka mora imati najmanje 10 karaktera.");
  }
}

function ensureSmtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) {
    throw httpError(
      500,
      "Email servis nije konfigurisan. Kontaktirajte administratora.",
    );
  }

  return { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL };
}

async function sendContactMessage(user, body) {
  validatePayload(body);
  const { type, subject, message } = body;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL } =
    ensureSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const userName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.nickname ||
    "Nepoznat";
  const userEmail = user.email;
  const userNickname = user.nickname || "-";

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

  return {
    message: "Poruka je uspešno poslata! Hvala na povratnoj informaciji.",
  };
}

module.exports = {
  sendContactMessage,
};
