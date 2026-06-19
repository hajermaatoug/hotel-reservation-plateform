/**
 * Middleware de validation base sur un schema Yup.
 * En cas d'erreur : 400 avec le detail de toutes les violations.
 * En cas de succes : remplace req.body par la valeur validee/typee.
 */
const validate = (schema) => async (req, res, next) => {
  try {
    const valeurValidee = await schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    req.body = valeurValidee;
    next();
  } catch (err) {
    return res.status(400).json({
      error: 'Validation echouee',
      details: err.errors || [err.message],
    });
  }
};

module.exports = validate;
