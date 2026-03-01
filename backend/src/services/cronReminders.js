const pool = require("../db/connection");
const notificationService = require("./notifications");
const { CATEGORY_META } = require("./notifications");
const { sendDailyReminderEmail } = require("../helpers/email");

/**
 * Glavna cron funkcija — poziva se iz node-cron ili cPanel endpoint-a.
 * Generiše dnevne notifikacije (bell) za sve korisnike i šalje email za planove.
 */
async function processReminders() {
  const startTime = Date.now();
  let notificationsCreated = 0;
  let emailsSent = 0;

  try {
    // Dohvati sve aktivne, odobrene korisnike
    const [users] = await pool.query(
      "SELECT id, first_name, last_name, nickname, email FROM users WHERE is_approved = 1",
    );

    for (const user of users) {
      try {
        await processUserReminders(user);
        notificationsCreated++;
      } catch (err) {
        console.error(
          `Greška pri obradi notifikacija za korisnika ${user.id}:`,
          err.message,
        );
      }

      try {
        const sent = await processUserEmails(user);
        emailsSent += sent;
      } catch (err) {
        console.error(
          `Greška pri slanju emaila za korisnika ${user.id}:`,
          err.message,
        );
      }
    }

    // Cleanup starih notifikacija
    const cleaned = await notificationService.cleanOldNotifications();

    const duration = Date.now() - startTime;
    console.log(
      `[CRON] Završeno: ${users.length} korisnika, ${notificationsCreated} obrađeno, ${emailsSent} emailova, ${cleaned} obrisanih starih. Trajanje: ${duration}ms`,
    );

    return {
      users: users.length,
      notificationsCreated,
      emailsSent,
      oldCleaned: cleaned,
      durationMs: duration,
    };
  } catch (err) {
    console.error("[CRON] Fatalna greška:", err.message);
    throw err;
  }
}

/**
 * Generiše bell notifikacije za jednog korisnika za danas.
 */
