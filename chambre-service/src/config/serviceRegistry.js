const axios = require('axios');

/**
 * Enregistre le service courant aupres du Service Discovery, puis envoie
 * des heartbeats periodiques. En cas d'echec de heartbeat (registre redemarre),
 * le service tente de se re-enregistrer automatiquement.
 */
function registerWithDiscovery({ name, host, port, discoveryUrl, interval = 15000 }) {
  const register = async () => {
    try {
      await axios.post(`${discoveryUrl}/register`, { name, host, port });
      console.log(`[DISCOVERY] ${name} enregistre aupres de ${discoveryUrl}`);
    } catch (err) {
      console.error(`[DISCOVERY] Echec enregistrement (${name}) : ${err.message}`);
    }
  };

  const heartbeat = async () => {
    try {
      await axios.put(`${discoveryUrl}/heartbeat/${name}`);
    } catch (err) {
      // Le registre ne connait plus le service : on se re-enregistre.
      await register();
    }
  };

  // Premier enregistrement immediat puis heartbeats reguliers.
  register();
  const timer = setInterval(heartbeat, interval);

  // Desenregistrement propre a l'arret du conteneur.
  const shutdown = async () => {
    clearInterval(timer);
    try {
      await axios.delete(`${discoveryUrl}/register/${name}`);
    } catch (_) { /* best effort */ }
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = registerWithDiscovery;
