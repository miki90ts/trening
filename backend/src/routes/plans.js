const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const nodemailer = require('nodemailer');
const { authenticate } = require('../middleware/auth');

// ======== HELPER: Pošalji email o zakazanom treningu ========
async function sendScheduleEmail(targetUser, planName, planColor, scheduledDate, exercisesWithSets, adminName) {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('SMTP nije konfigurisan — email notifikacija preskočena.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    const formattedDate = new Date(scheduledDate).toLocaleDateString('sr-Latn-RS', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const color = planColor || '#6366f1';

    // Generiši tabelu vežbi
    let exerciseRows = '';
    for (const ex of exercisesWithSets) {
      const setsHtml = ex.sets.map(s => {
        if (ex.has_weight && s.target_weight) {
          return `${s.set_number}. set: ${s.target_reps} pon. × ${s.target_weight} kg`;
        }
        return `${s.set_number}. set: ${s.target_reps} pon.`;
      }).join('<br>');

      exerciseRows += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1f2937; vertical-align: top;">
            ${ex.exercise_icon ? ex.exercise_icon + ' ' : ''}${ex.category_name}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 13px; line-height: 1.6;">
            ${setsHtml || '<em>Nema setova</em>'}
          </td>
        </tr>
      `;
    }

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: ${color}; color: white; padding: 24px 28px;">
          <h2 style="margin: 0 0 4px; font-size: 20px;">🏋️ Novi trening zakazan!</h2>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">FitRecords — Plan treninga</p>
        </div>
        <div style="background: #f9fafb; padding: 24px 28px;">
          <div style="background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 110px;">Plan:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1f2937;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Datum:</td>
                <td style="padding: 6px 0; color: #1f2937;">📅 ${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Zakazao:</td>
                <td style="padding: 6px 0; color: #1f2937;">${adminName}</td>
              </tr>
            </table>
          </div>

          <h3 style="margin: 0 0 12px; color: #374151; font-size: 16px;">📋 Vežbe u planu (${exercisesWithSets.length})</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Vežba</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Setovi</th>
              </tr>
            </thead>
            <tbody>
              ${exerciseRows}
            </tbody>
          </table>
        </div>
        <div style="background: #f3f4f6; padding: 14px 28px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Poslato iz FitRecords aplikacije — ${new Date().toLocaleString('sr-RS')}
          </p>
        </div>
      </div>
    `;

    const targetName = `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.nickname || 'Korisnik';

    await transporter.sendMail({
      from: `"FitRecords" <${SMTP_USER}>`,
      to: targetUser.email,
      subject: `🏋️ Zakazan trening: ${planName} — ${formattedDate}`,
      html: htmlBody
    });

    console.log(`Email notifikacija poslata korisniku ${targetName} (${targetUser.email})`);
  } catch (err) {
    console.error('Greška pri slanju email notifikacije:', err.message);
    // Ne prekidaj flow — email je nice-to-have
  }
}

// ======== HELPER: Score SQL ========
const SCORE_SQL = `
  CASE 
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

// ================================================
// PLAN TEMPLATES CRUD
// ================================================

// GET /api/plans — svi planovi korisnika
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [plans] = await pool.query(`
      SELECT wp.*, 
             COUNT(DISTINCT wpe.id) as exercise_count
      FROM workout_plans wp
      LEFT JOIN workout_plan_exercises wpe ON wpe.plan_id = wp.id
      WHERE wp.user_id = ?
      GROUP BY wp.id
      ORDER BY wp.updated_at DESC
    `, [req.user.id]);
    res.json(plans);
  } catch (err) { next(err); }
});

// GET /api/plans/:id — detalj plana sa svim vežbama i setovima
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [plans] = await pool.query('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (plans.length === 0) return res.status(404).json({ error: 'Plan nije pronađen' });

    const plan = plans[0];

    // Vežbe sa category/exercise info
    const [exercises] = await pool.query(`
      SELECT wpe.id, wpe.category_id, wpe.order_index, wpe.notes,
             c.name as category_name, c.value_type, c.has_weight,
             e.id as exercise_id, e.name as exercise_name, e.icon as exercise_icon
      FROM workout_plan_exercises wpe
      JOIN categories c ON wpe.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE wpe.plan_id = ?
      ORDER BY wpe.order_index ASC
    `, [plan.id]);

    // Setovi za svaku vežbu
    for (const ex of exercises) {
      const [sets] = await pool.query(
        'SELECT id, set_number, target_reps, target_weight FROM workout_plan_sets WHERE plan_exercise_id = ? ORDER BY set_number',
        [ex.id]
      );
      ex.sets = sets;
    }

    plan.exercises = exercises;
    res.json(plan);
  } catch (err) { next(err); }
});

