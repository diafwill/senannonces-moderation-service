# SenAnnonces - Moderation Service

Ce dépôt contient le microservice de modération de la plateforme **SenAnnonces.sn**. Développé en Node.js (Express), ce service agit comme un centre de contrôle interne : il gère le cycle de vie des annonces (évaluation, validation, rejet) avant leur publication finale.

Il fonctionne de concert avec l'API principale métier développée en Spring Boot.

---

## 🏗 Architecture globale

Le système s'articule autour du service métier et d'un proxy de routage (`api-gateway`). Notre backend Node.js écoute les requêtes internes provenant du backend Java pour initier le processus de modération.

### Intégration Spring Boot
L'architecture événementielle repose sur des appels HTTP internes :

```text
annonce-service (Java Spring Boot :8080)
         │
         │  POST /soumettre (Webhook interne)
         ▼
moderation-service (Node.js :3001)
         │
         │  PATCH /moderations/:id/approve ou /reject
         ▼
    [ Le statut de l'annonce est mis à jour en base ]
```

### Structure du code source

```text
senannonces/
├── moderation-service/        
│   ├── src/
│   │   ├── app.js                    # Configuration application Express
│   │   ├── server.js                 # Point d'entrée
│   │   ├── config/swagger.js         # Configuration OpenAPI
│   │   ├── middlewares/              # Intercepteurs (Auth, RBAC, Rate Limit)
│   │   ├── models/                   # Mécanisme de base de données
│   │   ├── routes/                   # Définition des endpoints REST
│   │   └── validators/               # Schémas de validation entrées
│   ├── tests/                        # Suite de tests d'intégration (Jest)
│   ├── .env                          # Variables d'environnement locales
│   └── package.json
└── api-gateway/                      # Reverse proxy (Port 3000)
    ├── gateway.js
    └── package.json
```

---

## 🛠 Fonctionnalités clés

- **Contrôle d'accès (RBAC) :** Sécurisation via JWT avec séparation stricte des droits (Admin, Modérateur, Utilisateur).
- **Intégrité des données :** Validation systématique des payloads via `express-validator`.
- **Historisation :** Conservation des traces pour chaque action de modération (motif, date, auteur).
- **Protection de l'API :** Implémentation d'un Rate Limiting pour prévenir les abus.
- **Requêtes optimisées :** Support natif de la pagination et des filtres multicritères (ville, catégorie, statut).

---

## 🚦 Cycle de vie d'une annonce

Notre pipeline de modération s'appuie sur une machine à états unidirectionnelle :

```text
[ Nouvelle Annonce ]
     │
     ▼
( EN_ATTENTE ) ──► L'annonce est dans la file des modérateurs (Automatique)
     │
     ├── Le modérateur APPROUVE ────► ( PUBLIEE ) ✅ L'annonce devient publique.
     │
     └── Le modérateur REJETTE ─────► ( REJETEE ) ❌ Rejet définitif avec motif.
```

---

## 💻 Démarrage rapide

Assurez-vous d'avoir Node.js (v18+) et `npm` installés.

### 1. Variables d'environnement
À la racine de `moderation-service/`, assurez-vous d'avoir un fichier `.env` configuré ainsi :

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=votre_cle_secrete_jwt_changez_la_en_production
JWT_EXPIRES_IN=24h
ANNONCE_SERVICE_URL=http://localhost:8080
GATEWAY_PORT=3000
```

### 2. Installation et Lancement

```bash
# Lancer le service de modération
cd moderation-service
npm install
npm run dev

# Lancer la gateway (optionnel, dans un autre terminal)
cd ../api-gateway
npm install
npm run dev
```

L'API est désormais accessible sur **`http://localhost:3001`** (ou `3000` via la gateway).

---

## 🔌 Référence de l'API

L'exploration de l'API est simplifiée par **Swagger**, disponible ici :  
📍 **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)**

### Comptes de développement
Pour faciliter les tests locaux, la base de données initialise par défaut trois profils. Récupérez un JWT via `POST /auth/login` pour authentifier vos requêtes.

| Rôle | Email | Mot de passe |
|---|---|---|
| **Admin** | `admin@senannonces.sn` | `admin123` |
| **Modérateur** | `moderateur@senannonces.sn` | `modo123` |
| **Utilisateur** | `user@senannonces.sn` | `user123` |

### Endpoints principaux

**Authentification**
- `POST /auth/login` : Obtenir un token JWT
- `GET  /auth/me` : Détails du profil actif

**Exploration (Annonces)**
- `GET  /annonces` : Recherche filtrée (`?ville=X&categorie=Y&statut=PUBLIEE`)
- `GET  /annonces/meta/categories` : Référentiel des catégories

**Actions de Modération (Staff)**
- `GET   /moderations/pending` : Obtenir la file d'attente
- `PATCH /moderations/:id/approve` : Approuver l'annonce
- `PATCH /moderations/:id/reject` : Rejeter l'annonce (requiert un `motif`)

---

## 🎯 Exemples CLI (CURL)

Ces scénarios démontrent l'utilisation de l'API directement depuis un terminal, idéal pour les tests automatisés ou l'intégration CI/CD.

### Scénario : Soumission et Approbation

```bash
# 1. Obtenir un token utilisateur
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@senannonces.sn","password":"user123"}'

# 2. Créer l'annonce (remplacer $TOKEN)
curl -X POST http://localhost:3001/annonces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titre":"Voiture Toyota", "prix":4500000, "ville":"Dakar", "categorie":"Véhicules"}'

# 3. Obtenir un token modérateur
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moderateur@senannonces.sn","password":"modo123"}'

# 4. Approuver (remplacer $ID et $MODO_TOKEN)
curl -X PATCH http://localhost:3001/moderations/$ID/approve \
  -H "Authorization: Bearer $MODO_TOKEN"
```

---

## 🧪 Tests

Le projet dispose d'une suite de tests complète (Jest + Supertest) couvrant :
- L'intégrité des flux d'authentification.
- Les contraintes de sécurité (RBAC).
- L'ensemble des workflows d'annonce et de modération.
- Les fonctions de filtre et de recherche.

**Exécuter les tests :**
```bash
cd moderation-service
npm test
```
