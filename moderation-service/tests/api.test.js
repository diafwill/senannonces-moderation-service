// tests/api.test.js
const request = require('supertest');
const app = require('../src/app');

let tokenUser = '';
let tokenModo = '';
let annonceId = null;

// ─────────────────────────────────────────────────────────────────────────────
describe('🏥 Health Check', () => {
  test('GET /health → service UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('moderation-service');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('🔐 Auth - Connexion', () => {
  test('POST /auth/login → succès avec identifiants valides (USER)', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'user@senannonces.sn',
      password: 'user123',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('USER');
    tokenUser = res.body.data.token;
  });

  test('POST /auth/login → succès avec identifiants valides (MODERATEUR)', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'moderateur@senannonces.sn',
      password: 'modo123',
    });
    expect(res.statusCode).toBe(200);
    tokenModo = res.body.data.token;
  });

  test('POST /auth/login → 401 avec mauvais mot de passe', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'user@senannonces.sn',
      password: 'mauvaismdp',
    });
    expect(res.statusCode).toBe(401);
  });

  test('POST /auth/login → 422 avec email manquant', async () => {
    const res = await request(app).post('/auth/login').send({ password: 'user123' });
    expect(res.statusCode).toBe(422);
  });

  test('POST /auth/register → 409 si email déjà utilisé', async () => {
    const res = await request(app).post('/auth/register').send({
      nom: 'Test',
      email: 'user@senannonces.sn',
      password: 'Test123',
    });
    expect(res.statusCode).toBe(409);
  });

  test('GET /auth/me → retourne le profil si token valide', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenUser}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe('user@senannonces.sn');
  });

  test('GET /auth/me → 401 sans token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('📋 Annonces - CRUD', () => {
  test('GET /annonces → liste publique', async () => {
    const res = await request(app).get('/annonces');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /annonces?ville=Dakar → filtre par ville', async () => {
    const res = await request(app).get('/annonces?ville=Dakar');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((a) => expect(a.ville).toBe('Dakar'));
  });

  test('GET /annonces?categorie → filtre par catégorie', async () => {
    const res = await request(app).get('/annonces?categorie=V%C3%A9hicules');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((a) => expect(a.categorie).toBe('Véhicules'));
  });

  test('GET /annonces?statut=PUBLIEE → filtre par statut', async () => {
    const res = await request(app).get('/annonces?statut=PUBLIEE');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((a) => expect(a.statut).toBe('PUBLIEE'));
  });

  test('POST /annonces → 401 sans token', async () => {
    const res = await request(app).post('/annonces').send({
      titre: 'Test sans auth',
      description: 'Ceci doit échouer.',
      prix: 100,
      ville: 'Dakar',
      categorie: 'Autres',
    });
    expect(res.statusCode).toBe(401);
  });

  test('POST /annonces → 422 avec données invalides', async () => {
    const res = await request(app)
      .post('/annonces')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({ titre: 'AB', prix: -100, ville: 'Paris', categorie: 'Inconnu' });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  test('POST /annonces → 201 création réussie avec statut EN_ATTENTE', async () => {
    const res = await request(app)
      .post('/annonces')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({
        titre: 'Télévision Samsung 55 pouces',
        description: 'Télévision QLED 4K, état neuf, achetée il y a 6 mois.',
        prix: 350000,
        ville: 'Thiès',
        categorie: 'Électronique',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.statut).toBe('EN_ATTENTE');
    expect(res.body.data.categorie).toBe('Électronique');
    annonceId = res.body.data.id;
  });

  test('GET /annonces/:id → détail de l\'annonce créée', async () => {
    const res = await request(app).get(`/annonces/${annonceId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(annonceId);
  });

  test('GET /annonces/999 → 404 annonce inexistante', async () => {
    const res = await request(app).get('/annonces/999');
    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚖️ Modération - Workflow complet', () => {
  test('GET /moderations/pending → 401 sans token', async () => {
    const res = await request(app).get('/moderations/pending');
    expect(res.statusCode).toBe(401);
  });

  test('GET /moderations/pending → 403 si rôle USER', async () => {
    const res = await request(app)
      .get('/moderations/pending')
      .set('Authorization', `Bearer ${tokenUser}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /moderations/pending → liste des annonces EN_ATTENTE (MODERATEUR)', async () => {
    const res = await request(app)
      .get('/moderations/pending')
      .set('Authorization', `Bearer ${tokenModo}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ─── Scénario 1 : Approbation ───────────────────────────────────────────
  test('SCÉNARIO 1 - PATCH /moderations/:id/approve → EN_ATTENTE → PUBLIEE ✅', async () => {
    const res = await request(app)
      .patch(`/moderations/${annonceId}/approve`)
      .set('Authorization', `Bearer ${tokenModo}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.statut).toBe('PUBLIEE');
    expect(res.body.workflow).toContain('PUBLIEE');
  });

  test('PATCH /moderations/:id/approve → 400 si déjà publiée', async () => {
    const res = await request(app)
      .patch(`/moderations/${annonceId}/approve`)
      .set('Authorization', `Bearer ${tokenModo}`);
    expect(res.statusCode).toBe(400);
  });

  test('GET /moderations/:id/status → vérifier statut PUBLIEE', async () => {
    const res = await request(app).get(`/moderations/${annonceId}/status`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.statut).toBe('PUBLIEE');
    expect(res.body.data.historiqueModeration.length).toBeGreaterThan(0);
  });

  // ─── Scénario 2 : Rejet ─────────────────────────────────────────────────
  test('SCÉNARIO 2 - Créer une annonce puis la rejeter → statut REJETEE ❌', async () => {
    // Créer une nouvelle annonce
    const create = await request(app)
      .post('/annonces')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({
        titre: 'Vélo BMX occasion Dakar',
        description: 'BMX professionnel, cadre aluminium, peu utilisé, excellent état.',
        prix: 80000,
        ville: 'Dakar',
        categorie: 'Loisirs',
      });
    expect(create.statusCode).toBe(201);
    const newId = create.body.data.id;

    // Rejeter l'annonce
    const reject = await request(app)
      .patch(`/moderations/${newId}/reject`)
      .set('Authorization', `Bearer ${tokenModo}`)
      .send({ motif: 'Prix trop bas, possible arnaque.' });
    expect(reject.statusCode).toBe(200);
    expect(reject.body.data.statut).toBe('REJETEE');
    expect(reject.body.workflow).toContain('REJETEE');

    // Vérifier le statut définitif
    const status = await request(app).get(`/moderations/${newId}/status`);
    expect(status.body.data.statut).toBe('REJETEE');
    expect(status.body.data.historiqueModeration[0].motif).toBe('Prix trop bas, possible arnaque.');
  });

  test('GET /moderations → historique complet (MODERATEUR)', async () => {
    const res = await request(app)
      .get('/moderations')
      .set('Authorization', `Bearer ${tokenModo}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('🗂️ Catégories', () => {
  test('GET /annonces/meta/categories → liste des catégories', async () => {
    const res = await request(app).get('/annonces/meta/categories');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('Véhicules');
    expect(res.body.data).toContain('Immobilier');
  });
});
