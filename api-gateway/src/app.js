/**
 * API GATEWAY
 * --------------------------------------------------------------
 * Port : 5001
 * Point d'entree unique des clients. Route les requetes vers les
 * microservices localises dynamiquement via le Service Discovery.
 *
 *   /api/chambres/**      -> chambre-service       (/chambres/**)
 *   /api/reservations/**  -> reservation-service   (/reservations/**)
 *   /api/services         -> liste des services enregistres
 *   /health               -> etat de la passerelle
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 5001;
const DISCOVERY_URL = process.env.DISCOVERY_URL || 'http://localhost:4002';

// Cache des URLs de services, rafraichi periodiquement depuis le registre.
let serviceCache = {};

async function rafraichirServices() {
  try {
    const { data } = await axios.get(`${DISCOVERY_URL}/services`, { timeout: 4000 });
    const cache = {};
    data.forEach((s) => { cache[s.name] = s.url; });
    serviceCache = cache;
  } catch (err) {
    console.error(`[GATEWAY] Rafraichissement impossible : ${err.message}`);
  }
}
rafraichirServices();
setInterval(rafraichirServices, 10000);

/** Resout l'URL d'un service (cache puis lookup direct en repli). */
async function urlService(nom) {
  if (serviceCache[nom]) return serviceCache[nom];
  try {
    const { data } = await axios.get(`${DISCOVERY_URL}/discover/${nom}`, { timeout: 4000 });
    serviceCache[nom] = data.url;
    return data.url;
  } catch (_) {
    return null;
  }
}

/**
 * Transfere la requete vers le microservice cible.
 * @param serviceName nom enregistre dans le discovery
 * @param prefixeCible prefixe de chemin attendu par le service (ex: /chambres)
 */
function creerProxy(serviceName, prefixeCible) {
  return async (req, res) => {
    const base = await urlService(serviceName);
    if (!base) {
      return res.status(503).json({ error: `${serviceName} indisponible (non enregistre)` });
    }
    // req.url contient le chemin restant + la query string apres le point de montage.
    const cible = `${base}${prefixeCible}${req.url}`;
    try {
      const reponse = await axios({
        method: req.method,
        url: cible,
        data: req.body,
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000,
        validateStatus: () => true, // on relaie tel quel le statut du service
      });
      return res.status(reponse.status).json(reponse.data);
    } catch (err) {
      // Service injoignable : on invalide le cache pour forcer une re-resolution.
      delete serviceCache[serviceName];
      return res.status(502).json({ error: `Erreur passerelle vers ${serviceName} : ${err.message}` });
    }
  };
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'api-gateway', services: serviceCache }));
app.get('/api/services', async (req, res) => {
  try {
    const { data } = await axios.get(`${DISCOVERY_URL}/services`);
    return res.json(data);
  } catch (err) {
    return res.status(503).json({ error: 'Service Discovery indisponible' });
  }
});

app.use('/api/chambres', creerProxy('chambre-service', '/chambres'));
app.use('/api/reservations', creerProxy('reservation-service', '/reservations'));

app.use((req, res) => res.status(404).json({ error: 'Route passerelle introuvable' }));

app.listen(PORT, () => {
  console.log(`API Gateway demarre sur le port ${PORT}`);
});

module.exports = app;
