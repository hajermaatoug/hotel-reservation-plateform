const mongoose = require('mongoose');

/**
 * Connexion MongoDB avec tentatives multiples.
 * Indispensable sous Docker : le conteneur du service peut demarrer
 * avant que MongoDB n'accepte les connexions.
 */
async function connectDB(uri, retries = 12, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log('[DB] Connecte a MongoDB :', uri);
      return mongoose.connection;
    } catch (err) {
      console.error(`[DB] Tentative ${attempt}/${retries} echouee : ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = connectDB;
