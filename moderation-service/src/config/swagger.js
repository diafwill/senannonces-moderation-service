// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SenAnnonces - Moderation Service API',
      version: '1.0.0',
      description: `
## Service de modération — SenAnnonces (Architecture Microservices)

Ce service est responsable **uniquement des décisions de modération**.
Les annonces sont stockées et gérées par **annonce-service** (port 8081).

### Architecture
\`\`\`
annonce-service (port 8081)  ←──────────────────────────────────┐
   POST /annonces/{id}/soumettre                                  │ callback
          │                                                       │
          ▼                                                        │
moderation-service (port 3001)                                    │
   POST /moderations/submit  (reçoit l'annonce)                   │
   PATCH /moderations/{id}/approve → PATCH /annonces/{id}/statut ─┘
   PATCH /moderations/{id}/reject  → PATCH /annonces/{id}/statut ─┘
\`\`\`

### Workflow complet de démonstration

**Scénario Approbation :**
1. \`POST http://localhost:8081/annonces\` → crée l'annonce (statut: EN_ATTENTE)
2. \`POST http://localhost:8081/annonces/{id}/soumettre\` → envoie à moderation-service
3. \`POST http://localhost:3001/auth/login\` → obtenir un JWT (MODERATEUR ou ADMIN)
4. \`PATCH http://localhost:3001/moderations/{id}/approve\` → approuve + callback → statut: PUBLIEE
5. \`GET http://localhost:8081/annonces/{id}\` → vérifier statut PUBLIEE ✅

**Scénario Rejet :**
1. \`POST http://localhost:8081/annonces\` → crée l'annonce
2. \`POST http://localhost:8081/annonces/{id}/soumettre\` → envoie à moderation-service
3. \`POST http://localhost:3001/auth/login\` → obtenir un JWT
4. \`PATCH http://localhost:3001/moderations/{id}/reject\` → rejette + callback → statut: REJETEE
5. \`GET http://localhost:8081/annonces/{id}\` → vérifier statut REJETEE ❌

### Comptes de test disponibles
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@senannonces.sn | admin123 | ADMIN |
| moderateur@senannonces.sn | modo123 | MODERATEUR |
| user@senannonces.sn | user123 | USER |

### Statuts des annonces (stockés dans annonce-service)
| Statut | Description |
|--------|-------------|
| \`EN_ATTENTE\` | Créée, en attente de modération |
| \`PUBLIEE\` | Approuvée par un modérateur (état terminal) |
| \`REJETEE\` | Rejetée par un modérateur (état terminal) |
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
      { name: 'Auth', description: '🔐 Authentification et gestion des comptes' },
      { name: 'Annonces', description: '📋 Gestion des annonces (CRUD + filtres)' },
      { name: 'Moderation', description: '⚖️ Approbation et rejet des annonces' },
      { name: 'Health', description: '🏥 Vérification de l\'état du service' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
