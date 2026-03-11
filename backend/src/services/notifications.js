const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

// ======== Sve kategorije sa meta-podacima ========
const CATEGORY_META = {
  workout_plan: {
    label: "Plan treninga",
    icon: "🏋️",
    color: "#8b5cf6",
    link: "/plans",
  },
  meal_plan: {
    label: "Plan ishrane",
    icon: "🍽️",
    color: "#10b981",
    link: "/meal-plans",
  },
  nutrition: {
    label: "Ishrana",
    icon: "🥗",
    color: "#f59e0b",
    link: "/nutrition/intake",
  },
  hydration: {
    label: "Hidratacija",
    icon: "💧",
    color: "#3b82f6",
    link: "/nutrition/hydration",
  },
  sleep: {
    label: "San",
    icon: "😴",
    color: "#8b5cf6",
    link: "/metrics/sleep",
  },
  steps: {
    label: "Koraci",
    icon: "👣",
    color: "#ec4899",
    link: "/metrics/steps",
  },
  weight: {
    label: "Kilaža",
    icon: "⚖️",
    color: "#f97316",
    link: "/metrics/weight",
  },
  activity: {
    label: "Aktivnosti",
    icon: "🏃",
    color: "#14b8a6",
    link: "/activity",
  },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

// ======== Preferences ========

async function getPreferences(userId) {
  const [rows] = await pool.query(
    "SELECT category, dashboard_enabled, bell_enabled, email_enabled FROM notification_preferences WHERE user_id = ?",
    [userId],
  );

  // Merge sa default-ima (sve kategorije, default: dashboard=1, bell=1, email=0)
  const prefsMap = {};
  rows.forEach((r) => {
    prefsMap[r.category] = r;
  });

  return ALL_CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_META[cat].label,
    icon: CATEGORY_META[cat].icon,
    dashboard_enabled: prefsMap[cat] ? prefsMap[cat].dashboard_enabled : 1,
    bell_enabled: prefsMap[cat] ? prefsMap[cat].bell_enabled : 1,
    email_enabled: prefsMap[cat] ? prefsMap[cat].email_enabled : 0,
  }));
}

async function updatePreferences(userId, preferences) {
  if (!Array.isArray(preferences) || preferences.length === 0) {
    throw httpError(400, "preferences mora biti niz objekata.");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const pref of preferences) {
      if (!ALL_CATEGORIES.includes(pref.category)) continue;

      // email samo za workout_plan i meal_plan
      const emailEnabled =
        pref.category === "workout_plan" || pref.category === "meal_plan"
          ? pref.email_enabled
            ? 1
            : 0
          : 0;

      await conn.query(
        `INSERT INTO notification_preferences (user_id, category, dashboard_enabled, bell_enabled, email_enabled)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           dashboard_enabled = VALUES(dashboard_enabled),
           bell_enabled = VALUES(bell_enabled),
           email_enabled = VALUES(email_enabled)`,
        [
          userId,
          pref.category,
          pref.dashboard_enabled ? 1 : 0,
          pref.bell_enabled ? 1 : 0,
          emailEnabled,
        ],
      );
    }

    await conn.commit();
    return getPreferences(userId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ======== Notifications (bell) ========

async function getNotifications(
  userId,
  { limit = 30, offset = 0, unreadOnly = false } = {},
) {
  let sql = "SELECT * FROM notifications WHERE user_id = ?";
  const params = [userId];

  if (unreadOnly) {
    sql += " AND is_read = 0";
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getUnreadCount(userId) {
  const [[row]] = await pool.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
    [userId],
  );
  return row.count;
}

async function markAsRead(userId, notificationId) {
  const [result] = await pool.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [notificationId, userId],
  );
  if (result.affectedRows === 0) {
    throw httpError(404, "Notifikacija nije pronađena.");
  }
  return { success: true };
}

async function markAllAsRead(userId) {
  await pool.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [userId],
  );
  return { success: true };
}

async function createNotification(
  userId,
  { category, title, message, icon, color, link },
) {
  // Proveri da li korisnik ima uključen bell za ovu kategoriju
  const [prefRows] = await pool.query(
    "SELECT bell_enabled FROM notification_preferences WHERE user_id = ? AND category = ?",
    [userId, category],
  );

  // Ako nema preferenci, default je bell_enabled = 1
  const bellEnabled = prefRows.length === 0 ? 1 : prefRows[0].bell_enabled;
  if (!bellEnabled) return null;

  const meta = CATEGORY_META[category] || {};

  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, category, title, message, icon, color, link)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      category,
      title,
      message || null,
      icon || meta.icon || "🔔",
      color || meta.color || "#6366f1",
      link || meta.link || null,
    ],
  );
  return result.insertId;
}

// ======== Daily Tasks (dashboard widget) ========

