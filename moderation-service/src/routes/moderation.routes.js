// src/routes/moderation.routes.js
const express = require('express');
const { moderations, pendingSubmissions } = require('../models/database');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');
const { handleValidationErrors } = require('../middlewares/validation.middleware');
const { validateAnnonceId, validateRejet } = require('../validators/annonce.validator');
const annonceClient = require('../clients/annonceClient');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations/submit:
 *   post:
 *     summary: "[Internal] Recevoir une annonce soumise par annonce-service"
 *     description: |
 *       **Endpoint interne** appelé automatiquement par annonce-service
 *       lorsqu'un utilisateur appelle `POST /annonces/{id}/soumettre`.
 *
 *       Ne pas appeler manuellement — c'est annonce-service qui l'invoque.
 *     tags: [Moderation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [annonceId]
 *             properties:
 *               annonceId:
 *                 type: integer
 *                 example: 1
 *               titre:
 *                 type: string
 *                 example: "Voiture à vendre"
 *               description:
 *                 type: string
 *               prix:
 *                 type: number
 *               ville:
 *                 type: string
 *     responses:
 *       200:
 *         description: Annonce enregistrée dans la file de modération
 *       400:
 *         description: annonceId manquant
 */
router.post('/submit', (req, res) => {
  const { annonceId, titre, description, prix, ville } = req.body;

  if (!annonceId) {
    return res.status(400).json({ success: false, message: 'annonceId est requis.' });
  }

  const id = parseInt(annonceId);

  // Remove existing entry if re-submitted
  const existingIdx = pendingSubmissions.findIndex((s) => s.annonceId === id);
  if (existingIdx !== -1) pendingSubmissions.splice(existingIdx, 1);

  pendingSubmissions.push({
    annonceId: id,
    titre,
    description,
    prix,
    ville,
    submittedAt: new Date().toISOString(),
  });

  return res.json({
    success: true,
    message: `Annonce #${id} reçue et mise en file de modération.`,
    annonceId: id,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations:
 *   get:
 *     summary: Lister l'historique de toutes les décisions de modération
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
 *     summary: Lister les annonces en attente de décision de modération
 *     description: |
 *       Retourne les annonces soumises par annonce-service via POST /annonces/{id}/soumettre
 *       et qui n'ont pas encore été traitées.
 *     tags: [Moderation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Annonces en attente de modération
 *       403:
 *         description: Réservé aux modérateurs et admins
 */
router.get(
  '/pending',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  (req, res) => {
    return res.json({
      success: true,
      data: pendingSubmissions,
      total: pendingSubmissions.length,
      message: `${pendingSubmissions.length} annonce(s) en attente de modération.`,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /moderations/{annonceId}/approve:
 *   patch:
 *     summary: Approuver une annonce → annonce-service met le statut à PUBLIEE
 *     description: |
 *       **Workflow complet :**
 *       1. L'annonce doit d'abord être soumise via `POST /annonces/{id}/soumettre` (sur annonce-service)
 *       2. Cette action approuve l'annonce et appelle le callback `PATCH /annonces/{id}/statut` sur annonce-service
 *       3. annonce-service met le statut à **PUBLIEE**
 *       4. Vérifier avec `GET /annonces/{id}` sur annonce-service
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
 *         description: ID de l'annonce à approuver (doit avoir été soumise)
 *         example: 1
 *     responses:
 *       200:
 *         description: Annonce approuvée — statut PUBLIEE dans annonce-service
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Annonce #1 approuvée. Statut mis à jour dans annonce-service (PUBLIEE)."
 *               moderation:
 *                 annonceId: 1
 *                 action: "APPROUVEE"
 *               workflow: "EN_ATTENTE → APPROUVEE → PUBLIEE ✅"
 *       400:
 *         description: Décision déjà prise ou annonce non soumise
 *       403:
 *         description: Droits insuffisants (MODERATEUR ou ADMIN requis)
 *       404:
 *         description: Annonce non trouvée dans la file de modération
 *       502:
 *         description: annonce-service injoignable
 */
router.patch(
  '/:annonceId/approve',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  validateAnnonceId,
  handleValidationErrors,
  async (req, res) => {
    const annonceId = parseInt(req.params.annonceId);

    const submission = pendingSubmissions.find((s) => s.annonceId === annonceId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: `Annonce #${annonceId} non trouvée dans la file de modération. Elle doit d'abord être soumise via POST /annonces/${annonceId}/soumettre sur annonce-service.`,
      });
    }

    try {
      await annonceClient.updateAnnonceStatus(annonceId, 'APPROUVEE');
    } catch (error) {
      return res.status(502).json({
        success: false,
        message: `Impossible de contacter annonce-service : ${error.message}`,
      });
    }

    // Remove from pending queue
    const idx = pendingSubmissions.findIndex((s) => s.annonceId === annonceId);
    if (idx !== -1) pendingSubmissions.splice(idx, 1);

    const historique = {
      id: moderations.length + 1,
      annonceId,
      action: 'APPROUVEE',
      moderateurEmail: req.user.email,
      motif: null,
      createdAt: new Date().toISOString(),
    };
    moderations.push(historique);

    return res.json({
      success: true,
      message: `Annonce #${annonceId} approuvée. Statut mis à jour dans annonce-service (PUBLIEE).`,
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
 *     summary: Rejeter une annonce → annonce-service met le statut à REJETEE
 *     description: |
 *       **Workflow complet :**
 *       1. L'annonce doit d'abord être soumise via `POST /annonces/{id}/soumettre` (sur annonce-service)
 *       2. Cette action rejette l'annonce et appelle le callback `PATCH /annonces/{id}/statut` sur annonce-service
 *       3. annonce-service met le statut à **REJETEE** (état terminal)
 *       4. Vérifier avec `GET /annonces/{id}` sur annonce-service
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
 *             motif: "Description insuffisante."
 *     responses:
 *       200:
 *         description: Annonce rejetée — statut REJETEE dans annonce-service
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Annonce #1 rejetée. Statut mis à jour dans annonce-service (REJETEE)."
 *               workflow: "EN_ATTENTE → REJETEE ❌"
 *       403:
 *         description: Droits insuffisants
 *       404:
 *         description: Annonce non trouvée dans la file de modération
 *       502:
 *         description: annonce-service injoignable
 */
router.patch(
  '/:annonceId/reject',
  authenticateToken,
  requireRole('ADMIN', 'MODERATEUR'),
  validateRejet,
  handleValidationErrors,
  async (req, res) => {
    const annonceId = parseInt(req.params.annonceId);
    const { motif } = req.body;

    const submission = pendingSubmissions.find((s) => s.annonceId === annonceId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: `Annonce #${annonceId} non trouvée dans la file de modération.`,
      });
    }

    try {
      await annonceClient.updateAnnonceStatus(annonceId, 'REJETEE');
    } catch (error) {
      return res.status(502).json({
        success: false,
        message: `Impossible de contacter annonce-service : ${error.message}`,
      });
    }

    // Remove from pending queue
    const idx = pendingSubmissions.findIndex((s) => s.annonceId === annonceId);
    if (idx !== -1) pendingSubmissions.splice(idx, 1);

    const historique = {
      id: moderations.length + 1,
      annonceId,
      action: 'REJETEE',
      moderateurEmail: req.user.email,
      motif: motif || 'Aucun motif fourni.',
      createdAt: new Date().toISOString(),
    };
    moderations.push(historique);

    return res.json({
      success: true,
      message: `Annonce #${annonceId} rejetée. Statut mis à jour dans annonce-service (REJETEE).`,
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
 *     summary: Vérifier le statut de modération d'une annonce
 *     description: |
 *       Retourne l'historique de modération pour cette annonce.
 *       Pour le statut définitif, consulter `GET /annonces/{id}` sur annonce-service (source de vérité).
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
 *         description: Historique de modération retourné
 */
router.get('/:annonceId/status', validateAnnonceId, handleValidationErrors, (req, res) => {
  const annonceId = parseInt(req.params.annonceId);
  const historiqueAnnonce = moderations.filter((m) => m.annonceId === annonceId);
  const isPending = pendingSubmissions.some((s) => s.annonceId === annonceId);

  let statutModeration;
  if (isPending) {
    statutModeration = 'EN_ATTENTE (en file de modération)';
  } else if (historiqueAnnonce.length > 0) {
    statutModeration = historiqueAnnonce[historiqueAnnonce.length - 1].action;
  } else {
    statutModeration = 'Non soumis à modération';
  }

  return res.json({
    success: true,
    data: {
      annonceId,
      statutModeration,
      note: 'Pour le statut définitif, consulter GET /annonces/' + annonceId + ' sur annonce-service (port 8081).',
      historiqueModeration: historiqueAnnonce,
    },
  });
});

module.exports = router;
