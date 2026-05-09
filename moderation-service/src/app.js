// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth.routes');
const annoncesRoutes = require('./routes/annonces.routes');
const moderationRoutes = require('./routes/moderation.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// ─── Middlewares globaux ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Documentation Swagger ────────────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'SenAnnonces - Moderation API',
    customCss: `
      .swagger-ui .topbar { background-color: #1a472a; }
      .swagger-ui .topbar-wrapper .link { color: white; }
      .swagger-ui .info .title { color: #1a472a; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
    },
  })
);

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/annonces', annoncesRoutes);
app.use('/moderations', moderationRoutes);

// ─── Route racine ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: '📢 SenAnnonces - Moderation Service',
    version: '1.0.0',
    documentation: `http://localhost:${process.env.PORT || 3001}/api-docs`,
    endpoints: {
      health: '/health',
      auth: '/auth (POST /login, POST /register, GET /me)',
      annonces: '/annonces (GET, POST, GET /:id, POST /:id/soumettre, PATCH /:id/publier)',
      moderation: '/moderations (GET /pending, PATCH /:id/approve, PATCH /:id/reject, GET /:id/status)',
    },
  });
});

// ─── Gestion des erreurs 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} introuvable.`,
    documentation: `http://localhost:${process.env.PORT || 3001}/api-docs`,
  });
});

// ─── Gestion des erreurs globales ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Erreur non gérée :', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

module.exports = app;
