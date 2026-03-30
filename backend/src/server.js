require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const usersRouter = require("./routes/users");
const exercisesRouter = require("./routes/exercises");
const categoriesRouter = require("./routes/categories");
const resultsRouter = require("./routes/results");
const leaderboardRouter = require("./routes/leaderboard");
const authRouter = require("./routes/auth");
const calendarRouter = require("./routes/calendar");
const analyticsRouter = require("./routes/analytics");
const foodsRouter = require("./routes/foods");
const nutritionRouter = require("./routes/nutrition");
const nutritionAnalyticsRouter = require("./routes/nutritionAnalytics");
const metricsRouter = require("./routes/metrics");
const activityTypesRouter = require("./routes/activityTypes");
const activitiesRouter = require("./routes/activities");
const activityAnalyticsRouter = require("./routes/activityAnalytics");
const activityPlansRouter = require("./routes/activityPlans");
const contactRouter = require("./routes/contact");
const plansRouter = require("./routes/plans");
const mealPlansRouter = require("./routes/mealPlans");
const stepsRouter = require("./routes/steps");
const hydrationRouter = require("./routes/hydration");
const sleepRouter = require("./routes/sleep");
const medicalEventsRouter = require("./routes/medicalEvents");
const notificationsRouter = require("./routes/notifications");
const cronRouter = require("./routes/cron");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/results", resultsRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/nutrition-analytics", nutritionAnalyticsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/activity-types", activityTypesRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/activity-analytics", activityAnalyticsRouter);
app.use("/api/activity-plans", activityPlansRouter);
app.use("/api/contact", contactRouter);
app.use("/api/plans", plansRouter);
app.use("/api/meal-plans", mealPlansRouter);
app.use("/api/steps", stepsRouter);
app.use("/api/hydration", hydrationRouter);
app.use("/api/sleep", sleepRouter);
app.use("/api/medical-events", medicalEventsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/cron", cronRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Optional node-cron scheduler (fallback za cPanel cron)
if (process.env.ENABLE_NODE_CRON === "true") {
  try {
    const cron = require("node-cron");
    const { processReminders } = require("./services/cronReminders");
    // Svaki dan u 7:30 ujutru (Europe/Belgrade)
    cron.schedule(
      "30 7 * * *",
      async () => {
        console.log("[node-cron] Pokrenuti dnevni podsetnici...");
        try {
          await processReminders();
        } catch (err) {
          console.error("[node-cron] Greška:", err.message);
        }
      },
      { timezone: "Europe/Belgrade" },
    );
    console.log(
      "📅 node-cron zakazan: dnevni podsetnici u 07:30 (Europe/Belgrade)",
    );
  } catch (err) {
    console.warn("node-cron nije dostupan:", err.message);
  }
}

app.listen(PORT, () => {
  console.log(`🏋️ Fitness Records API running on http://localhost:${PORT}`);
});
