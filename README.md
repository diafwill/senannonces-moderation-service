#  SenAnnonces.sn - Moderation Service (Node.js)

Service de modération des annonces pour la plateforme **SenAnnonces.sn**, développé avec **Express.js**.

---

##  Structure du projet

```
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

##  Installation & Lancement

### Prérequis
- Node.js >= 18
- npm >= 8

### 1. Installer les dépendances

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

---

##  URLs importantes

| URL | Description |
|-----|-------------|
| `http://localhost:3001/api-docs` |  **Swagger UI** (documentation interactive) |
| `http://localhost:3001/health` |  Health check + statistiques |
| `http://localhost:3001/` |  Liste des endpoints |
| `http://localhost:3000/` |  API Gateway |

---

##  Authentification JWT

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

##  Endpoints API

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

##  Workflow des statuts

```
Créer annonce
     │
     ▼
[EN_ATTENTE]
     │
     ├── Moderateur APPROVE ──────► [APPROUVEE] ──► [PUBLIEE] 
     │
     └── Moderateur REJECT ───────► [REJETEE]  (définitif)
```

---

##  Scénarios de démonstration

### Scénario 1 — Approbation complète

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

##  Filtres disponibles

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

##  Lancer les tests

```bash
cd moderation-service
npm test
```
