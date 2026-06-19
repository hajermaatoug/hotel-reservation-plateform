const yup = require('yup');

const TYPES = ['Simple', 'Double', 'Suite'];

/**
 * Schema de creation : tous les champs metiers obligatoires.
 *   numero > 0
 *   prixParNuit > 0
 *   capacite entre 1 et 10
 *   type in {Simple, Double, Suite}
 */
const creationChambreSchema = yup.object({
  numero: yup
    .number()
    .typeError('numero doit etre un nombre')
    .integer('numero doit etre entier')
    .positive('numero doit etre > 0')
    .required('numero est requis'),
  prixParNuit: yup
    .number()
    .typeError('prixParNuit doit etre un nombre')
    .positive('prixParNuit doit etre > 0')
    .required('prixParNuit est requis'),
  description: yup.string().trim().default(''),
  capacite: yup
    .number()
    .typeError('capacite doit etre un nombre')
    .integer('capacite doit etre entier')
    .min(1, 'capacite doit etre >= 1')
    .max(10, 'capacite doit etre <= 10')
    .required('capacite est requise'),
  type: yup
    .string()
    .oneOf(TYPES, `type doit etre l'un de : ${TYPES.join(', ')}`)
    .required('type est requis'),
  disponible: yup.boolean().default(true),
});

/**
 * Schema de mise a jour : memes contraintes mais tous les champs optionnels.
 */
const majChambreSchema = yup.object({
  numero: yup.number().typeError('numero doit etre un nombre').integer().positive('numero doit etre > 0'),
  prixParNuit: yup.number().typeError('prixParNuit doit etre un nombre').positive('prixParNuit doit etre > 0'),
  description: yup.string().trim(),
  capacite: yup.number().typeError('capacite doit etre un nombre').integer().min(1, 'capacite >= 1').max(10, 'capacite <= 10'),
  type: yup.string().oneOf(TYPES, `type doit etre l'un de : ${TYPES.join(', ')}`),
  disponible: yup.boolean(),
}).noUnknown();

module.exports = { creationChambreSchema, majChambreSchema };
