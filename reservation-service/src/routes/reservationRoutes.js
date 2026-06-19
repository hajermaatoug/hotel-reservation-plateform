const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reservationController');
const validate = require('../middlewares/validate');
const {
  creationReservationSchema,
  majReservationSchema,
  disponibiliteSchema,
} = require('../validators/reservationValidator');

// Creation + liste
router.post('/', validate(creationReservationSchema), ctrl.creerReservation);
router.get('/', ctrl.listerReservations);

// Routes "litterales" : doivent precéder /:id pour ne pas etre captees comme un id
router.get('/statistiques', ctrl.statistiques);
router.post('/disponibilite', validate(disponibiliteSchema), ctrl.verifierDisponibilite);

// Operations par identifiant
router.get('/:id', ctrl.obtenirReservation);
router.put('/:id', validate(majReservationSchema), ctrl.modifierReservation);
router.delete('/:id', ctrl.supprimerReservation);

module.exports = router;
