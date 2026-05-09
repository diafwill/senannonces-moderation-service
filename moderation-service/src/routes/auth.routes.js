// src/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../models/database');
const { validateLogin, validateRegister } = require('../validators/auth.validator');
const { handleValidationErrors } = require('../middlewares/validation.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Créer un nouveau compte utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *       409:
 *         description: Email déjà utilisé
 *       422:
 *         description: Données invalides
 */
router.post('/register', validateRegister, handleValidationErrors, (req, res) => {
  const { nom, email, password } = req.body;

  const exists = users.find((u) => u.email === email);
  if (exists) {
    return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
  }

  const hashedPwd = bcrypt.hashSync(password, 10);
  const newUser = {
    id: uuidv4(),
    nom,
    email,
    password: hashedPwd,
    role: 'USER',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return res.status(201).json({
    success: true,
    message: 'Compte créé avec succès.',
    data: {
      token,
      user: { id: newUser.id, nom: newUser.nom, email: newUser.email, role: newUser.role },
    },
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Se connecter et obtenir un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           examples:
 *             admin:
 *               summary: Compte Admin
 *               value: { email: "admin@senannonces.sn", password: "admin123" }
 *             moderateur:
 *               summary: Compte Modérateur
 *               value: { email: "moderateur@senannonces.sn", password: "modo123" }
 *             user:
 *               summary: Compte Utilisateur
 *               value: { email: "user@senannonces.sn", password: "user123" }
 *     responses:
 *       200:
 *         description: Connexion réussie — token JWT retourné
 *       401:
 *         description: Email ou mot de passe incorrect
 *       422:
 *         description: Données invalides
 */
router.post('/login', validateLogin, handleValidationErrors, (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return res.json({
    success: true,
    message: 'Connexion réussie.',
    data: {
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    },
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Voir le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profil retourné
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  return res.json({
    success: true,
    data: { id: user.id, nom: user.nom, email: user.email, role: user.role, createdAt: user.createdAt },
  });
});

module.exports = router;
