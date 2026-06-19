const mongoose = require('mongoose');

const chambreSchema = new mongoose.Schema(
  {
    numero: {
      type: Number,
      required: [true, 'Le numero est requis'],
      unique: true,
      min: [1, 'Le numero doit etre > 0'],
    },
    prixParNuit: {
      type: Number,
      required: [true, 'Le prix par nuit est requis'],
      min: [0.01, 'Le prix par nuit doit etre > 0'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    capacite: {
      type: Number,
      required: [true, 'La capacite est requise'],
      min: [1, 'La capacite doit etre >= 1'],
      max: [10, 'La capacite doit etre <= 10'],
    },
    type: {
      type: String,
      required: [true, 'Le type est requis'],
      enum: {
        values: ['Simple', 'Double', 'Suite'],
        message: 'Le type doit etre Simple, Double ou Suite',
      },
    },
    disponible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Chambre', chambreSchema);
