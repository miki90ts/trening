const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db/connection");
const { authenticate, authorize } = require("../middleware/auth");

const BCRYPT_ROUNDS = 12;

// ===== HELPER: Generisanje tokena =====
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" },
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

async function saveRefreshToken(userId, refreshToken) {
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  // Refresh token traje 7 dana
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );
  return refreshToken;
}

async function verifyRefreshToken(refreshToken) {
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  const [rows] = await pool.query(
    "SELECT rt.*, u.id as uid, u.email, u.role, u.is_approved, u.show_in_users_list, u.first_name, u.last_name, u.nickname, u.profile_image FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = ? AND rt.expires_at > NOW()",
    [tokenHash],
  );
  return rows.length > 0 ? rows[0] : null;
}

async function deleteRefreshToken(refreshToken) {
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  await pool.query("DELETE FROM refresh_tokens WHERE token_hash = ?", [
    tokenHash,
  ]);
}

async function deleteAllUserRefreshTokens(userId) {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);
}

// Čisti istekle refresh tokene (poziva se povremeno)
async function cleanExpiredTokens() {
  await pool.query("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
}

// ===== HELPER: Sanitize user za response =====
function sanitizeUser(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    is_approved: user.is_approved,
    show_in_users_list: user.show_in_users_list,
    profile_image: user.profile_image,
    created_at: user.created_at,
  };
}

// ==========================================
// POST /api/auth/register - Registracija
// ==========================================
router.post("/register", async (req, res, next) => {
  try {
    const { first_name, last_name, nickname, email, password } = req.body;

    // Validacija
    if (!first_name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Ime, email i lozinka su obavezni." });
    }

    // Email format validacija
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Nevažeći email format." });
    }

    // Password validacija (min 8 karaktera, bar jedno veliko slovo, malo slovo, broj)
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Lozinka mora imati najmanje 8 karaktera." });
    }
    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return res
        .status(400)
        .json({
          error: "Lozinka mora sadržati veliko slovo, malo slovo i broj.",
        });
    }

    // Proveri da li email već postoji
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase()],
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: "Korisnik sa ovim emailom već postoji." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert user (is_approved = 0, čeka admin odobrenje)
    const [result] = await pool.query(
      "INSERT INTO users (first_name, last_name, nickname, email, password_hash, role, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        first_name,
        last_name || null,
        nickname || null,
        email.toLowerCase(),
        passwordHash,
        "user",
        0,
      ],
    );

    const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json({
      message: "Registracija uspešna! Vaš nalog čeka odobrenje administratora.",
      user: sanitizeUser(newUser[0]),
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// POST /api/auth/login - Prijava
// ==========================================
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email i lozinka su obavezni." });
    }

    // Nađi korisnika po emailu
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email.toLowerCase(),
    ]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Pogrešan email ili lozinka." });
    }

    const user = users[0];

    // Proveri password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Pogrešan email ili lozinka." });
    }

    // Proveri da li je odobren
    if (!user.is_approved) {
      return res
        .status(403)
        .json({ error: "Vaš nalog čeka odobrenje administratora." });
    }

    // Generiši tokene
    const accessToken = generateAccessToken(user);
    const refreshToken = await saveRefreshToken(
      user.id,
      generateRefreshToken(),
    );

    // Čisti stare tokene povremeno
    cleanExpiredTokens().catch(() => {});

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// POST /api/auth/refresh - Osvežavanje tokena
// ==========================================
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token je obavezan." });
    }

    // Verifikuj refresh token
    const tokenData = await verifyRefreshToken(refreshToken);
    if (!tokenData) {
      return res
        .status(401)
        .json({ error: "Nevažeći ili istekli refresh token." });
    }

    if (!tokenData.is_approved) {
      return res
        .status(403)
        .json({ error: "Vaš nalog čeka odobrenje administratora." });
    }

    // Token rotation: obriši stari, napravi novi
    await deleteRefreshToken(refreshToken);

    const user = {
      id: tokenData.uid,
      email: tokenData.email,
      role: tokenData.role,
      first_name: tokenData.first_name,
      last_name: tokenData.last_name,
      nickname: tokenData.nickname,
      show_in_users_list: tokenData.show_in_users_list,
      profile_image: tokenData.profile_image,
      is_approved: tokenData.is_approved,
    };

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await saveRefreshToken(
      user.id,
      generateRefreshToken(),
    );

    res.json({
      user: sanitizeUser({ ...user, id: tokenData.uid }),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// GET /api/auth/me - Trenutni korisnik
// ==========================================
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Korisnik nije pronađen." });
    }
    res.json(sanitizeUser(users[0]));
  } catch (err) {
    next(err);
  }
});

