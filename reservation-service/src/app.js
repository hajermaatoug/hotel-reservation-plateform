/**
 * Microservice RESERVATION
 * --------------------------------------------------------------
 * Port Express : 3002  |  MongoDB (hote) : 27018
 * Expose une API REST CRUD + disponibilite + statistiques.
 * Communique avec chambre-service via le Service Discovery.
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const registerWithDiscovery = require('./config/serviceRegistry');
const reservationRoutes = require('./routes/reservationRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/reservations_db';
const DISCOVERY_URL = process.env.DISCOVERY_URL || 'http://localhost:4002';
const SERVICE_NAME = 'reservation-service';
const SERVICE_HOST = process.env.SERVICE_HOST || 'localhost';

app.get('/health', (req, res) => res.json({ status: 'UP', service: SERVICE_NAME }));
app.use('/reservations', reservationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));
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
