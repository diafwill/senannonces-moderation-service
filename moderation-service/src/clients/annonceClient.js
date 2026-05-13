// src/clients/annonceClient.js
// HTTP client for calling back to annonce-service after a moderation decision.
const axios = require('axios');

const ANNONCE_SERVICE_BASE_URL =
  process.env.ANNONCE_SERVICE_BASE_URL ||
  process.env.ANNONCE_SERVICE_URL ||
  'http://localhost:8081';

/**
 * Sends a moderation decision to annonce-service via its internal callback endpoint.
 *
 * PATCH /annonces/{annonceId}/statut
 * Body: { decision: "APPROUVEE" | "REJETEE" }
 *
 * annonce-service maps:
 *   APPROUVEE → PUBLIEE
 *   REJETEE   → REJETEE
 *
 * @param {number} annonceId
 * @param {"APPROUVEE"|"REJETEE"} decision
 * @returns {Promise<object>} the updated AnnonceResponse from annonce-service
 */
async function updateAnnonceStatus(annonceId, decision) {
  const url = `${ANNONCE_SERVICE_BASE_URL}/annonces/${annonceId}/statut`;
  const response = await axios.patch(url, { decision });
  return response.data;
}

module.exports = { updateAnnonceStatus };