async function processUserReminders(user) {
  const userId = user.id;

  // Dohvati preference
  const [prefRows] = await pool.query(
    "SELECT category, bell_enabled FROM notification_preferences WHERE user_id = ?",
    [userId],
  );
  const prefMap = {};
  prefRows.forEach((r) => {
    prefMap[r.category] = r.bell_enabled;
  });

  const isBellEnabled = (cat) =>
    prefMap[cat] === undefined ? true : Boolean(prefMap[cat]);

  // Proveri koje notifikacije su već generisane danas
  const [existingNotifs] = await pool.query(
    `SELECT category FROM notifications
     WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
    [userId],
  );
  const alreadySent = new Set(existingNotifs.map((n) => n.category));

  // ---- workout_schedule ----
  if (
    isBellEnabled("workout_schedule") &&
    !alreadySent.has("workout_schedule")
  ) {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM scheduled_workouts
       WHERE user_id = ? AND scheduled_date = CURDATE() AND is_completed = 0`,
      [userId],
    );
    if (cnt > 0) {
      await notificationService.createNotification(userId, {
        category: "workout_schedule",
        title: `Danas imaš ${cnt} zakazan(ih) treninga`,
        message: "Otvori kalendar da vidiš raspored.",
        icon: CATEGORY_META.workout_schedule.icon,
        color: CATEGORY_META.workout_schedule.color,
        link: "/calendar",
      });
    }
  }

  // ---- workout_plan ----
  if (isBellEnabled("workout_plan") && !alreadySent.has("workout_plan")) {
    const [sessions] = await pool.query(
      `SELECT plan_name FROM workout_sessions
       WHERE user_id = ? AND scheduled_date = CURDATE() AND status = 'scheduled'`,
      [userId],
    );
    if (sessions.length > 0) {
      const names = sessions.map((s) => s.plan_name).join(", ");
      await notificationService.createNotification(userId, {
        category: "workout_plan",
        title: `Plan treninga zakazan za danas`,
        message: names,
        icon: CATEGORY_META.workout_plan.icon,
        color: CATEGORY_META.workout_plan.color,
        link: "/plans",
      });
    }
  }

  // ---- meal_plan ----
  if (isBellEnabled("meal_plan") && !alreadySent.has("meal_plan")) {
    const [mealSessions] = await pool.query(
      `SELECT plan_name FROM meal_sessions
       WHERE user_id = ? AND scheduled_date = CURDATE() AND status = 'scheduled'`,
      [userId],
    );
    if (mealSessions.length > 0) {
      const names = mealSessions.map((s) => s.plan_name).join(", ");
      await notificationService.createNotification(userId, {
        category: "meal_plan",
        title: `Plan ishrane zakazan za danas`,
        message: names,
        icon: CATEGORY_META.meal_plan.icon,
        color: CATEGORY_META.meal_plan.color,
        link: "/meal-plans",
      });
    }
  }

  // ---- nutrition ----
  if (isBellEnabled("nutrition") && !alreadySent.has("nutrition")) {
    await notificationService.createNotification(userId, {
      category: "nutrition",
      title: "Ne zaboravi da uneseš obroke danas",
      message: "Prati ishranu da dostigneš ciljeve.",
      icon: CATEGORY_META.nutrition.icon,
      color: CATEGORY_META.nutrition.color,
      link: "/nutrition",
    });
  }

  // ---- hydration ----
  if (isBellEnabled("hydration") && !alreadySent.has("hydration")) {
    const [[goalRow]] = await pool.query(
      `SELECT goal_ml FROM hydration_entries
       WHERE user_id = ? AND goal_ml IS NOT NULL
       ORDER BY entry_date DESC LIMIT 1`,
      [userId],
    );
    const goal = goalRow ? goalRow.goal_ml : 2500;
    await notificationService.createNotification(userId, {
      category: "hydration",
      title: `Pij vodu! Cilj: ${goal}ml`,
      message: "Hidracija je ključ za zdrav dan.",
      icon: CATEGORY_META.hydration.icon,
      color: CATEGORY_META.hydration.color,
      link: "/hydration",
    });
  }

  // ---- sleep ----
  if (isBellEnabled("sleep") && !alreadySent.has("sleep")) {
    await notificationService.createNotification(userId, {
      category: "sleep",
      title: "Unesi podatke o sinoćnjem snu",
      message: "Prati kvalitet sna za bolje rezultate.",
      icon: CATEGORY_META.sleep.icon,
      color: CATEGORY_META.sleep.color,
      link: "/sleep",
    });
  }

  // ---- steps ----
  if (isBellEnabled("steps") && !alreadySent.has("steps")) {
    const [[stepRow]] = await pool.query(
      `SELECT goal FROM step_metrics
       WHERE user_id = ? ORDER BY step_date DESC LIMIT 1`,
      [userId],
    );
    const stepGoal = stepRow ? stepRow.goal : 10000;
    await notificationService.createNotification(userId, {
      category: "steps",
      title: `Unesi korake — cilj: ${stepGoal}`,
      message: "Svaki korak se računa!",
      icon: CATEGORY_META.steps.icon,
      color: CATEGORY_META.steps.color,
      link: "/steps",
    });
  }

  // ---- weight ----
  if (isBellEnabled("weight") && !alreadySent.has("weight")) {
    // Samo ako nema unosa u poslednjih 7 dana
    const [[{ recent }]] = await pool.query(
      `SELECT COUNT(*) AS recent FROM weight_metrics
       WHERE user_id = ? AND metric_datetime >= NOW() - INTERVAL 7 DAY`,
      [userId],
    );
    if (recent === 0) {
      await notificationService.createNotification(userId, {
        category: "weight",
        title: "Unesi merenje kilaže",
        message: "Nema merenja u poslednjih 7 dana.",
        icon: CATEGORY_META.weight.icon,
        color: CATEGORY_META.weight.color,
        link: "/metrics",
      });
    }
  }

  // ---- activity ----
  if (isBellEnabled("activity") && !alreadySent.has("activity")) {
    await notificationService.createNotification(userId, {
      category: "activity",
      title: "Unesi današnju aktivnost",
      message: "Trčanje, vožnja bicikla, plivanje...",
      icon: CATEGORY_META.activity.icon,
      color: CATEGORY_META.activity.color,
      link: "/activities",
    });
  }
}

/**
 * Šalje email podsetnike za zakazane planove (workout_plan, meal_plan).
 * Vraća broj poslatih emailova.
 */
