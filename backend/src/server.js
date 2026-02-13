require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const usersRouter = require('./routes/users');
const exercisesRouter = require('./routes/exercises');
const categoriesRouter = require('./routes/categories');
const resultsRouter = require('./routes/results');
const leaderboardRouter = require('./routes/leaderboard');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🏋️ Fitness Records API running on http://localhost:${PORT}`);
});
