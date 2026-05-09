// src/validators/auth.validator.js
const { body } = require('express-validator');

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est obligatoire.')
    .isEmail().withMessage('L\'email doit être valide.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Le mot de passe est obligatoire.')
    .isLength({ min: 4 }).withMessage('Le mot de passe doit contenir au moins 4 caractères.'),
];

const validateRegister = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est obligatoire.')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères.'),

  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est obligatoire.')
    .isEmail().withMessage('L\'email doit être valide.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Le mot de passe est obligatoire.')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères.')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule.')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre.'),
];

module.exports = { validateLogin, validateRegister };
