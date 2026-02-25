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
const scheduleRouter = require("./routes/schedule");
const calendarRouter = require("./routes/calendar");
const analyticsRouter = require("./routes/analytics");
const foodsRouter = require("./routes/foods");
const nutritionRouter = require("./routes/nutrition");
const nutritionAnalyticsRouter = require("./routes/nutritionAnalytics");
const metricsRouter = require("./routes/metrics");
const activityTypesRouter = require("./routes/activityTypes");
const activitiesRouter = require("./routes/activities");
const activityAnalyticsRouter = require("./routes/activityAnalytics");
const contactRouter = require("./routes/contact");
const plansRouter = require("./routes/plans");
const stepsRouter = require("./routes/steps");
const hydrationRouter = require("./routes/hydration");

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
app.use("/api/schedule", scheduleRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/nutrition-analytics", nutritionAnalyticsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/activity-types", activityTypesRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/activity-analytics", activityAnalyticsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/plans", plansRouter);
app.use("/api/steps", stepsRouter);
app.use("/api/hydration", hydrationRouter);

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

app.listen(PORT, () => {
  console.log(`🏋️ Fitness Records API running on http://localhost:${PORT}`);
});
