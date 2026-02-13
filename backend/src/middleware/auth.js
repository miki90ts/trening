const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

/**
 * Middleware: Verifikuje JWT access token iz Authorization headera.
 * Kači req.user = { id, email, role } za dalje korišćenje.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Potrebna je autentifikacija. Prijavite se.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token je istekao. Osvežite sesiju.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Nevažeći token.' });
    }

    // Proveri da li korisnik još postoji i da li je odobren
    const [users] = await pool.query(
      'SELECT id, email, role, is_approved, first_name, last_name, nickname FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Korisnik ne postoji.' });
    }

    const user = users[0];

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Vaš nalog čeka odobrenje administratora.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Proverava da li korisnik ima dozvoljenu rolu.
 * Koristi se posle authenticate middleware-a.
 * Primer: authorize('admin') ili authorize('admin', 'user')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Potrebna je autentifikacija.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Nemate dozvolu za ovu akciju.' });
    }

    next();
  };
};

/**
 * Middleware: Opciona autentifikacija — ne blokira ako nema tokena,
 * ali ako token postoji i validan je, kači req.user.
 * Korisno za rute koje mogu raditi sa i bez autentifikacije.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const [users] = await pool.query(
        'SELECT id, email, role, is_approved, first_name, last_name, nickname FROM users WHERE id = ?',
        [decoded.id]
      );
      if (users.length > 0 && users[0].is_approved) {
        req.user = {
          id: users[0].id,
          email: users[0].email,
          role: users[0].role,
          first_name: users[0].first_name,
          last_name: users[0].last_name,
          nickname: users[0].nickname
        };
      }
    } catch (err) {
      // Token nevažeći — ignorisati, nastaviti bez korisnika
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorize, optionalAuth };
