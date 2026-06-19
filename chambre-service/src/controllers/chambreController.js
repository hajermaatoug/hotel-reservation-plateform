const mongoose = require('mongoose');
const Chambre = require('../models/Chambre');

/** Cree une chambre. */
exports.creerChambre = async (req, res) => {
  try {
    const existante = await Chambre.findOne({ numero: req.body.numero });
    if (existante) {
      return res.status(409).json({ error: `Une chambre avec le numero ${req.body.numero} existe deja` });
    }
    const chambre = await Chambre.create(req.body);
    return res.status(201).json(chambre);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Numero de chambre deja utilise' });
    }
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Liste les chambres avec filtres optionnels :
 *   ?disponible=true|false
 *   ?type=Simple|Double|Suite
 *   ?capaciteMin=2
 *   ?prixMax=150
 */
exports.listerChambres = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.disponible !== undefined) filtre.disponible = req.query.disponible === 'true';
    if (req.query.type) filtre.type = req.query.type;
    if (req.query.capaciteMin) filtre.capacite = { $gte: Number(req.query.capaciteMin) };
    if (req.query.prixMax) filtre.prixParNuit = { $lte: Number(req.query.prixMax) };

    const chambres = await Chambre.find(filtre).sort({ numero: 1 });
    return res.json({ total: chambres.length, data: chambres });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/** Recupere une chambre par son identifiant Mongo. */
exports.obtenirChambre = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }
    const chambre = await Chambre.findById(req.params.id);
    if (!chambre) return res.status(404).json({ error: 'Chambre introuvable' });
    return res.json(chambre);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/** Recupere une chambre par son numero metier (utilise par reservation-service). */
exports.obtenirChambreParNumero = async (req, res) => {
  try {
    const numero = Number(req.params.numero);
    if (Number.isNaN(numero)) return res.status(400).json({ error: 'Numero invalide' });
    const chambre = await Chambre.findOne({ numero });
    if (!chambre) return res.status(404).json({ error: `Chambre numero ${numero} introuvable` });
    return res.json(chambre);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/** Met a jour une chambre. */
exports.modifierChambre = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }
    if (req.body.numero !== undefined) {
      const conflit = await Chambre.findOne({ numero: req.body.numero, _id: { $ne: req.params.id } });
      if (conflit) return res.status(409).json({ error: `Numero ${req.body.numero} deja utilise` });
    }
    const chambre = await Chambre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!chambre) return res.status(404).json({ error: 'Chambre introuvable' });
    return res.json(chambre);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/** Supprime une chambre. */
exports.supprimerChambre = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }
    const chambre = await Chambre.findByIdAndDelete(req.params.id);
    if (!chambre) return res.status(404).json({ error: 'Chambre introuvable' });
    return res.json({ message: 'Chambre supprimee', chambre });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
