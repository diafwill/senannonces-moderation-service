// src/server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          SenAnnonces - Moderation Service          ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║   Serveur démarré sur le port ${PORT}               ║`);
  console.log(`║   Swagger UI : http://localhost:${PORT}/api-docs    ║`);
  console.log(`║   Health    : http://localhost:${PORT}/health       ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Comptes de test :                                   ║');
  console.log('║  admin@senannonces.sn        → admin123 (ADMIN)      ║');
  console.log('║  moderateur@senannonces.sn   → modo123  (MODERATEUR) ║');
  console.log('║  user@senannonces.sn         → user123  (USER)       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
});

module.exports = app;
