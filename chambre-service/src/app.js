/**
 * Microservice CHAMBRE
 * --------------------------------------------------------------
 * Port Express : 3001  |  MongoDB (hote) : 27017
 * Expose une API REST CRUD sur la ressource "chambre".
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const registerWithDiscovery = require('./config/serviceRegistry');
const chambreRoutes = require('./routes/chambreRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chambres_db';
const DISCOVERY_URL = process.env.DISCOVERY_URL || 'http://localhost:4002';
const SERVICE_NAME = 'chambre-service';
const SERVICE_HOST = process.env.SERVICE_HOST || 'localhost';

app.get('/health', (req, res) => res.json({ status: 'UP', service: SERVICE_NAME }));
app.use('/chambres', chambreRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('[ERREUR]', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

async function demarrer() {
  await connectDB(MONGO_URI);
  app.listen(PORT, () => {
    console.log(`${SERVICE_NAME} demarre sur le port ${PORT}`);
    registerWithDiscovery({
      name: SERVICE_NAME,
      host: SERVICE_HOST,
      port: PORT,
      discoveryUrl: DISCOVERY_URL,
    });
  });
}

demarrer().catch((err) => {
  console.error('[FATAL] Demarrage impossible :', err.message);
  process.exit(1);
});

module.exports = app;
