// src/middlewares/validation.middleware.js
const { validationResult } = require('express-validator');

/**
 * Middleware centralisé pour retourner les erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Données invalides. Veuillez corriger les erreurs.',
      errors: errors.array().map((e) => ({
        champ: e.path,
        message: e.msg,
        valeurReçue: e.value,
      })),
    });
  }
  next();
};

module.exports = { handleValidationErrors };
