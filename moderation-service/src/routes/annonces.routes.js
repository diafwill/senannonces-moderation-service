// src/routes/annonces.routes.js
const express = require('express');
const { annonces, STATUTS, CATEGORIES, getNextId } = require('../models/database');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { handleValidationErrors } = require('../middlewares/validation.middleware');
const {
  validateCreateAnnonce,
  validateListFilters,
  validateAnnonceId,
} = require('../validators/annonce.validator');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /annonces:
 *   get:
 *     summary: Lister les annonces avec filtres optionnels
 *     tags: [Annonces]
 *     parameters:
 *       - in: query
 *         name: ville
 *         schema:
 *           type: string
 *         description: "Filtrer par ville (ex: Dakar)"
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *         description: "Filtrer par categorie (ex: Vehicules)"
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [EN_ATTENTE, APPROUVEE, REJETEE, PUBLIEE]
 *         description: Filtrer par statut
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numero de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: "Nombre de resultats par page (max 50)"
 *     responses:
 *       200:
 *         description: Liste des annonces
 */
router.get('/', validateListFilters, handleValidationErrors, (req, res) => {
  let { ville, categorie, statut, page = 1, limit = 10 } = req.query;

  let result = [...annonces];

  if (ville) result = result.filter((a) => a.ville.toLowerCase() === ville.toLowerCase());
  if (categorie) result = result.filter((a) => a.categorie === categorie);
  if (statut) result = result.filter((a) => a.statut === statut);

  // Tri par date de création décroissante
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const total = result.length;
  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + Number(limit));

  return res.json({
    success: true,
    data: paginated,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
    filtresAppliqués: { ville: ville || null, categorie: categorie || null, statut: statut || null },
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /annonces/{id}:
 *   get:
 *     summary: Voir le détail d'une annonce
 *     tags: [Annonces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détail de l'annonce
 *       404:
 *         description: Annonce introuvable
 */
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const annonce = annonces.find((a) => a.id === id);
  if (!annonce) {
    return res.status(404).json({ success: false, message: `Annonce #${id} introuvable.` });
  }
  return res.json({ success: true, data: annonce });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /annonces:
 *   post:
 *     summary: Créer une nouvelle annonce
 *     tags: [Annonces]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnnonceInput'
 *           example:
 *             titre: "Voiture Toyota Yaris à vendre"
 *             description: "Très bon état, 80 000 km, entretien régulier, climatisée."
 *             prix: 4500000
 *             ville: "Dakar"
 *             categorie: "Véhicules"
 *     responses:
 *       201:
 *         description: Annonce créée avec statut EN_ATTENTE
 *       401:
 *         description: Non authentifié
 *       422:
 *         description: Données invalides
 */
router.post('/', authenticateToken, validateCreateAnnonce, handleValidationErrors, (req, res) => {
  const { titre, description, prix, ville, categorie } = req.body;

  const newAnnonce = {
    id: getNextId(),
    titre,
    description,
    prix,
    ville,
    categorie,
    statut: STATUTS.EN_ATTENTE,
    proprietaireEmail: req.user.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  annonces.push(newAnnonce);

  return res.status(201).json({
    success: true,
    message: 'Annonce créée avec succès. Statut : EN_ATTENTE.',
    data: newAnnonce,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /annonces/{id}/soumettre:
 *   post:
 *     summary: Soumettre une annonce à la modération
 *     tags: [Annonces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Annonce soumise à la modération
 *       403:
 *         description: Vous n'êtes pas le propriétaire
 *       404:
 *         description: Annonce introuvable
 */
router.post('/:id/soumettre', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const annonce = annonces.find((a) => a.id === id);

  if (!annonce) {
    return res.status(404).json({ success: false, message: `Annonce #${id} introuvable.` });
  }
  if (annonce.proprietaireEmail !== req.user.email && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Vous n\'êtes pas le propriétaire de cette annonce.' });
  }
  if (annonce.statut !== STATUTS.EN_ATTENTE) {
    return res.status(400).json({
      success: false,
      message: `Impossible de soumettre. Statut actuel : ${annonce.statut}. Seules les annonces EN_ATTENTE peuvent être soumises.`,
    });
  }

  annonce.updatedAt = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Annonce soumise à la modération. Un modérateur va l\'examiner.',
    data: annonce,
    prochainStep: 'Un modérateur va approuver ou rejeter cette annonce via PATCH /moderations/{id}/approve ou /reject',
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /annonces/{id}/publier:
 *   patch:
 *     summary: Publier une annonce approuvée (Admin uniquement)
 *     tags: [Annonces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Annonce publiée
 *       403:
 *         description: Droits insuffisants
 *       400:
 *         description: L'annonce doit être APPROUVEE pour être publiée
 */
router.patch('/:id/publier', authenticateToken, (req, res) => {
  if (!['ADMIN', 'MODERATEUR'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Seuls les admins et modérateurs peuvent publier des annonces.' });
  }

  const id = parseInt(req.params.id);
  const annonce = annonces.find((a) => a.id === id);

  if (!annonce) {
    return res.status(404).json({ success: false, message: `Annonce #${id} introuvable.` });
  }
  if (annonce.statut !== STATUTS.APPROUVEE) {
    return res.status(400).json({
      success: false,
      message: `L'annonce doit être APPROUVEE pour être publiée. Statut actuel : ${annonce.statut}.`,
    });
  }

  annonce.statut = STATUTS.PUBLIEE;
  annonce.updatedAt = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Annonce publiée avec succès.',
    data: annonce,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /annonces/meta/categories:
 *   get:
 *     summary: Lister toutes les catégories disponibles
 *     tags: [Annonces]
 *     responses:
 *       200:
 *         description: Liste des catégories
 */
router.get('/meta/categories', (req, res) => {
  return res.json({ success: true, data: CATEGORIES });
});

module.exports = router;
