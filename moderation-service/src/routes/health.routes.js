// src/routes/health.routes.js
const express = require('express');
const { annonces, users, moderations } = require('../models/database');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérifier l'état du service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service opérationnel
 */
router.get('/', (req, res) => {
  return res.json({
    success: true,
    service: 'moderation-service',
    status: 'UP',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      totalAnnonces: annonces.length,
      totalUtilisateurs: users.length,
      totalModerations: moderations.length,
      annoncesByStatut: {
        EN_ATTENTE: annonces.filter((a) => a.statut === 'EN_ATTENTE').length,
        APPROUVEE: annonces.filter((a) => a.statut === 'APPROUVEE').length,
        PUBLIEE: annonces.filter((a) => a.statut === 'PUBLIEE').length,
        REJETEE: annonces.filter((a) => a.statut === 'REJETEE').length,
      },
    },
  });
});

module.exports = router;