// POST /api/plans — kreiraj plan sa vežbama i setovima
router.post('/', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, color, exercises } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Naziv plana je obavezan' });
    }
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'Plan mora imati bar jednu vežbu' });
    }

    const [insertPlan] = await conn.query(
      'INSERT INTO workout_plans (user_id, name, description, color) VALUES (?, ?, ?, ?)',
      [req.user.id, name.trim(), description || null, color || '#6366f1']
    );
    const planId = insertPlan.insertId;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex.category_id) continue;

      const [insertEx] = await conn.query(
        'INSERT INTO workout_plan_exercises (plan_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)',
        [planId, ex.category_id, i, ex.notes || null]
      );
      const planExId = insertEx.insertId;

      if (ex.sets && Array.isArray(ex.sets)) {
        for (let j = 0; j < ex.sets.length; j++) {
          const s = ex.sets[j];
          await conn.query(
            'INSERT INTO workout_plan_sets (plan_exercise_id, set_number, target_reps, target_weight) VALUES (?, ?, ?, ?)',
            [planExId, j + 1, parseFloat(s.target_reps) || 0, s.target_weight ? parseFloat(s.target_weight) : null]
          );
        }
      }
    }

    await conn.commit();
    res.status(201).json({ id: planId, message: 'Plan kreiran' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// PUT /api/plans/:id — ažuriraj plan
router.put('/:id', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const planId = req.params.id;

    const [existing] = await conn.query('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [planId, req.user.id]);
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Plan nije pronađen' });
    }

    const { name, description, color, exercises } = req.body;

    await conn.query(
      'UPDATE workout_plans SET name = ?, description = ?, color = ?, updated_at = NOW() WHERE id = ?',
      [name?.trim() || existing[0].name, description !== undefined ? description : existing[0].description, color || existing[0].color, planId]
    );

    // Obriši stare vežbe (CASCADE briše i setove)
    if (exercises && Array.isArray(exercises)) {
      await conn.query('DELETE FROM workout_plan_exercises WHERE plan_id = ?', [planId]);

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.category_id) continue;

        const [insertEx] = await conn.query(
          'INSERT INTO workout_plan_exercises (plan_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)',
          [planId, ex.category_id, i, ex.notes || null]
        );
        const planExId = insertEx.insertId;

        if (ex.sets && Array.isArray(ex.sets)) {
          for (let j = 0; j < ex.sets.length; j++) {
            const s = ex.sets[j];
            await conn.query(
              'INSERT INTO workout_plan_sets (plan_exercise_id, set_number, target_reps, target_weight) VALUES (?, ?, ?, ?)',
              [planExId, j + 1, parseFloat(s.target_reps) || 0, s.target_weight ? parseFloat(s.target_weight) : null]
            );
          }
        }
      }
    }

    await conn.commit();
    res.json({ message: 'Plan ažuriran' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// DELETE /api/plans/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Plan nije pronađen' });

    await pool.query('DELETE FROM workout_plans WHERE id = ?', [req.params.id]);
    res.json({ message: 'Plan obrisan' });
  } catch (err) { next(err); }
});

// ================================================
// SESSIONS (izvršenje plana)
// ================================================

