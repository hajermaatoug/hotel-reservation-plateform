const axios = require('axios');

const DISCOVERY_URL = process.env.DISCOVERY_URL || 'http://localhost:4002';

/**
 * Resout l'URL d'un service via le Service Discovery.
 * Une petite cache evite un appel reseau a chaque requete.
 */
const cache = {};
const CACHE_TTL = 10000;

async function resoudreService(nom) {
  const maintenant = Date.now();
  if (cache[nom] && maintenant - cache[nom].ts < CACHE_TTL) {
    return cache[nom].url;
  }
  const { data } = await axios.get(`${DISCOVERY_URL}/discover/${nom}`, { timeout: 4000 });
  cache[nom] = { url: data.url, ts: maintenant };
  return data.url;
}

/**
 * Recupere une chambre par son numero aupres du chambre-service.
 * Retourne null si la chambre n'existe pas.
 */
async function getChambreParNumero(numero) {
  const baseUrl = await resoudreService('chambre-service');
  try {
    const { data } = await axios.get(`${baseUrl}/chambres/numero/${numero}`, { timeout: 4000 });
    return data;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw new Error(`chambre-service injoignable : ${err.message}`);
  }
}

module.exports = { resoudreService, getChambreParNumero };
