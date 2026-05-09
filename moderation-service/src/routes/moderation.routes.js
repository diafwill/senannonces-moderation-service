// src/routes/moderation.routes.js
const express = require('express');
const { annonces, moderations, STATUTS } = require('../models/database');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');
const { handleValidationErrors } = require('../middlewares/validation.middleware');
const { validateAnnonceId, validateRejet } = require('../validators/annonce.validator');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations:
 *   get:
 *     summary: Lister l'historique de toutes les modérations
 *     tags: [Moderation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Historique de modération
 *       403:
 *         description: Réservé aux modérateurs et admins
 */
router.get(
  '/',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  (req, res) => {
    return res.json({
      success: true,
      data: moderations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      total: moderations.length,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations/pending:
 *   get:
 *     summary: Lister les annonces en attente de modération
 *     tags: [Moderation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Annonces EN_ATTENTE
 *       403:
 *         description: Réservé aux modérateurs et admins
 */
router.get(
  '/pending',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  (req, res) => {
    const pending = annonces.filter((a) => a.statut === STATUTS.EN_ATTENTE);
    return res.json({
      success: true,
      data: pending,
      total: pending.length,
      message: `${pending.length} annonce(s) en attente de modération.`,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations/{annonceId}/approve:
 *   patch:
 *     summary: Approuver une annonce → statut devient APPROUVEE puis PUBLIEE
 *     description: |
 *       **Workflow :** EN_ATTENTE → APPROUVEE → PUBLIEE automatiquement
 *       
 *       Seuls les modérateurs et admins peuvent effectuer cette action.
 *     tags: [Moderation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: annonceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'annonce à approuver
 *         example: 1
 *     responses:
 *       200:
 *         description: Annonce approuvée et publiée automatiquement
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Annonce #1 approuvée et publiée avec succès."
 *               data:
 *                 id: 1
 *                 statut: "PUBLIEE"
 *       400:
 *         description: L'annonce n'est pas EN_ATTENTE
 *       403:
 *         description: Droits insuffisants (MODERATEUR ou ADMIN requis)
 *       404:
 *         description: Annonce introuvable
 */
router.patch(
  '/:annonceId/approve',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  validateAnnonceId,
  handleValidationErrors,
  (req, res) => {
    const { annonceId } = req.params;
    const annonce = annonces.find((a) => a.id === parseInt(annonceId));

    if (!annonce) {
      return res.status(404).json({ success: false, message: `Annonce #${annonceId} introuvable.` });
    }

    if (annonce.statut !== STATUTS.EN_ATTENTE) {
      return res.status(400).json({
        success: false,
        message: `Impossible d'approuver. Statut actuel : ${annonce.statut}. Seules les annonces EN_ATTENTE peuvent être approuvées.`,
      });
    }

    // Workflow : EN_ATTENTE → APPROUVEE → PUBLIEE (automatique)
    annonce.statut = STATUTS.APPROUVEE;
    annonce.updatedAt = new Date().toISOString();

    // Publication automatique après approbation
    annonce.statut = STATUTS.PUBLIEE;
    annonce.updatedAt = new Date().toISOString();

    // Enregistrement dans l'historique
    const historique = {
      id: moderations.length + 1,
      annonceId: annonce.id,
      action: 'APPROUVEE',
      moderateurEmail: req.user.email,
      motif: null,
      createdAt: new Date().toISOString(),
    };
    moderations.push(historique);

    return res.json({
      success: true,
      message: `Annonce #${annonceId} approuvée et publiée avec succès.`,
      data: annonce,
      moderation: historique,
      workflow: 'EN_ATTENTE → APPROUVEE → PUBLIEE ✅',
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations/{annonceId}/reject:
 *   patch:
 *     summary: Rejeter une annonce → statut reste REJETEE
 *     description: |
 *       **Workflow :** EN_ATTENTE → REJETEE (définitif)
 *       
 *       Un motif de rejet peut être fourni optionnellement.
 *     tags: [Moderation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: annonceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'annonce à rejeter
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationInput'
 *           example:
 *             motif: "Description insuffisante ou prix non conforme."
 *     responses:
 *       200:
 *         description: Annonce rejetée — statut REJETEE confirmé
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Annonce #1 rejetée."
 *               data:
 *                 id: 1
 *                 statut: "REJETEE"
 *       400:
 *         description: L'annonce n'est pas EN_ATTENTE
 *       403:
 *         description: Droits insuffisants
 *       404:
 *         description: Annonce introuvable
 */
router.patch(
  '/:annonceId/reject',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  validateRejet,
  handleValidationErrors,
  (req, res) => {
    const { annonceId } = req.params;
    const { motif } = req.body;
    const annonce = annonces.find((a) => a.id === parseInt(annonceId));

    if (!annonce) {
      return res.status(404).json({ success: false, message: `Annonce #${annonceId} introuvable.` });
    }

    if (annonce.statut !== STATUTS.EN_ATTENTE) {
      return res.status(400).json({
        success: false,
        message: `Impossible de rejeter. Statut actuel : ${annonce.statut}. Seules les annonces EN_ATTENTE peuvent être rejetées.`,
      });
    }

    // Workflow : EN_ATTENTE → REJETEE (définitif)
    annonce.statut = STATUTS.REJETEE;
    annonce.updatedAt = new Date().toISOString();

    // Enregistrement dans l'historique
    const historique = {
      id: moderations.length + 1,
      annonceId: annonce.id,
      action: 'REJETEE',
      moderateurEmail: req.user.email,
      motif: motif || 'Aucun motif fourni.',
      createdAt: new Date().toISOString(),
    };
    moderations.push(historique);

    return res.json({
      success: true,
      message: `Annonce #${annonceId} rejetée. Statut définitif : REJETEE.`,
      data: annonce,
      moderation: historique,
      workflow: 'EN_ATTENTE → REJETEE ❌',
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations/{annonceId}/status:
 *   get:
 *     summary: Vérifier le statut actuel d'une annonce
 *     tags: [Moderation]
 *     parameters:
 *       - in: path
 *         name: annonceId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Statut retourné
 *       404:
 *         description: Annonce introuvable
 */
router.get('/:annonceId/status', validateAnnonceId, handleValidationErrors, (req, res) => {
  const { annonceId } = req.params;
  const annonce = annonces.find((a) => a.id === parseInt(annonceId));

  if (!annonce) {
    return res.status(404).json({ success: false, message: `Annonce #${annonceId} introuvable.` });
  }

  const historiqueAnnonce = moderations.filter((m) => m.annonceId === annonce.id);

  return res.json({
    success: true,
    data: {
      annonceId: annonce.id,
      titre: annonce.titre,
      statut: annonce.statut,
      updatedAt: annonce.updatedAt,
      historiqueModeration: historiqueAnnonce,
    },
  });
});

module.exports = router;