// POST /api/plans/:id/schedule — zakaži plan za datum (admin može za drugog korisnika)
router.post('/:id/schedule', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const planId = req.params.id;
    const { scheduled_date, user_id } = req.body;

    if (!scheduled_date) {
      return res.status(400).json({ error: 'Datum je obavezan' });
    }

    // Odredi za koga se zakazuje
    let targetUserId;
    let targetUser = null;
    if (req.user.role === 'admin' && user_id) {
      targetUserId = user_id;
      // Proveri da li korisnik postoji
      const [users] = await conn.query('SELECT id, first_name, last_name, nickname, email FROM users WHERE id = ? AND is_approved = 1', [user_id]);
      if (users.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }
      targetUser = users[0];
    } else {
      targetUserId = req.user.id;
    }

    // Učitaj plan (admin-ov sopstveni plan)
    const [plans] = await conn.query('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [planId, req.user.id]);
    if (plans.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Plan nije pronađen' });
    }

    const [planExercises] = await conn.query(
      'SELECT * FROM workout_plan_exercises WHERE plan_id = ? ORDER BY order_index', [planId]
    );

    // Kreiraj sesiju za target korisnika
    const [insertSession] = await conn.query(
      'INSERT INTO workout_sessions (user_id, plan_id, plan_name, scheduled_date, status) VALUES (?, ?, ?, ?, ?)',
      [targetUserId, planId, plans[0].name, scheduled_date, 'scheduled']
    );
    const sessionId = insertSession.insertId;

    // Kopiraj vežbe i setove iz plana u sesiju
    for (const pe of planExercises) {
      const [insertSE] = await conn.query(
        'INSERT INTO workout_session_exercises (session_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)',
        [sessionId, pe.category_id, pe.order_index, pe.notes]
      );
      const seId = insertSE.insertId;

      const [planSets] = await conn.query(
        'SELECT * FROM workout_plan_sets WHERE plan_exercise_id = ? ORDER BY set_number', [pe.id]
      );

      for (const ps of planSets) {
        await conn.query(
          'INSERT INTO workout_session_sets (session_exercise_id, set_number, target_reps, target_weight) VALUES (?, ?, ?, ?)',
          [seId, ps.set_number, ps.target_reps, ps.target_weight]
        );
      }
    }

    await conn.commit();

    // Ako admin zakazuje za drugog korisnika — pošalji email (async, non-blocking)
    if (targetUser && targetUserId !== req.user.id) {
      // Učitaj vežbe sa imenima za email
      const exercisesForEmail = [];
      for (const pe of planExercises) {
        const [exInfo] = await pool.query(`
          SELECT c.name as category_name, c.has_weight, e.icon as exercise_icon
          FROM categories c
          JOIN exercises e ON c.exercise_id = e.id
          WHERE c.id = ?
        `, [pe.category_id]);

        const [sets] = await pool.query(
          'SELECT set_number, target_reps, target_weight FROM workout_plan_sets WHERE plan_exercise_id = ? ORDER BY set_number',
          [pe.id]
        );

        exercisesForEmail.push({
          category_name: exInfo[0]?.category_name || 'Nepoznata vežba',
          has_weight: exInfo[0]?.has_weight || 0,
          exercise_icon: exInfo[0]?.exercise_icon || '',
          sets
        });
      }

      const adminName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.nickname || 'Admin';

      // Non-blocking — ne čekamo slanje
      //sendScheduleEmail(targetUser, plans[0].name, plans[0].color, scheduled_date, exercisesForEmail, adminName);
    }

    const msg = targetUser && targetUserId !== req.user.id
      ? `Trening zakazan za ${targetUser.nickname || targetUser.first_name || 'korisnika'}`
      : 'Trening zakazan';

    res.status(201).json({ id: sessionId, message: msg });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// GET /api/plans/sessions/list — sve sesije korisnika
router.get('/sessions/list', authenticate, async (req, res, next) => {
  try {
    const { status, from, to } = req.query;
    let where = 'WHERE ws.user_id = ?';
    const values = [req.user.id];

    if (status) { where += ' AND ws.status = ?'; values.push(status); }
    if (from) { where += ' AND ws.scheduled_date >= ?'; values.push(from); }
    if (to) { where += ' AND ws.scheduled_date <= ?'; values.push(to); }

    const [sessions] = await pool.query(`
      SELECT ws.*,
             COUNT(DISTINCT wse.id) as exercise_count,
             SUM(wse.is_completed) as completed_exercises,
             COUNT(DISTINCT wse.id) as total_exercises
      FROM workout_sessions ws
      LEFT JOIN workout_session_exercises wse ON wse.session_id = ws.id
      ${where}
      GROUP BY ws.id
      ORDER BY ws.scheduled_date DESC
    `, values);

    res.json(sessions);
  } catch (err) { next(err); }
});

// GET /api/plans/sessions/:sessionId — detalj sesije
router.get('/sessions/:sessionId', authenticate, async (req, res, next) => {
  try {
    const [sessions] = await pool.query(
      'SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?',
      [req.params.sessionId, req.user.id]
    );
    if (sessions.length === 0) return res.status(404).json({ error: 'Sesija nije pronađena' });

    const session = sessions[0];

    // Vežbe sa category info
    const [exercises] = await pool.query(`
      SELECT wse.id, wse.category_id, wse.order_index, wse.notes, wse.is_completed,
             c.name as category_name, c.value_type, c.has_weight,
             e.id as exercise_id, e.name as exercise_name, e.icon as exercise_icon
      FROM workout_session_exercises wse
      JOIN categories c ON wse.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE wse.session_id = ?
      ORDER BY wse.order_index ASC
    `, [session.id]);

    for (const ex of exercises) {
      const [sets] = await pool.query(
        'SELECT * FROM workout_session_sets WHERE session_exercise_id = ? ORDER BY set_number',
        [ex.id]
      );
      ex.sets = sets;
    }

    session.exercises = exercises;
    res.json(session);
  } catch (err) { next(err); }
});

// PUT /api/plans/sessions/:sessionId/start — započni sesiju
router.put('/sessions/:sessionId/start', authenticate, async (req, res, next) => {
  try {
    const [sessions] = await pool.query(
      'SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?',
      [req.params.sessionId, req.user.id]
    );
    if (sessions.length === 0) return res.status(404).json({ error: 'Sesija nije pronađena' });

    if (sessions[0].status === 'completed') {
      return res.status(400).json({ error: 'Sesija je već završena' });
    }

    await pool.query(
      'UPDATE workout_sessions SET status = ?, started_at = NOW() WHERE id = ?',
      ['in_progress', req.params.sessionId]
    );
    res.json({ message: 'Trening započet' });
  } catch (err) { next(err); }
});

// PUT /api/plans/sessions/:sessionId — ažuriraj sesiju (setove, dodaj vežbe, itd.)
router.put('/sessions/:sessionId', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.query(
      'SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?',
      [req.params.sessionId, req.user.id]
    );
    if (sessions.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Sesija nije pronađena' });
    }

    if (sessions[0].status === 'completed') {
      await conn.rollback();
      return res.status(400).json({ error: 'Sesija je već završena, ne može se menjati.' });
    }

    const { exercises, notes } = req.body;

    if (notes !== undefined) {
      await conn.query('UPDATE workout_sessions SET notes = ? WHERE id = ?', [notes, req.params.sessionId]);
    }

    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        if (ex.id) {
          // Ažuriraj postojeću vežbu
          await conn.query(
            'UPDATE workout_session_exercises SET is_completed = ?, notes = ? WHERE id = ? AND session_id = ?',
            [ex.is_completed ? 1 : 0, ex.notes || null, ex.id, req.params.sessionId]
          );

          if (ex.sets && Array.isArray(ex.sets)) {
            for (const s of ex.sets) {
              if (s.id) {
                // Ažuriraj existing set
                await conn.query(
                  'UPDATE workout_session_sets SET actual_reps = ?, actual_weight = ?, is_completed = ? WHERE id = ? AND session_exercise_id = ?',
                  [s.actual_reps != null ? parseFloat(s.actual_reps) : null,
                   s.actual_weight != null ? parseFloat(s.actual_weight) : null,
                   s.is_completed ? 1 : 0, s.id, ex.id]
                );
              } else {
                // Novi extra set
                const maxSet = await conn.query(
                  'SELECT COALESCE(MAX(set_number), 0) as max_set FROM workout_session_sets WHERE session_exercise_id = ?',
                  [ex.id]
                );
                const nextSetNum = maxSet[0][0].max_set + 1;
                await conn.query(
                  'INSERT INTO workout_session_sets (session_exercise_id, set_number, target_reps, target_weight, actual_reps, actual_weight, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [ex.id, nextSetNum, s.target_reps || null, s.target_weight || null,
                   s.actual_reps != null ? parseFloat(s.actual_reps) : null,
                   s.actual_weight != null ? parseFloat(s.actual_weight) : null,
                   s.is_completed ? 1 : 0]
                );
              }
            }
          }
        } else {
          // Nova vežba dodana tokom sesije
          const maxOrder = await conn.query(
            'SELECT COALESCE(MAX(order_index), -1) as max_idx FROM workout_session_exercises WHERE session_id = ?',
            [req.params.sessionId]
          );
          const nextOrder = maxOrder[0][0].max_idx + 1;

          const [insertSE] = await conn.query(
            'INSERT INTO workout_session_exercises (session_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)',
            [req.params.sessionId, ex.category_id, nextOrder, ex.notes || null]
          );
          const seId = insertSE.insertId;

          if (ex.sets && Array.isArray(ex.sets)) {
            for (let j = 0; j < ex.sets.length; j++) {
              const s = ex.sets[j];
              await conn.query(
                'INSERT INTO workout_session_sets (session_exercise_id, set_number, target_reps, target_weight, actual_reps, actual_weight, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [seId, j + 1, s.target_reps || null, s.target_weight || null,
                 s.actual_reps != null ? parseFloat(s.actual_reps) : null,
                 s.actual_weight != null ? parseFloat(s.actual_weight) : null,
                 s.is_completed ? 1 : 0]
              );
            }
          }
        }
      }
    }

    await conn.commit();
    res.json({ message: 'Sesija ažurirana' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// POST /api/plans/sessions/:sessionId/complete — ZAVRŠI TRENING
router.post('/sessions/:sessionId/complete', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.query(
      'SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?',
      [req.params.sessionId, req.user.id]
    );
    if (sessions.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Sesija nije pronađena' });
    }
    if (sessions[0].status === 'completed') {
      await conn.rollback();
      return res.status(400).json({ error: 'Sesija je već završena' });
    }

    const session = sessions[0];
    const attemptDate = session.started_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Učitaj sve vežbe sesije
    const [sessionExercises] = await conn.query(
      'SELECT * FROM workout_session_exercises WHERE session_id = ? ORDER BY order_index',
      [session.id]
    );

    const newRecords = [];

    for (const se of sessionExercises) {
      // Učitaj setove sa actual vrednostima
      const [sessionSets] = await conn.query(
        'SELECT * FROM workout_session_sets WHERE session_exercise_id = ? ORDER BY set_number',
        [se.id]
      );

      // Filtriraj samo completed setove sa actual_reps
      const completedSets = sessionSets.filter(s => s.is_completed && s.actual_reps != null);

      if (completedSets.length === 0) continue; // Preskoči vežbu bez urađenih setova

      // Označi vežbu kao completed
      await conn.query('UPDATE workout_session_exercises SET is_completed = 1 WHERE id = ?', [se.id]);

      // Kreiraj workout u workouts tabeli
      const [insertWorkout] = await conn.query(
        'INSERT INTO workouts (user_id, category_id, attempt_date, notes) VALUES (?, ?, ?, ?)',
        [req.user.id, se.category_id, attemptDate, se.notes || null]
      );
      const workoutId = insertWorkout.insertId;

      // Ubaci setove u workout_sets
      for (let i = 0; i < completedSets.length; i++) {
        const s = completedSets[i];
        await conn.query(
          'INSERT INTO workout_sets (workout_id, set_number, reps, weight) VALUES (?, ?, ?, ?)',
          [workoutId, i + 1, parseFloat(s.actual_reps), s.actual_weight ? parseFloat(s.actual_weight) : null]
        );
      }

      // Detekcija rekorda
      const [catRows] = await conn.query('SELECT * FROM categories WHERE id = ?', [se.category_id]);
      if (catRows.length > 0) {
        const category = catRows[0];
        let newScore;
        if (category.has_weight) {
          newScore = completedSets.reduce((sum, s) => sum + (parseFloat(s.actual_reps) * (parseFloat(s.actual_weight) || 0)), 0);
        } else {
          newScore = completedSets.reduce((sum, s) => sum + parseFloat(s.actual_reps), 0);
        }

        const scoreExpr = category.has_weight
          ? 'COALESCE(SUM(ws.reps * ws.weight), 0)'
          : 'COALESCE(SUM(ws.reps), 0)';

        const [bestRows] = await conn.query(`
          SELECT w.id, ${scoreExpr} as best_score
          FROM workouts w
          LEFT JOIN workout_sets ws ON ws.workout_id = w.id
          WHERE w.user_id = ? AND w.category_id = ? AND w.id != ?
          GROUP BY w.id
          ORDER BY best_score DESC
          LIMIT 1
        `, [req.user.id, se.category_id, workoutId]);

        if (bestRows.length === 0 || newScore > parseFloat(bestRows[0].best_score)) {
          const [exInfo] = await conn.query(`
            SELECT e.name as exercise_name, e.icon as exercise_icon, c.name as category_name
            FROM categories c JOIN exercises e ON c.exercise_id = e.id WHERE c.id = ?
          `, [se.category_id]);
          newRecords.push({
            category_id: se.category_id,
            exercise_name: exInfo[0]?.exercise_name,
            exercise_icon: exInfo[0]?.exercise_icon,
            category_name: exInfo[0]?.category_name,
            new_score: newScore,
            previous_record: bestRows.length > 0 ? parseFloat(bestRows[0].best_score) : null
          });
        }
      }
    }

    // Označi sesiju kao completed
    await conn.query(
      'UPDATE workout_sessions SET status = ?, completed_at = NOW() WHERE id = ?',
      ['completed', session.id]
    );

    await conn.commit();

    res.json({
      message: 'Trening završen!',
      new_records: newRecords
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// DELETE /api/plans/sessions/:sessionId — otkaži sesiju
router.delete('/sessions/:sessionId', authenticate, async (req, res, next) => {
  try {
    const [sessions] = await pool.query(
      'SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?',
      [req.params.sessionId, req.user.id]
    );
    if (sessions.length === 0) return res.status(404).json({ error: 'Sesija nije pronađena' });

    await pool.query('DELETE FROM workout_sessions WHERE id = ?', [req.params.sessionId]);
    res.json({ message: 'Sesija obrisana' });
  } catch (err) { next(err); }
});

module.exports = router;