// ==========================================
// POST /api/auth/logout - Odjava
// ==========================================
router.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }
    res.json({ message: "Uspešna odjava." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// POST /api/auth/logout-all - Odjava sa svih uređaja
// ==========================================
router.post("/logout-all", authenticate, async (req, res, next) => {
  try {
    await deleteAllUserRefreshTokens(req.user.id);
    res.json({ message: "Odjavljeni sa svih uređaja." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ADMIN RUTE
// ==========================================

// GET /api/auth/pending - Korisnici koji čekaju odobrenje
router.get(
  "/pending",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const [users] = await pool.query(
        "SELECT id, first_name, last_name, nickname, email, role, is_approved, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC",
      );
      res.json(users);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/auth/approve/:id - Odobri korisnika
router.put(
  "/approve/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query(
        "UPDATE users SET is_approved = 1 WHERE id = ?",
        [req.params.id],
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Korisnik nije pronađen." });
      }
      const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [
        req.params.id,
      ]);
      res.json({ message: "Korisnik odobren.", user: sanitizeUser(user[0]) });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/auth/reject/:id - Odbij korisnika (obriši ga)
router.delete(
  "/reject/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const [user] = await pool.query(
        "SELECT * FROM users WHERE id = ? AND is_approved = 0",
        [req.params.id],
      );
      if (user.length === 0) {
        return res
          .status(404)
          .json({ error: "Korisnik nije pronađen ili je već odobren." });
      }
      await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      res.json({ message: "Korisnik odbijen i obrisan." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/auth/role/:id - Promeni rolu korisnika (admin only)
router.put(
  "/role/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      if (!["user", "admin"].includes(role)) {
        return res
          .status(400)
          .json({ error: 'Rola mora biti "user" ili "admin".' });
      }

      // Ne dozvoli adminu da sam sebi skine admin prava
      if (parseInt(req.params.id) === req.user.id && role !== "admin") {
        return res
          .status(400)
          .json({ error: "Ne možete sami sebi ukloniti admin prava." });
      }

      await pool.query("UPDATE users SET role = ? WHERE id = ?", [
        role,
        req.params.id,
      ]);
      const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [
        req.params.id,
      ]);
      if (user.length === 0) {
        return res.status(404).json({ error: "Korisnik nije pronađen." });
      }
      res.json({ message: "Rola promenjena.", user: sanitizeUser(user[0]) });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/change-password - Promena lozinke
router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Trenutna i nova lozinka su obavezne." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Nova lozinka mora imati najmanje 8 karaktera." });
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res
        .status(400)
        .json({
          error: "Nova lozinka mora sadržati veliko slovo, malo slovo i broj.",
        });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const isValid = await bcrypt.compare(
      currentPassword,
      users[0].password_hash,
    );
    if (!isValid) {
      return res.status(401).json({ error: "Trenutna lozinka je pogrešna." });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      req.user.id,
    ]);

    // Invalidate sve refresh tokene (forsiraj re-login)
    await deleteAllUserRefreshTokens(req.user.id);

    res.json({ message: "Lozinka uspešno promenjena. Prijavite se ponovo." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
