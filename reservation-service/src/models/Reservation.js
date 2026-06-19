const mongoose = require('mongoose');

/**
 * Note de conception :
 * Le cahier des charges liste 6 attributs metiers. Pour rendre la
 * "verification de disponibilite des chambres" fonctionnelle, on ajoute
 * le champ "chambreNumero" qui rattache la reservation a une chambre.
 * Sans ce lien, une reservation ne peut etre confrontee a aucune chambre.
 */
const reservationSchema = new mongoose.Schema(
  {
    clientNom: {
      type: String,
      required: [true, 'Le nom du client est requis'],
      minlength: [3, 'Le nom du client doit faire au moins 3 caracteres'],
      trim: true,
    },
    clientEmail: {
      type: String,
      required: [true, 'L\'email du client est requis'],
      trim: true,
      lowercase: true,
    },
    chambreNumero: {
      type: Number,
      required: [true, 'Le numero de chambre est requis'],
      min: [1, 'Le numero de chambre doit etre > 0'],
    },
    dateDebut: {
      type: Date,
      required: [true, 'La date de debut est requise'],
    },
    dateFin: {
      type: Date,
      required: [true, 'La date de fin est requise'],
    },
    nombrePersonnes: {
      type: Number,
      required: [true, 'Le nombre de personnes est requis'],
      min: [1, 'Le nombre de personnes doit etre >= 1'],
    },
    montantTotal: {
      type: Number,
      min: [0, 'Le montant total doit etre >= 0'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Validation au niveau document : dateFin strictement apres dateDebut.
reservationSchema.pre('validate', function (next) {
  if (this.dateDebut && this.dateFin && this.dateFin <= this.dateDebut) {
    return next(new Error('dateFin doit etre strictement posterieure a dateDebut'));
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
