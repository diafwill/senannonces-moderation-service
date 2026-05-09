// src/models/database.js
// Base de données en mémoire (simule une vraie DB)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── Statuts autorisés ───────────────────────────────────────────────────────
const STATUTS = {
  EN_ATTENTE: 'EN_ATTENTE',
  APPROUVEE: 'APPROUVEE',
  REJETEE: 'REJETEE',
  PUBLIEE: 'PUBLIEE',
};

// ─── Catégories autorisées ───────────────────────────────────────────────────
const CATEGORIES = [
  'Immobilier',
  'Véhicules',
  'Électronique',
  'Mode & Beauté',
  'Maison & Jardin',
  'Emploi',
  'Services',
  'Animaux',
  'Loisirs',
  'Autres',
];

// ─── Utilisateurs (en mémoire) ───────────────────────────────────────────────
const users = [
  {
    id: uuidv4(),
    nom: 'Admin SenAnnonces',
    email: 'admin@senannonces.sn',
    password: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nom: 'Moderateur 1',
    email: 'moderateur@senannonces.sn',
    password: bcrypt.hashSync('modo123', 10),
    role: 'MODERATEUR',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    nom: 'Utilisateur Test',
    email: 'user@senannonces.sn',
    password: bcrypt.hashSync('user123', 10),
    role: 'USER',
    createdAt: new Date().toISOString(),
  },
];

// ─── Annonces (en mémoire) ───────────────────────────────────────────────────
const annonces = [
  {
    id: 1,
    titre: 'Toyota Yaris 2019 à vendre',
    description: 'Très bon état, climatisée, 80 000 km. Entretien régulier.',
    prix: 4500000,
    ville: 'Dakar',
    categorie: 'Véhicules',
    statut: STATUTS.EN_ATTENTE,
    proprietaireEmail: 'user@senannonces.sn',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    titre: 'Appartement F3 à louer - Plateau',
    description: 'Bel appartement 3 pièces, vue mer, gardiennage 24h.',
    prix: 350000,
    ville: 'Dakar',
    categorie: 'Immobilier',
    statut: STATUTS.APPROUVEE,
    proprietaireEmail: 'user@senannonces.sn',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    titre: 'iPhone 14 Pro - 256GB',
    description: 'Neuf, sous blister, garantie 1 an. Couleur Violet.',
    prix: 750000,
    ville: 'Saint-Louis',
    categorie: 'Électronique',
    statut: STATUTS.PUBLIEE,
    proprietaireEmail: 'user@senannonces.sn',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Historique de modération ────────────────────────────────────────────────
const moderations = [];

// ─── Compteur auto-incrémenté ────────────────────────────────────────────────
let nextId = 4;

module.exports = {
  users,
  annonces,
  moderations,
  STATUTS,
  CATEGORIES,
  getNextId: () => nextId++,
};
