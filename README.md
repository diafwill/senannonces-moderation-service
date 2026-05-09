# SenAnnonces.sn — Moderation Service (Node.js)

Service de modération des annonces pour la plateforme **SenAnnonces.sn**, développé avec **Express.js**.

---

## 📁 Structure du projet

```
senannonces/
├── moderation-service/        # Service principal (Node.js/Express)
│   ├── src/
│   │   ├── app.js             # Application Express
│   │   ├── server.js          # Point d'entrée
│   │   ├── config/
│   │   │   └── swagger.js     # Configuration Swagger/OpenAPI
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js        # JWT + contrôle des rôles
│   │   │   └── validation.middleware.js  # Gestion des erreurs de validation
│   │   ├── models/
│   │   │   └── database.js    # Base de données en mémoire
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # Auth (login, register, me)
│   │   │   ├── annonces.routes.js    # CRUD + filtres annonces
│   │   │   ├── moderation.routes.js  # Approve / Reject
│   │   │   └── health.routes.js      # Health check
│   │   └── validators/
│   │       ├── annonce.validator.js  # Validation des annonces
│   │       └── auth.validator.js     # Validation de l'auth
│   ├── tests/
│   │   └── api.test.js        # Tests Jest complets (35+ tests)
│   ├── .env
│   ├── jest.config.json
│   └── package.json
│
└── api-gateway/               # API Gateway simple
    ├── gateway.js
    └── package.json
```

---

## 🚀 Installation & Lancement

### Prérequis
- Node.js >= 18
- npm >= 8

### 1. Installer les dépendances

```bash
# Moderation Service
cd moderation-service
npm install

# API Gateway
cd ../api-gateway
npm install
```

### 2. Lancer le service

```bash
# Mode développement (avec rechargement automatique)
cd moderation-service
npm run dev

# Mode production
npm start
```

### 3. Lancer l'API Gateway (optionnel)

```bash
cd api-gateway
npm run dev
```

---

## 📖 URLs importantes

| URL | Description |
|-----|-------------|
| `http://localhost:3001/api-docs` | ✅ **Swagger UI** (documentation interactive) |
| `http://localhost:3001/health` | ❤️ Health check + statistiques |
| `http://localhost:3001/` | 📋 Liste des endpoints |
| `http://localhost:3000/` | 🔀 API Gateway |

---

## 🔐 Authentification JWT

Tous les endpoints protégés nécessitent un token JWT dans le header :

```
Authorization: Bearer <votre_token>
```

### Comptes de test prêts à l'emploi

| Email | Mot de passe | Rôle | Droits |
|-------|-------------|------|--------|
| `admin@senannonces.sn` | `admin123` | ADMIN | Tout |
| `moderateur@senannonces.sn` | `modo123` | MODERATEUR | Modération |
| `user@senannonces.sn` | `user123` | USER | Créer/voir annonces |

---

## 🗺️ Endpoints API

### Auth
```
POST   /auth/register      # Créer un compte
POST   /auth/login         # Se connecter → obtenir token JWT
GET    /auth/me            # Voir son profil (token requis)
```

### Annonces
```
GET    /annonces                    # Lister avec filtres (ville, catégorie, statut, page)
GET    /annonces/:id                # Détail d'une annonce
POST   /annonces                    # Créer (token USER requis) → statut EN_ATTENTE
POST   /annonces/:id/soumettre      # Soumettre à modération (propriétaire uniquement)
PATCH  /annonces/:id/publier        # Publier (ADMIN/MODERATEUR uniquement)
GET    /annonces/meta/categories    # Lister les catégories
```

### Modération
```
GET    /moderations                      # Historique complet (ADMIN/MODERATEUR)
GET    /moderations/pending              # Annonces en attente (ADMIN/MODERATEUR)
PATCH  /moderations/:annonceId/approve   # Approuver → PUBLIEE automatiquement
PATCH  /moderations/:annonceId/reject    # Rejeter → REJETEE définitif
GET    /moderations/:annonceId/status    # Vérifier le statut + historique
```