async function processUserEmails(user) {
  const userId = user.id;
  let sent = 0;

  // Proveri email preference
  const [prefRows] = await pool.query(
    `SELECT category, email_enabled FROM notification_preferences
     WHERE user_id = ? AND category IN ('workout_plan', 'meal_plan') AND email_enabled = 1`,
    [userId],
  );

  if (prefRows.length === 0) return 0;

  const emailCategories = new Set(prefRows.map((r) => r.category));

  // Workout plan email
  if (emailCategories.has("workout_plan")) {
    const [sessions] = await pool.query(
      `SELECT ws.id, ws.plan_name, ws.scheduled_date, wp.color AS plan_color
       FROM workout_sessions ws
       LEFT JOIN workout_plans wp ON ws.plan_id = wp.id
       WHERE ws.user_id = ? AND ws.scheduled_date = CURDATE() AND ws.status = 'scheduled'`,
      [userId],
    );

    for (const session of sessions) {
      // Proveri da li je email za ovu sesiju već poslat (koristimo notifications tabelu)
      const [[{ emailSent }]] = await pool.query(
        `SELECT COUNT(*) AS emailSent FROM notifications
         WHERE user_id = ? AND category = 'workout_plan'
         AND DATE(created_at) = CURDATE()
         AND message LIKE CONCAT('%', ?, '%')
         AND link = '/plans'`,
        [userId, `email:${session.id}`],
      );

      if (emailSent > 0) continue;

      // Dohvati vežbe sa setovima za email
      const [exercises] = await pool.query(
        `SELECT wse.category_id, c.name AS category_name, c.has_weight,
                e.icon AS exercise_icon, e.name AS exercise_name
         FROM workout_session_exercises wse
         JOIN categories c ON wse.category_id = c.id
         JOIN exercises e ON c.exercise_id = e.id
         WHERE wse.session_id = ?
         ORDER BY wse.order_index`,
        [session.id],
      );

      const exercisesWithSets = [];
      for (const ex of exercises) {
        const [sets] = await pool.query(
          `SELECT set_number, target_reps, target_weight
           FROM workout_session_sets wss
           JOIN workout_session_exercises wse ON wss.session_exercise_id = wse.id
           WHERE wse.session_id = ? AND wse.category_id = ?
           ORDER BY set_number`,
          [session.id, ex.category_id],
        );
        exercisesWithSets.push({ ...ex, sets });
      }

      try {
        await sendDailyReminderEmail(
          user,
          session.plan_name,
          session.plan_color,
          session.scheduled_date,
          exercisesWithSets,
          "cron",
        );
        sent++;
      } catch (err) {
        console.error(`Greška pri slanju workout email-a:`, err.message);
      }
    }
  }

  // Meal plan email
  if (emailCategories.has("meal_plan")) {
    const [mealSessions] = await pool.query(
      `SELECT ms.id, ms.plan_name, ms.scheduled_date, mp.color AS plan_color
       FROM meal_sessions ms
       LEFT JOIN meal_plans mp ON ms.plan_id = mp.id
       WHERE ms.user_id = ? AND ms.scheduled_date = CURDATE() AND ms.status = 'scheduled'`,
      [userId],
    );

    for (const session of mealSessions) {
      const [[{ emailSent }]] = await pool.query(
        `SELECT COUNT(*) AS emailSent FROM notifications
         WHERE user_id = ? AND category = 'meal_plan'
         AND DATE(created_at) = CURDATE()
         AND message LIKE CONCAT('%', ?, '%')
         AND link = '/meal-plans'`,
        [userId, `email:${session.id}`],
      );

      if (emailSent > 0) continue;

      const [meals] = await pool.query(
        `SELECT msm.id, msm.meal_type, msm.order_index
         FROM meal_session_meals msm
         WHERE msm.session_id = ?
         ORDER BY msm.order_index`,
        [session.id],
      );

      const mealsWithItems = [];
      for (const meal of meals) {
        const [items] = await pool.query(
          `SELECT msi.food_item_id, msi.custom_name, msi.amount_grams,
                  msi.kcal_per_100g, msi.protein_per_100g, msi.carbs_per_100g, msi.fat_per_100g,
                  fi.name AS food_item_name
           FROM meal_session_items msi
           LEFT JOIN food_items fi ON msi.food_item_id = fi.id
           WHERE msi.session_meal_id = ?`,
          [meal.id],
        );
        mealsWithItems.push({ meal_type: meal.meal_type, items });
      }

      try {
        const { sendMealScheduleEmail } = require("../helpers/email");
        await sendMealScheduleEmail(
          user,
          session.plan_name,
          session.plan_color,
          session.scheduled_date,
          mealsWithItems,
          "Automatski podsetnik",
        );
        sent++;
      } catch (err) {
        console.error(`Greška pri slanju meal email-a:`, err.message);
      }
    }
  }

  return sent;
}

module.exports = {
  processReminders,
};
