// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const { users } = require('../models/database');

/**
 * Middleware : vérifier que le token JWT est valide
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès refusé. Token manquant.',
      hint: 'Ajoutez le header: Authorization: Bearer <votre_token>',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Vérifier que l'utilisateur existe encore
    const user = users.find((u) => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide. Utilisateur introuvable.',
      });
    }
    req.user = { id: user.id, email: user.email, role: user.role, nom: user.nom };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré. Veuillez vous reconnecter.' });
    }
    return res.status(403).json({ success: false, message: 'Token invalide.' });
  }
};

/**
 * Middleware : vérifier le rôle de l'utilisateur
 * @param {...string} roles - rôles autorisés
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifié.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès interdit. Rôle requis : ${roles.join(' ou ')}. Votre rôle : ${req.user.role}`,
      });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
