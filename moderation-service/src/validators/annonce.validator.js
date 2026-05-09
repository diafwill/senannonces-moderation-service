// src/validators/annonce.validator.js
const { body, query, param } = require('express-validator');
const { CATEGORIES } = require('../models/database');

const VILLES_SENEGAL = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack',
  'Tambacounda', 'Mbour', 'Touba', 'Diourbel', 'Louga',
  'Kolda', 'Matam', 'Fatick', 'Kaffrine', 'Sédhiou',
  'Kédougou', 'Rufisque', 'Pikine', 'Guédiawaye', 'Autres',
];

// ─── Validation création d'annonce ───────────────────────────────────────────
const validateCreateAnnonce = [
  body('titre')
    .trim()
    .notEmpty().withMessage('Le titre est obligatoire.')
    .isLength({ min: 5, max: 100 }).withMessage('Le titre doit contenir entre 5 et 100 caractères.'),

  body('description')
    .trim()
    .notEmpty().withMessage('La description est obligatoire.')
    .isLength({ min: 10, max: 1000 }).withMessage('La description doit contenir entre 10 et 1000 caractères.'),

  body('prix')
    .notEmpty().withMessage('Le prix est obligatoire.')
    .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif.')
    .toFloat(),

  body('ville')
    .trim()
    .notEmpty().withMessage('La ville est obligatoire.')
    .isIn(VILLES_SENEGAL).withMessage(`La ville doit être une ville valide du Sénégal. Options: ${VILLES_SENEGAL.join(', ')}`),

  body('categorie')
    .trim()
    .notEmpty().withMessage('La catégorie est obligatoire.')
    .isIn(CATEGORIES).withMessage(`Catégorie invalide. Options : ${CATEGORIES.join(', ')}`),
];

// ─── Validation filtres de liste ─────────────────────────────────────────────
const validateListFilters = [
  query('ville')
    .optional()
    .trim()
    .custom((val) => {
      if (!val || VILLES_SENEGAL.includes(val)) return true;
      throw new Error('Ville de filtre invalide.');
    }),

  query('categorie')
    .optional()
    .trim()
    .custom((val) => {
      if (!val || CATEGORIES.includes(val)) return true;
      throw new Error('Catégorie de filtre invalide.');
    }),

  query('statut')
    .optional()
    .trim()
    .isIn(['EN_ATTENTE', 'APPROUVEE', 'REJETEE', 'PUBLIEE', ''])
    .withMessage('Statut invalide.'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La page doit être un entier >= 1.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('La limite doit être entre 1 et 50.')
    .toInt(),
];

// ─── Validation ID d'annonce ─────────────────────────────────────────────────
const validateAnnonceId = [
  param('annonceId')
    .notEmpty().withMessage('L\'ID de l\'annonce est requis.')
    .isInt({ min: 1 }).withMessage('L\'ID doit être un entier positif.')
    .toInt(),
];

// ─── Validation motif de rejet ────────────────────────────────────────────────
const validateRejet = [
  ...validateAnnonceId,
  body('motif')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Le motif ne peut pas dépasser 500 caractères.'),
];

module.exports = {
  validateCreateAnnonce,
  validateListFilters,
  validateAnnonceId,
  validateRejet,
  VILLES_SENEGAL,
};