---

## 🔄 Workflow des statuts

```
Créer annonce
     │
     ▼
[EN_ATTENTE]
     │
     ├── Moderateur APPROVE ──────► [APPROUVEE] ──► [PUBLIEE] ✅
     │
     └── Moderateur REJECT ───────► [REJETEE] ❌ (définitif)
```

---

## 🎯 Scénarios de démonstration

### Scénario 1 — Approbation complète

```bash
# 1. Connexion utilisateur
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@senannonces.sn","password":"user123"}'

# 2. Créer une annonce (remplacer TOKEN)
curl -X POST http://localhost:3001/annonces \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Voiture Toyota à vendre",
    "description": "Très bon état, 80 000 km, climatisée.",
    "prix": 4500000,
    "ville": "Dakar",
    "categorie": "Véhicules"
  }'

# 3. Connexion modérateur
curl -X POST http://localhost:3001/auth/login \
  -d '{"email":"moderateur@senannonces.sn","password":"modo123"}'

# 4. Approuver l'annonce (remplacer ID et MODO_TOKEN)
curl -X PATCH http://localhost:3001/moderations/ID/approve \
  -H "Authorization: Bearer MODO_TOKEN"

# 5. Vérifier le statut → doit être PUBLIEE
curl http://localhost:3001/moderations/ID/status
```

### Scénario 2 — Rejet

```bash
# Rejeter avec motif
curl -X PATCH http://localhost:3001/moderations/ID/reject \
  -H "Authorization: Bearer MODO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motif": "Description insuffisante."}'

# Vérifier → doit être REJETEE
curl http://localhost:3001/moderations/ID/status
```

---

## 🔍 Filtres disponibles

```bash
# Filtrer par ville
GET /annonces?ville=Dakar

# Filtrer par catégorie
GET /annonces?categorie=Véhicules

# Filtrer par statut
GET /annonces?statut=PUBLIEE

# Combiner les filtres + pagination
GET /annonces?ville=Dakar&categorie=Immobilier&page=1&limit=5
```

---

## 🧪 Lancer les tests

```bash
cd moderation-service
npm test
```

Les tests couvrent :
- ✅ Health check
- ✅ Auth (login, register, token invalide, rôles)
- ✅ CRUD annonces (création, validation, filtres)
- ✅ Scénario 1 : approbation → statut PUBLIEE
- ✅ Scénario 2 : rejet → statut REJETEE
- ✅ Contrôle d'accès par rôle

---

## 🔗 Communication avec Spring Boot (annonce-service)

Le service est conçu pour recevoir des appels HTTP de l'`annonce-service` Java :

```
annonce-service (Spring Boot :8080)
         │
         │  POST /soumettre → appel HTTP
         ▼
moderation-service (Node.js :3001)
         │
         │  PATCH /moderations/:id/approve ou /reject
         ▼
    Statut mis à jour
```

Via l'API Gateway :
```
Client → http://localhost:3000/moderation/... → moderation-service
Client → http://localhost:3000/annonces-service/... → annonce-service
```

---

## 📦 Variables d'environnement (.env)

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=senannonces_super_secret_jwt_key_2024
JWT_EXPIRES_IN=24h
ANNONCE_SERVICE_URL=http://localhost:8080
GATEWAY_PORT=3000
```

---

## ✨ Fonctionnalités bonus implémentées

| Bonus | Statut |
|-------|--------|
| Filtrer annonces par ville | ✅ |
| Ajouter catégorie | ✅ |
| Validation des données | ✅ (express-validator) |
| API Gateway simple | ✅ |
| Authentification JWT | ✅ |
| Contrôle des rôles (USER/MODERATEUR/ADMIN) | ✅ |
| Rate limiting | ✅ |
| Historique de modération | ✅ |
| Pagination | ✅ |
