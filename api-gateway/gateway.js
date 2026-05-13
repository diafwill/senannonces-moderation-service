// api-gateway/gateway.js
require('dotenv').config({ path: '../moderation-service/.env' });
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const GATEWAY_PORT = process.env.GATEWAY_PORT || 3000;

// ─── URLs des microservices ───────────────────────────────────────────────────
const SERVICES = {
  annonce:    process.env.ANNONCE_SERVICE_URL    || 'http://localhost:8080',  // Spring Boot
  moderation: `http://localhost:${process.env.PORT || 3001}`,                // Node.js
};

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});

// ─── Middlewares globaux ─────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(limiter);

// ─── Logging des requêtes ────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${req.method} ${req.path} → Routage en cours...`);
  next();
});

// ─── Route racine du Gateway ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'SenAnnonces - API Gateway',
    version: '1.0.0',
    routes: {
      '/annonces-service/*': `→ Annonce Service (Spring Boot) : ${SERVICES.annonce}`,
      '/moderation/*':       `→ Moderation Service (Node.js)  : ${SERVICES.moderation}`,
      '/health':             `→ État du Gateway`,
    },
    documentation: {
      moderationSwagger: `${SERVICES.moderation}/api-docs`,
    },
  });
});

// ─── Health du Gateway ───────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    gateway: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      annonceService:    { url: SERVICES.annonce,     status: 'configuré' },
      moderationService: { url: SERVICES.moderation,  status: 'configuré' },
    },
  });
});

// ─── Proxy → Annonce Service (Spring Boot) ────────────────────────────────────
app.use(
  '/annonces-service',
  createProxyMiddleware({
    target: SERVICES.annonce,
    changeOrigin: true,
    pathRewrite: { '^/annonces-service': '' },
    on: {
      error: (err, req, res) => {
        console.error('[GATEWAY] Annonce Service indisponible :', err.message);
        res.status(503).json({
          success: false,
          message: 'Annonce Service (Spring Boot) indisponible.',
          hint: `Vérifiez que le service tourne sur ${SERVICES.annonce}`,
        });
      },
    },
  })
);

// ─── Proxy → Moderation Service (Node.js) ────────────────────────────────────
app.use(
  '/moderation',
  createProxyMiddleware({
    target: SERVICES.moderation,
    changeOrigin: true,
    pathRewrite: { '^/moderation': '' },
    on: {
      error: (err, req, res) => {
        console.error('[GATEWAY] Moderation Service indisponible :', err.message);
        res.status(503).json({
          success: false,
          message: 'Moderation Service (Node.js) indisponible.',
          hint: `Vérifiez que le service tourne sur ${SERVICES.moderation}`,
        });
      },
    },
  })
);

// ─── 404 Gateway ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} inconnue du Gateway.`,
    routesDisponibles: ['/annonces-service/*', '/moderation/*', '/health'],
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(GATEWAY_PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║           SenAnnonces - API Gateway               ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║    Gateway démarré sur le port ${GATEWAY_PORT}             ║`);
  console.log(`║  /annonces-service/* → Spring Boot :8080             ║`);
  console.log(`║  /moderation/*       → Node.js     :3001             ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
});

module.exports = app;
