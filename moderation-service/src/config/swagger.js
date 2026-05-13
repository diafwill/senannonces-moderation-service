// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SenAnnonces - Moderation Service API',
      version: '1.0.0',
      description: `
## Service de modération des annonces - SenAnnonces.sn

Ce service gère :
- **Authentification JWT** (inscription, connexion)
- **Gestion des annonces** (CRUD + filtres)
- **Modération** (approbation / rejet)
- **Workflow complet** : EN_ATTENTE -> APPROUVEE -> PUBLIEE / REJETEE

### Statuts des annonces
| Statut | Description |
|--------|-------------|
| \`EN_ATTENTE\` | Annonce créée, en attente de modération |
| \`APPROUVEE\` | Validée par un modérateur |
| \`PUBLIEE\` | Visible publiquement |
| \`REJETEE\` | Refusée par un modérateur |

### Comptes de test disponibles
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@senannonces.sn | admin123 | ADMIN |
| moderateur@senannonces.sn | modo123 | MODERATEUR |
| user@senannonces.sn | user123 | USER |
      `,
      contact: {
        name: 'SenAnnonces Support',
        email: 'dazomahou22@gmail.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Moderation Service (direct)',
      },
      {
        url: 'http://localhost:3000/moderation',
        description: 'Via API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT obtenu via POST /auth/login',
        },
      },
      schemas: {
        Annonce: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            titre: { type: 'string', example: 'Toyota Yaris à vendre' },
            description: { type: 'string', example: 'Très bon état, 80 000 km.' },
            prix: { type: 'number', example: 4500000 },
            ville: { type: 'string', example: 'Dakar' },
            categorie: { type: 'string', example: 'Véhicules' },
            statut: {
              type: 'string',
              enum: ['EN_ATTENTE', 'APPROUVEE', 'REJETEE', 'PUBLIEE'],
              example: 'EN_ATTENTE',
            },
            proprietaireEmail: { type: 'string', example: 'user@senannonces.sn' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AnnonceInput: {
          type: 'object',
          required: ['titre', 'description', 'prix', 'ville', 'categorie'],
          properties: {
            titre: { type: 'string', minLength: 5, maxLength: 100, example: 'Voiture à vendre' },
            description: { type: 'string', minLength: 10, maxLength: 1000, example: 'Toyota Yaris 2019, bon état.' },
            prix: { type: 'number', minimum: 0, example: 2500000 },
            ville: {
              type: 'string',
              enum: ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Tambacounda',
                'Mbour', 'Touba', 'Diourbel', 'Louga', 'Kolda', 'Matam', 'Fatick',
                'Kaffrine', 'Sédhiou', 'Kédougou', 'Rufisque', 'Pikine', 'Guédiawaye', 'Autres'],
              example: 'Dakar',
            },
            categorie: {
              type: 'string',
              enum: ['Immobilier', 'Véhicules', 'Électronique', 'Mode & Beauté', 'Maison & Jardin',
                'Emploi', 'Services', 'Animaux', 'Loisirs', 'Autres'],
              example: 'Véhicules',
            },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@senannonces.sn' },
            password: { type: 'string', example: 'user123' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['nom', 'email', 'password'],
          properties: {
            nom: { type: 'string', example: 'Amadou Diallo' },
            email: { type: 'string', format: 'email', example: 'amadou@senannonces.sn' },
            password: { type: 'string', example: 'MonMot2Passe', description: 'Min 6 chars, 1 majuscule, 1 chiffre' },
          },
        },
        ModerationInput: {
          type: 'object',
          properties: {
            motif: { type: 'string', example: 'Prix non conforme aux règles.', description: 'Motif optionnel (rejet)' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Une erreur est survenue.' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des comptes' },
      { name: 'Annonces', description: 'Gestion des annonces (CRUD + filtres)' },
      { name: 'Moderation', description: 'Approbation et rejet des annonces' },
      { name: 'Health', description: 'Vérification de l\'état du service' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
