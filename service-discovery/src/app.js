/**
 * Service Discovery (Registre de services)
 * --------------------------------------------------------------
 * Registre en mémoire permettant aux microservices de s'enregistrer
 * et à l'API Gateway / aux autres services de les localiser dynamiquement.
 *
 * Endpoints :
 *   POST   /register            -> enregistre un service { name, host, port }
 *   PUT    /heartbeat/:name     -> rafraîchit la date de vie d'un service
 *   DELETE /register/:name      -> désenregistre un service
 *   GET    /discover/:name      -> retourne l'URL d'un service précis
 *   GET    /services            -> liste tous les services actifs
 *   GET    /health              -> état du registre
 */
const express = require('express');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 4002;

// Délai (ms) au-delà duquel un service sans heartbeat est considéré mort.
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT || '40000', 10);
const SWEEP_INTERVAL = 10000;

// Registre : { [name]: { name, host, port, url, lastHeartbeat } }
const registry = {};

app.post('/register', (req, res) => {
  const { name, host, port } = req.body;
  if (!name || !host || !port) {
    return res.status(400).json({ error: 'Champs requis : name, host, port' });
  }
  registry[name] = {
    name,
    host,
    port,
    url: `http://${host}:${port}`,
    lastHeartbeat: Date.now(),
  };
  console.log(`[REGISTRY] Enregistré : ${name} -> ${registry[name].url}`);
  return res.status(201).json({ message: 'Service enregistré', service: registry[name] });
});

app.put('/heartbeat/:name', (req, res) => {
  const service = registry[req.params.name];
  if (!service) {
    return res.status(404).json({ error: `Service ${req.params.name} non enregistré` });
  }
  service.lastHeartbeat = Date.now();
  return res.json({ message: 'Heartbeat reçu', name: service.name });
});

app.delete('/register/:name', (req, res) => {
  if (registry[req.params.name]) {
    delete registry[req.params.name];
    console.log(`[REGISTRY] Désenregistré : ${req.params.name}`);
  }
  return res.json({ message: 'Service désenregistré', name: req.params.name });
});

app.get('/discover/:name', (req, res) => {
  const service = registry[req.params.name];
  if (!service) {
    return res.status(404).json({ error: `Service ${req.params.name} introuvable` });
  }
  return res.json(service);
});

app.get('/services', (req, res) => {
  return res.json(Object.values(registry));
});

app.get('/health', (req, res) => {
  return res.json({ status: 'UP', service: 'service-discovery', enregistres: Object.keys(registry) });
});

// Nettoyage périodique des services expirés.
setInterval(() => {
  const now = Date.now();
  for (const name of Object.keys(registry)) {
    if (now - registry[name].lastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log(`[REGISTRY] Expiré, suppression : ${name}`);
      delete registry[name];
    }
  }
}, SWEEP_INTERVAL);

app.listen(PORT, () => {
  console.log(`Service Discovery démarré sur le port ${PORT}`);
});

module.exports = app;
