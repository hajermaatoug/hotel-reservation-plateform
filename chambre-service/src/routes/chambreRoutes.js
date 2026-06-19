const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chambreController');
const validate = require('../middlewares/validate');
const { creationChambreSchema, majChambreSchema } = require('../validators/chambreValidator');

// Creation + liste
router.post('/', validate(creationChambreSchema), ctrl.creerChambre);
router.get('/', ctrl.listerChambres);

// Recherche par numero metier (doit etre declaree avant /:id)
router.get('/numero/:numero', ctrl.obtenirChambreParNumero);

// Operations par identifiant Mongo
router.get('/:id', ctrl.obtenirChambre);
router.put('/:id', validate(majChambreSchema), ctrl.modifierChambre);
router.delete('/:id', ctrl.supprimerChambre);

module.exports = router;