async function getDailyTasks(userId) {
  // Dohvati korisničke preference za dashboard
  const [prefRows] = await pool.query(
    "SELECT category, dashboard_enabled FROM notification_preferences WHERE user_id = ?",
    [userId],
  );
  const prefMap = {};
  prefRows.forEach((r) => {
    prefMap[r.category] = r.dashboard_enabled;
  });

  // Default: dashboard_enabled = 1 za sve kategorije
  const isDashboardEnabled = (cat) =>
    prefMap[cat] === undefined ? true : Boolean(prefMap[cat]);

  const tasks = [];

  // 1. Workout plan sessions
  if (isDashboardEnabled("workout_plan")) {
    const [sessions] = await pool.query(
      `SELECT id, plan_name, status FROM workout_sessions
       WHERE user_id = ? AND scheduled_date = CURDATE()`,
      [userId],
    );
    for (const s of sessions) {
      tasks.push({
        category: "workout_plan",
        label: s.plan_name || "Plan treninga",
        icon: "🏋️",
        done: s.status === "completed",
        detail:
          s.status === "completed"
            ? "Završen"
            : s.status === "in_progress"
              ? "U toku"
              : "Zakazan",
        link: "/plans",
      });
    }
  }

  // 2. Meal plan sessions
  if (isDashboardEnabled("meal_plan")) {
    const [mealSessions] = await pool.query(
      `SELECT id, plan_name, status FROM meal_sessions
       WHERE user_id = ? AND scheduled_date = CURDATE()`,
      [userId],
    );
    for (const s of mealSessions) {
      tasks.push({
        category: "meal_plan",
        label: s.plan_name || "Plan ishrane",
        icon: "🍽️",
        done: s.status === "completed",
        detail:
          s.status === "completed"
            ? "Završen"
            : s.status === "in_progress"
              ? "U toku"
              : "Zakazan",
        link: "/meal-plans",
      });
    }
  }

  // 3. Nutrition
  if (isDashboardEnabled("nutrition")) {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM food_entries
       WHERE user_id = ? AND entry_date = CURDATE()`,
      [userId],
    );
    tasks.push({
      category: "nutrition",
      label: "Ishrana",
      icon: "🥗",
      done: cnt > 0,
      detail: cnt > 0 ? `${cnt} obrok(a) uneto` : "Nema unosa",
      link: "/nutrition/intake",
    });
  }

  // 4. Hydration
  if (isDashboardEnabled("hydration")) {
    const [[{ total_ml }]] = await pool.query(
      `SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_entries
       WHERE user_id = ? AND entry_date = CURDATE()`,
      [userId],
    );
    // Get goal
    const [[goalRow]] = await pool.query(
      `SELECT goal_ml FROM hydration_entries
       WHERE user_id = ? AND goal_ml IS NOT NULL
       ORDER BY entry_date DESC LIMIT 1`,
      [userId],
    );
    const goal = goalRow ? goalRow.goal_ml : 2500;

    tasks.push({
      category: "hydration",
      label: "Hidratacija",
      icon: "💧",
      done: total_ml >= goal,
      detail: `${total_ml}ml / ${goal}ml`,
      link: "/nutrition/hydration",
    });
  }

  // 5. Sleep
  if (isDashboardEnabled("sleep")) {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM sleep_entries
       WHERE user_id = ? AND sleep_date = CURDATE()`,
      [userId],
    );
    tasks.push({
      category: "sleep",
      label: "San",
      icon: "😴",
      done: cnt > 0,
      detail: cnt > 0 ? "Uneto" : "Nema unosa",
      link: "/metrics/sleep",
    });
  }

  // 6. Steps
  if (isDashboardEnabled("steps")) {
    const [[stepRow]] = await pool.query(
      `SELECT step_count, goal FROM step_metrics
       WHERE user_id = ? AND step_date = CURDATE()
       LIMIT 1`,
      [userId],
    );
    const stepCount = stepRow ? stepRow.step_count : 0;
    const stepGoal = stepRow ? stepRow.goal : 10000;

    tasks.push({
      category: "steps",
      label: "Koraci",
      icon: "👣",
      done: stepCount >= stepGoal,
      detail: `${stepCount} / ${stepGoal}`,
      link: "/metrics/steps",
    });
  }

  // 7. Weight (kilaža) — prikazuj samo ako nema unosa danas
  if (isDashboardEnabled("weight")) {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM weight_metrics
       WHERE user_id = ? AND DATE(metric_datetime) = CURDATE()`,
      [userId],
    );
    tasks.push({
      category: "weight",
      label: "Kilaža",
      icon: "⚖️",
      done: cnt > 0,
      detail: cnt > 0 ? "Uneto" : "Nema merenja",
      link: "/metrics/weight",
    });
  }

  // 8. Activities
  if (isDashboardEnabled("activity")) {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM activities
       WHERE user_id = ? AND DATE(performed_at) = CURDATE()`,
      [userId],
    );
    tasks.push({
      category: "activity",
      label: "Aktivnosti",
      icon: "🏃",
      done: cnt > 0,
      detail: cnt > 0 ? `${cnt} aktivnost(i)` : "Nema unosa",
      link: "/activity",
    });
  }

  return tasks;
}

// ======== Cleanup old notifications ========

async function cleanOldNotifications() {
  const [result] = await pool.query(
    "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL 30 DAY",
  );
  return result.affectedRows;
}

module.exports = {
  CATEGORY_META,
  ALL_CATEGORIES,
  getPreferences,
  updatePreferences,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  getDailyTasks,
  cleanOldNotifications,
};
