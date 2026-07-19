const express = require('express');
const cors = require('cors');
const documentsRoutes = require('./routes/documentsRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5500',
  'null'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);

// Error handler global
app.use((err, req, res, next) => {
    if (!err.status || err.status >= 500) {
        console.error('[Error]', err);
    }

    res.status(err.status || 500).json({
        error: err.message || 'Erreur interne du serveur'
    });
});

module.exports = app;
