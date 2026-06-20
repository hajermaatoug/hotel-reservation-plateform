# Plateforme de Réservation d'Hôtel — Architecture Microservices

Application de réservation hôtelière construite en **microservices** avec Node.js / Express.js, MongoDB (une base par service), validation **Yup**, conteneurisation **Docker** et orchestration **Docker Compose**. Le routage passe par une **API Gateway** et la localisation des services par un **Service Discovery**.

## Architecture

```
                              ┌──────────────────────┐
        Client / Postman ───▶ │   API Gateway :5001  │
                              └───────────┬──────────┘
                                          │ résolution dynamique
                              ┌───────────▼──────────┐
                              │ Service Discovery     │
                              │        :4002          │
                              └───────────┬──────────┘
                          enregistrement / heartbeat
                ┌─────────────────────────┴─────────────────────────┐
                │                                                    │
   ┌────────────▼────────────┐                       ┌──────────────▼───────────┐
   │   chambre-service :3001  │ ◀── appel inter-svc ──│ reservation-service :3002 │
   └────────────┬────────────┘   (dispo / capacité)  └──────────────┬───────────┘
                │                                                    │
   ┌────────────▼────────────┐                       ┌──────────────▼───────────┐
   │ mongo-chambre  :27017    │                       │ mongo-reservation :27018  │
   └─────────────────────────┘                       └───────────────────────────┘
```

Chaque microservice possède **sa propre base MongoDB** (principe *database per service*).

## Stack technique

| Composant | Technologie |
|---|---|
| Runtime | Node.js 20 |
| Framework HTTP | Express.js 4 |
| ODM MongoDB | Mongoose 8 |
| Validation | Yup 1 |
| Client HTTP inter-service | Axios |
| Conteneurisation | Docker + Docker Compose |
| Tests fonctionnels | Postman |

## Ports

| Service | Port Express | Port MongoDB (hôte) |
|---|---|---|
| api-gateway | 5001 | — |
| service-discovery | 4002 | — |
| chambre-service | 3001 | 27017 |
| reservation-service | 3002 | 27018 |

> Sous Docker, les deux conteneurs MongoDB écoutent en interne sur 27017 ; ils sont exposés sur l'hôte aux ports 27017 et 27018 respectivement.

## Démarrage avec Docker (recommandé)

```bash
docker compose up --build
```

Cette commande construit et lance les 6 conteneurs (2 MongoDB, discovery, 2 microservices, gateway). Les microservices attendent que MongoDB soit *healthy* avant de démarrer, et se réenregistrent automatiquement auprès du discovery.

Arrêt :

```bash
docker compose down          # arrête et supprime les conteneurs
docker compose down -v       # + supprime les volumes de données
```

## Démarrage local (sans Docker, pour le développement)

Prérequis : deux instances MongoDB accessibles (ports 27017 et 27018).

```bash
# 1) Service Discovery
cd service-discovery && npm install && npm start

# 2) Chambre
cd chambre-service && npm install && npm start

# 3) Réservation
cd reservation-service && npm install && npm start

# 4) Gateway
cd api-gateway && npm install && npm start
```

Variables d'environnement par service (valeurs par défaut entre parenthèses) :

- `PORT`
- `MONGO_URI` (chambre : `mongodb://localhost:27017/chambres_db`, réservation : `mongodb://localhost:27018/reservations_db`)
- `DISCOVERY_URL` (`http://localhost:4002`)
- `SERVICE_HOST` (`localhost`) — hôte sous lequel le service s'annonce au discovery

## Tester avec Postman

Importer `postman_collection.json`. La variable `gateway` pointe par défaut sur `http://localhost:5001`. Les requêtes de création remplissent automatiquement `{{chambreId}}` et `{{reservationId}}` pour enchaîner GET / PUT / DELETE.

Ordre conseillé : créer la chambre 101 → créer la chambre 102 → créer une réservation → vérifier disponibilité → consulter les statistiques.

## Documentation détaillée

<!-- Small test commit -->

Voir `RAPPORT_TECHNIQUE.md` (liste exhaustive des endpoints, règles de validation, décisions de conception, lien GitHub).
