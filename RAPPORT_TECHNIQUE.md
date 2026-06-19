# Rapport Technique — Plateforme de Réservation d'Hôtel

## 1. Lien GitHub

> **Dépôt :** `https://github.com/<votre-compte>/hotel-reservation-platform`
>
> *(À remplacer par l'URL réelle après `git init`, `git add .`, `git commit`, puis `git push`.)*

## 2. Vue d'ensemble

Architecture microservices composée de deux services métiers (`chambre-service`, `reservation-service`), chacun avec sa propre base MongoDB, d'un `service-discovery` (registre de services en mémoire) et d'une `api-gateway` (point d'entrée unique). La validation des entrées s'appuie sur **Yup**, l'ensemble est conteneurisé via **Docker** et orchestré par **Docker Compose**.

## 3. Endpoints

Tous les endpoints sont accessibles via la passerelle, préfixe `/api`. Base : `http://localhost:5001`.

### 3.1 Infrastructure

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/health` | État de la passerelle + services connus |
| GET | `/api/services` | Liste des services enregistrés (relai discovery) |

### 3.2 Chambres — `chambre-service`

| Méthode | Endpoint (via gateway) | Endpoint (direct :3001) | Description |
|---|---|---|---|
| POST | `/api/chambres` | `/chambres` | Créer une chambre |
| GET | `/api/chambres` | `/chambres` | Lister (filtres : `disponible`, `type`, `capaciteMin`, `prixMax`) |
| GET | `/api/chambres/:id` | `/chambres/:id` | Obtenir par identifiant Mongo |
| GET | `/api/chambres/numero/:numero` | `/chambres/numero/:numero` | Obtenir par numéro métier |
| PUT | `/api/chambres/:id` | `/chambres/:id` | Modifier |
| DELETE | `/api/chambres/:id` | `/chambres/:id` | Supprimer |

### 3.3 Réservations — `reservation-service`

| Méthode | Endpoint (via gateway) | Endpoint (direct :3002) | Description |
|---|---|---|---|
| POST | `/api/reservations` | `/reservations` | Créer (contrôles métiers + montant auto) |
| GET | `/api/reservations` | `/reservations` | Lister (filtres : `chambreNumero`, `clientEmail`, `from`, `to`) |
| GET | `/api/reservations/statistiques` | `/reservations/statistiques` | Statistiques globales |
| POST | `/api/reservations/disponibilite` | `/reservations/disponibilite` | Vérifier la disponibilité d'une chambre sur une période |
| GET | `/api/reservations/:id` | `/reservations/:id` | Obtenir par identifiant |
| PUT | `/api/reservations/:id` | `/reservations/:id` | Modifier |
| DELETE | `/api/reservations/:id` | `/reservations/:id` | Supprimer |

### 3.4 Service Discovery — `:4002`

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/register` | Enregistrer un service `{ name, host, port }` |
| PUT | `/heartbeat/:name` | Signal de vie |
| DELETE | `/register/:name` | Désenregistrer |
| GET | `/discover/:name` | Localiser un service |
| GET | `/services` | Lister les services actifs |

## 4. Modèles de données

### Chambre

| Attribut | Type | Contraintes |
|---|---|---|
| numero | Number | requis, unique, > 0 |
| prixParNuit | Number | requis, > 0 |
| description | String | optionnel |
| capacite | Number | requis, 1 ≤ x ≤ 10 |
| type | String | requis, ∈ {Simple, Double, Suite} |
| disponible | Boolean | défaut `true` |

### Réservation

| Attribut | Type | Contraintes |
|---|---|---|
| clientNom | String | requis, ≥ 3 caractères |
| clientEmail | String | requis, email valide |
| chambreNumero | Number | requis, > 0 *(voir §6)* |
| dateDebut | Date | requis |
| dateFin | Date | requis, strictement > dateDebut |
| nombrePersonnes | Number | requis, ≥ 1 |
| montantTotal | Number | optionnel — calculé : `nuits × prixParNuit` |

## 5. Règles de validation (Yup)

**Chambre** : `numero > 0`, `prixParNuit > 0`, `capacite ∈ [1, 10]`, `type ∈ {Simple, Double, Suite}`.

**Réservation** : `clientNom ≥ 3 caractères`, `clientEmail` au format email, `dateFin > dateDebut` (strict), `nombrePersonnes ≥ 1`.

La validation retourne un statut **400** avec le détail de **toutes** les violations simultanément (`abortEarly: false`). Les champs inconnus sont ignorés (`stripUnknown`).

## 6. Décisions de conception

**Ajout du champ `chambreNumero` à la réservation.** Le cahier des charges liste six attributs pour la réservation, sans lien vers une chambre. Or la « vérification de disponibilité des chambres » exige de rattacher une réservation à une chambre. Le champ `chambreNumero` a donc été ajouté ; sans lui, aucune vérification de disponibilité ni statistique par chambre n'est possible.

**Contrôles métiers à la création d'une réservation.** Le `reservation-service` interroge le `chambre-service` (via le discovery) pour : (a) vérifier l'existence de la chambre → 404 sinon ; (b) vérifier qu'elle est opérationnelle (`disponible`) → 409 sinon ; (c) contrôler la capacité → 409 si dépassée ; (d) détecter les chevauchements de dates → 409 sinon. Deux périodes se chevauchent ssi `dateDebut_A < dateFin_B` et `dateDebut_B < dateFin_A`.

**Calcul automatique du montant.** Si `montantTotal` n'est pas fourni, il vaut `nombre_de_nuits × prixParNuit` (la chambre étant récupérée auprès du `chambre-service`).

**Service Discovery + Gateway.** Les services s'enregistrent au démarrage et envoient un heartbeat toutes les 15 s ; les entrées expirées sont purgées. La gateway met en cache les URLs (rafraîchissement toutes les 10 s) et relaie le code de statut renvoyé par le service cible. Les appels inter-services passent directement par le discovery, non par la gateway publique.

**Une base par service.** `chambre-service` et `reservation-service` ne partagent pas de base de données, conformément au principe d'isolation des données en microservices.

**Robustesse Docker.** Connexion MongoDB avec ré-essais (jusqu'à 12 tentatives) ; `depends_on` avec `condition: service_healthy` sur les bases ; ré-enregistrement automatique si le discovery redémarre.

## 7. Statistiques produites

`GET /api/reservations/statistiques` retourne :

- **global** : nombre total de réservations, chiffre d'affaires total, montant moyen, nombre de personnes moyen, durée moyenne (nuits) ;
- **parChambre** : nombre de réservations et chiffre d'affaires par `chambreNumero`, trié par CA décroissant ;
- **parMois** : nombre de réservations et chiffre d'affaires par (année, mois).

Toutes ces métriques sont calculées via le *aggregation framework* de MongoDB.

## 8. Validation fonctionnelle réalisée

Scénario de bout en bout exécuté via la gateway (résultats observés) :

| Cas | Résultat |
|---|---|
| Création chambre valide | 201 |
| Création chambre invalide (capacité 99, type inconnu) | 400 + détail des 2 erreurs |
| Réservation valide (3 nuits, chambre à 120) | 201, `montantTotal = 360` |
| Réservation chevauchant une existante | 409 + conflits |
| Réservation dépassant la capacité | 409 |
| Réservation sur chambre inexistante | 404 (appel inter-service) |
| `dateFin = dateDebut` | 400 |
| Vérification disponibilité (période occupée / libre) | `false` / `true` |
| Statistiques (2 réservations) | CA total 600, moyenne 300, ventilations correctes |
| Mise à jour / suppression | 200 |

## 9. Livrables

- Code source complet (`service-discovery/`, `chambre-service/`, `reservation-service/`, `api-gateway/`)
- `docker-compose.yml`
- `postman_collection.json`
- `README.md` (démarrage) et le présent rapport technique
