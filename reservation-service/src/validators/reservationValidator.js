const yup = require('yup');

/**
 * Test reutilisable : dateFin > dateDebut (strict).
 */
function dateFinApresDebut(value) {
  const { dateDebut } = this.parent;
  if (!value || !dateDebut) return true; // laisse "required" gerer l'absence
  return new Date(value) > new Date(dateDebut);
}

/**
 * Creation :
 *   clientNom >= 3 caracteres
 *   email valide
 *   dateFin > dateDebut
 *   nombrePersonnes >= 1
 *   montantTotal optionnel (calcule automatiquement si absent)
 */
const creationReservationSchema = yup.object({
  clientNom: yup
    .string()
    .trim()
    .min(3, 'clientNom doit faire au moins 3 caracteres')
    .required('clientNom est requis'),
  clientEmail: yup
    .string()
    .trim()
    .email('clientEmail doit etre un email valide')
    .required('clientEmail est requis'),
  chambreNumero: yup
    .number()
    .typeError('chambreNumero doit etre un nombre')
    .integer('chambreNumero doit etre entier')
    .positive('chambreNumero doit etre > 0')
    .required('chambreNumero est requis'),
  dateDebut: yup.date().typeError('dateDebut invalide').required('dateDebut est requise'),
  dateFin: yup
    .date()
    .typeError('dateFin invalide')
    .required('dateFin est requise')
    .test('apres-debut', 'dateFin doit etre strictement posterieure a dateDebut', dateFinApresDebut),
  nombrePersonnes: yup
    .number()
    .typeError('nombrePersonnes doit etre un nombre')
    .integer('nombrePersonnes doit etre entier')
    .min(1, 'nombrePersonnes doit etre >= 1')
    .required('nombrePersonnes est requis'),
  montantTotal: yup.number().typeError('montantTotal doit etre un nombre').min(0, 'montantTotal >= 0').optional(),
});

/**
 * Mise a jour : champs optionnels, memes contraintes.
 */
const majReservationSchema = yup.object({
  clientNom: yup.string().trim().min(3, 'clientNom >= 3 caracteres'),
  clientEmail: yup.string().trim().email('email invalide'),
  chambreNumero: yup.number().typeError('chambreNumero doit etre un nombre').integer().positive(),
  dateDebut: yup.date().typeError('dateDebut invalide'),
  dateFin: yup
    .date()
    .typeError('dateFin invalide')
    .test('apres-debut', 'dateFin doit etre strictement posterieure a dateDebut', function (value) {
      const { dateDebut } = this.parent;
      if (!value || !dateDebut) return true;
      return new Date(value) > new Date(dateDebut);
    }),
  nombrePersonnes: yup.number().typeError('nombrePersonnes doit etre un nombre').integer().min(1),
  montantTotal: yup.number().typeError('montantTotal doit etre un nombre').min(0),
}).noUnknown();

/**
 * Verification de disponibilite (corps de POST /reservations/disponibilite).
 */
const disponibiliteSchema = yup.object({
  chambreNumero: yup.number().typeError('chambreNumero doit etre un nombre').integer().positive().required('chambreNumero est requis'),
  dateDebut: yup.date().typeError('dateDebut invalide').required('dateDebut est requise'),
  dateFin: yup
    .date()
    .typeError('dateFin invalide')
    .required('dateFin est requise')
    .test('apres-debut', 'dateFin doit etre strictement posterieure a dateDebut', dateFinApresDebut),
});

module.exports = { creationReservationSchema, majReservationSchema, disponibiliteSchema };
