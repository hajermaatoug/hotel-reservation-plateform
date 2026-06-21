const swaggerJsdoc = require('swagger-jsdoc');

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Reservation Platform',
      version: '1.0.0',
      description: 'API Gateway — routes vers chambre-service et reservation-service',
    },
    servers: [{ url: 'http://localhost:5001', description: 'API Gateway local' }],
    tags: [
      { name: 'Chambres', description: 'Gestion des chambres' },
      { name: 'Reservations', description: 'Gestion des reservations' },
    ],
    components: {
      schemas: {
        Chambre: {
          type: 'object',
          properties: {
            _id:         { type: 'string', example: '64a1f2b3c4d5e6f7a8b9c0d1' },
            numero:      { type: 'integer', example: 101 },
            prixParNuit: { type: 'number', example: 89.99 },
            description: { type: 'string', example: 'Vue sur mer, lit king-size' },
            capacite:    { type: 'integer', example: 2 },
            type:        { type: 'string', enum: ['Simple', 'Double', 'Suite'], example: 'Double' },
            disponible:  { type: 'boolean', example: true },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
        ChambreInput: {
          type: 'object',
          required: ['numero', 'prixParNuit', 'capacite', 'type'],
          properties: {
            numero:      { type: 'integer', example: 101 },
            prixParNuit: { type: 'number', example: 89.99 },
            description: { type: 'string', example: 'Vue sur mer, lit king-size' },
            capacite:    { type: 'integer', minimum: 1, maximum: 10, example: 2 },
            type:        { type: 'string', enum: ['Simple', 'Double', 'Suite'], example: 'Double' },
            disponible:  { type: 'boolean', default: true },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            _id:             { type: 'string', example: '64a1f2b3c4d5e6f7a8b9c0d2' },
            clientNom:       { type: 'string', example: 'Alice Martin' },
            clientEmail:     { type: 'string', example: 'alice@example.com' },
            chambreNumero:   { type: 'integer', example: 101 },
            dateDebut:       { type: 'string', format: 'date', example: '2024-08-01' },
            dateFin:         { type: 'string', format: 'date', example: '2024-08-05' },
            nombrePersonnes: { type: 'integer', example: 2 },
            montantTotal:    { type: 'number', example: 359.96 },
            createdAt:       { type: 'string', format: 'date-time' },
            updatedAt:       { type: 'string', format: 'date-time' },
          },
        },
        ReservationInput: {
          type: 'object',
          required: ['clientNom', 'clientEmail', 'chambreNumero', 'dateDebut', 'dateFin', 'nombrePersonnes'],
          properties: {
            clientNom:       { type: 'string', minLength: 3, example: 'Alice Martin' },
            clientEmail:     { type: 'string', format: 'email', example: 'alice@example.com' },
            chambreNumero:   { type: 'integer', example: 101 },
            dateDebut:       { type: 'string', format: 'date', example: '2024-08-01' },
            dateFin:         { type: 'string', format: 'date', example: '2024-08-05' },
            nombrePersonnes: { type: 'integer', minimum: 1, example: 2 },
            montantTotal:    { type: 'number', minimum: 0, example: 359.96 },
          },
        },
        DisponibiliteInput: {
          type: 'object',
          required: ['chambreNumero', 'dateDebut', 'dateFin'],
          properties: {
            chambreNumero: { type: 'integer', example: 101 },
            dateDebut:     { type: 'string', format: 'date', example: '2024-08-01' },
            dateFin:       { type: 'string', format: 'date', example: '2024-08-05' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    paths: {
      // ─── CHAMBRES ────────────────────────────────────────────────
      '/api/chambres': {
        get: {
          tags: ['Chambres'],
          summary: 'Lister toutes les chambres',
          responses: {
            200: { description: 'Liste des chambres', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Chambre' } } } } },
          },
        },
        post: {
          tags: ['Chambres'],
          summary: 'Creer une chambre',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChambreInput' } } } },
          responses: {
            201: { description: 'Chambre creee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Chambre' } } } },
            400: { description: 'Erreur de validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/chambres/numero/{numero}': {
        get: {
          tags: ['Chambres'],
          summary: 'Obtenir une chambre par son numero metier',
          parameters: [{ name: 'numero', in: 'path', required: true, schema: { type: 'integer' }, example: 101 }],
          responses: {
            200: { description: 'Chambre trouvee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Chambre' } } } },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/chambres/{id}': {
        get: {
          tags: ['Chambres'],
          summary: 'Obtenir une chambre par son ID MongoDB',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '64a1f2b3c4d5e6f7a8b9c0d1' }],
          responses: {
            200: { description: 'Chambre trouvee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Chambre' } } } },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Chambres'],
          summary: 'Mettre a jour une chambre',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChambreInput' } } } },
          responses: {
            200: { description: 'Chambre mise a jour', content: { 'application/json': { schema: { $ref: '#/components/schemas/Chambre' } } } },
            400: { description: 'Erreur de validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        delete: {
          tags: ['Chambres'],
          summary: 'Supprimer une chambre',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Chambre supprimee' },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      // ─── RESERVATIONS ────────────────────────────────────────────
      '/api/reservations': {
        get: {
          tags: ['Reservations'],
          summary: 'Lister toutes les reservations',
          responses: {
            200: { description: 'Liste des reservations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Reservation' } } } } },
          },
        },
        post: {
          tags: ['Reservations'],
          summary: 'Creer une reservation',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReservationInput' } } } },
          responses: {
            201: { description: 'Reservation creee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } } },
            400: { description: 'Erreur de validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/reservations/statistiques': {
        get: {
          tags: ['Reservations'],
          summary: 'Statistiques des reservations',
          responses: {
            200: { description: 'Statistiques', content: { 'application/json': { schema: { type: 'object' } } } },
          },
        },
      },
      '/api/reservations/disponibilite': {
        post: {
          tags: ['Reservations'],
          summary: 'Verifier la disponibilite d\'une chambre sur une periode',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DisponibiliteInput' } } } },
          responses: {
            200: { description: 'Resultat disponibilite', content: { 'application/json': { schema: { type: 'object', properties: { disponible: { type: 'boolean' } } } } } },
            400: { description: 'Erreur de validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/reservations/{id}': {
        get: {
          tags: ['Reservations'],
          summary: 'Obtenir une reservation par ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Reservation trouvee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } } },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Reservations'],
          summary: 'Mettre a jour une reservation',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReservationInput' } } } },
          responses: {
            200: { description: 'Reservation mise a jour', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } } },
            400: { description: 'Erreur de validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        delete: {
          tags: ['Reservations'],
          summary: 'Supprimer une reservation',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Reservation supprimee' },
            404: { description: 'Introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  },
  apis: [],
});

module.exports = spec;
