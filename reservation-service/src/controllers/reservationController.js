const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const { getChambreParNumero } = require('../config/chambreClient');

const MS_PAR_NUIT = 1000 * 60 * 60 * 24;

/** Nombre de nuits entre deux dates (arrondi superieur, minimum 1). */
function nombreNuits(dateDebut, dateFin) {
  const diff = new Date(dateFin) - new Date(dateDebut);
  return Math.max(1, Math.ceil(diff / MS_PAR_NUIT));
}

/**
 * Recherche les reservations qui chevauchent une periode pour une chambre.
 * Deux periodes [aD, aF] et [bD, bF] se chevauchent ssi aD < bF et bD < aF.
 * @param excludeId reservation a ignorer (cas de mise a jour)
 */
async function reservationsEnConflit(chambreNumero, dateDebut, dateFin, excludeId = null) {
  const filtre = {
    chambreNumero,
    dateDebut: { $lt: new Date(dateFin) },
    dateFin: { $gt: new Date(dateDebut) },
  };
  if (excludeId) filtre._id = { $ne: excludeId };
  return Reservation.find(filtre).sort({ dateDebut: 1 });
}

/** Cree une reservation apres controles metiers et inter-services. */
exports.creerReservation = async (req, res) => {
  try {
    const { chambreNumero, dateDebut, dateFin, nombrePersonnes } = req.body;

    // 1) La chambre existe-t-elle ? (appel au chambre-service)
    let chambre;
    try {
      chambre = await getChambreParNumero(chambreNumero);
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
    if (!chambre) {
      return res.status(404).json({ error: `Chambre numero ${chambreNumero} inexistante` });
    }

    // 2) La chambre est-elle operationnelle ?
    if (chambre.disponible === false) {
      return res.status(409).json({ error: `Chambre numero ${chambreNumero} indisponible (hors service)` });
    }

    // 3) Capacite suffisante ?
    if (nombrePersonnes > chambre.capacite) {
      return res.status(409).json({
        error: `Capacite depassee : la chambre accueille ${chambre.capacite} personne(s), demande ${nombrePersonnes}`,
      });
    }

    // 4) Aucun chevauchement de dates ?
    const conflits = await reservationsEnConflit(chambreNumero, dateDebut, dateFin);
    if (conflits.length > 0) {
      return res.status(409).json({
        error: 'Chambre deja reservee sur cette periode',
        conflits: conflits.map((c) => ({ id: c._id, dateDebut: c.dateDebut, dateFin: c.dateFin })),
      });
    }

    // 5) Calcul automatique du montant si non fourni.
    const nuits = nombreNuits(dateDebut, dateFin);
    const montantTotal =
      req.body.montantTotal !== undefined ? req.body.montantTotal : nuits * chambre.prixParNuit;

    const reservation = await Reservation.create({ ...req.body, montantTotal });
    return res.status(201).json({ reservation, details: { nuits, prixParNuit: chambre.prixParNuit } });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Liste les reservations avec filtres optionnels :
 *   ?chambreNumero=12  ?clientEmail=...  ?from=2026-01-01  ?to=2026-12-31
 */
exports.listerReservations = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.chambreNumero) filtre.chambreNumero = Number(req.query.chambreNumero);
    if (req.query.clientEmail) filtre.clientEmail = req.query.clientEmail.toLowerCase();
    if (req.query.from || req.query.to) {
      filtre.dateDebut = {};
      if (req.query.from) filtre.dateDebut.$gte = new Date(req.query.from);
      if (req.query.to) filtre.dateDebut.$lte = new Date(req.query.to);
    }
    const reservations = await Reservation.find(filtre).sort({ dateDebut: 1 });
    return res.json({ total: reservations.length, data: reservations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/** Statistiques globales (declaree avant /:id dans les routes). */
exports.statistiques = async (req, res) => {
  try {
    const [global] = await Reservation.aggregate([
      {
        $group: {
          _id: null,
          totalReservations: { $sum: 1 },
          chiffreAffairesTotal: { $sum: '$montantTotal' },
          montantMoyen: { $avg: '$montantTotal' },
          nombrePersonnesMoyen: { $avg: '$nombrePersonnes' },
          dureeMoyenneNuits: {
            $avg: {
              $divide: [{ $subtract: ['$dateFin', '$dateDebut'] }, MS_PAR_NUIT],
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]);

    const parChambre = await Reservation.aggregate([
      {
        $group: {
          _id: '$chambreNumero',
          nombreReservations: { $sum: 1 },
          chiffreAffaires: { $sum: '$montantTotal' },
        },
      },
      { $sort: { chiffreAffaires: -1 } },
      { $project: { _id: 0, chambreNumero: '$_id', nombreReservations: 1, chiffreAffaires: 1 } },
    ]);

    const parMois = await Reservation.aggregate([
      {
        $group: {
          _id: { annee: { $year: '$dateDebut' }, mois: { $month: '$dateDebut' } },
          nombreReservations: { $sum: 1 },
          chiffreAffaires: { $sum: '$montantTotal' },
        },
      },
      { $sort: { '_id.annee': 1, '_id.mois': 1 } },
      {
        $project: {
          _id: 0,
          annee: '$_id.annee',
          mois: '$_id.mois',
          nombreReservations: 1,
          chiffreAffaires: 1,
        },
      },
    ]);

    return res.json({
      global: global || {
        totalReservations: 0,
        chiffreAffairesTotal: 0,
        montantMoyen: 0,
        nombrePersonnesMoyen: 0,
        dureeMoyenneNuits: 0,
      },
      parChambre,
      parMois,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Verifie la disponibilite d'une chambre sur une periode.
 * Corps : { chambreNumero, dateDebut, dateFin }
 */
exports.verifierDisponibilite = async (req, res) => {
  try {
    const { chambreNumero, dateDebut, dateFin } = req.body;

    let chambre;
    try {
      chambre = await getChambreParNumero(chambreNumero);
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
    if (!chambre) {
      return res.status(404).json({ error: `Chambre numero ${chambreNumero} inexistante` });
    }

    if (chambre.disponible === false) {
      return res.json({ disponible: false, raison: 'Chambre hors service', conflits: [] });
    }

    const conflits = await reservationsEnConflit(chambreNumero, dateDebut, dateFin);
    return res.json({
      disponible: conflits.length === 0,
      raison: conflits.length === 0 ? 'Disponible' : 'Periode deja reservee',
      conflits: conflits.map((c) => ({ id: c._id, dateDebut: c.dateDebut, dateFin: c.dateFin })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/** Recupere une reservation par identifiant. */
exports.obtenirReservation = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation introuvable' });
    return res.json(reservation);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/** Met a jour une reservation (re-controle des chevauchements si dates/chambre changent). */
exports.modifierReservation = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }
    const existante = await Reservation.findById(req.params.id);
    if (!existante) return res.status(404).json({ error: 'Reservation introuvable' });

    const chambreNumero = req.body.chambreNumero ?? existante.chambreNumero;
    const dateDebut = req.body.dateDebut ?? existante.dateDebut;
    const dateFin = req.body.dateFin ?? existante.dateFin;

    if (new Date(dateFin) <= new Date(dateDebut)) {
      return res.status(400).json({ error: 'dateFin doit etre strictement posterieure a dateDebut' });
    }

    const conflits = await reservationsEnConflit(chambreNumero, dateDebut, dateFin, existante._id);
    if (conflits.length > 0) {
      return res.status(409).json({ error: 'Chambre deja reservee sur cette periode', conflits });
    }

    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    return res.json(reservation);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/** Supprime une reservation. */
exports.supprimerReservation = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation introuvable' });
    return res.json({ message: 'Reservation supprimee', reservation });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
