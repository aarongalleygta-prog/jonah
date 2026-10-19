require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const migrate = require('./config/migrate');
const authRoutes = require('./routes/auth');
const emergencyRoutes = require('./routes/emergencies');
const statsRoutes = require('./routes/stats');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add it in your Railway service Variables.');
  process.exit(1);
}

const app = express();

// Railway sits behind a proxy; this makes req.ip / protocol correct.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Serve the frontend as static files so the whole app runs from one server
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/stats', statsRoutes);

// Health check — used by Railway to confirm the deploy is up
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Emergency Response API is running.' });
});

// Unknown API routes should return JSON, not the HTML page
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Fallback: any other unknown route serves the frontend's index page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;

migrate()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Smart Emergency Response server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not initialise the database:', err);
    process.exit(1);
  });
