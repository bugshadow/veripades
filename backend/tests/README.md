# Suite de tests backend

Cette suite utilise Jest et supertest. Les tests unitaires couvrent les fonctions pures de hachage/comparaison et JWT. Les tests d'integration appellent les endpoints Express sans lancer le serveur HTTP a la main.

## Commandes

- `npm test` : lance toute la suite avec `jest --runInBand` (depuis l'hote, les tests crypto sign-verify echouent car le microservice Python est dans Docker).
- `npm run test:unit` : lance uniquement `tests/unit`.
- `npm run test:integration` : lance uniquement `tests/integration`.
- `npm run test:integration:docker` : lance tous les tests d'integration **dans Docker** (recommande). Appelle le vrai microservice cryptographique.
- `npm run test:docker` : lance toute la suite dans le conteneur API Docker.
- `npm run test:coverage` : genere le rapport de couverture Jest.

`--runInBand` est volontaire : les tests d'integration partagent une base PostgreSQL de test et la nettoient entre les tests. L'execution sequentielle evite les conflits de connexions et les truncates concurrents.

## Tests d'integration crypto (upload -> sign -> verify)

Le fichier `tests/integration/documents.sign-verify.test.js` teste le flux complet :
1. Upload d'un PDF et creation en base
2. Signature via le microservice Python reel (pas de mock)
3. Verification d'integrite (intact/altered)
4. Flux complet upload -> sign -> verify en sequence
5. Rejet double signature
6. Rejet sans signerId

**Ces tests appellent le vrai microservice cryptographique** (appels axios vers `http://localhost:8000/sign` et `/verify`). Ils doivent etre executes dans Docker (`npm run test:integration:docker`) car le backend et le microservice crypto partagent le volume `/app/storage` pour les fichiers PDF.

Depuis l'hote, `npm test` lance tous les tests sauf les tests crypto qui echoueront avec un timeout (le microservice crypto n'est pas joignable directement depuis l'hote pour les operations sign/verify).

## Base de donnees de test

Les tests d'integration utilisent uniquement une base dediee dont le nom doit contenir `test`. Par defaut :

`postgres://postgres:motdepassefort@localhost:5433/poc_signature_test`

Si cette base n'existe pas, `tests/setup/testDatabase.js` la cree automatiquement depuis la base d'administration `postgres`, puis cree le schema minimal du POC. Le garde-fou refuse toute URL dont le nom de base ne contient pas `test`, ce qui empeche d'executer Jest contre la base de developpement ou de production.

Pour personnaliser :

`TEST_DATABASE_URL=postgres://postgres:motdepassefort@localhost:5433/poc_signature_test npm test`

## Nettoyage

`tests/setup/jest.setup.js` prepare la base avant chaque suite d'integration, puis vide `users`, `documents`, `certificates`, `signatures` et `timestamps` apres chaque test. Le stockage PDF de test est limite a `tests/tmp/storage` et nettoye entre les tests. Dans Docker, le stockage utilise `/app/storage` (volume partage avec le microservice crypto).

## Lire un echec

Jest affiche le nom du fichier, le `describe`, le `it` en langage clair, puis la difference entre resultat attendu et resultat obtenu. Pour debugger un seul fichier, lancer par exemple :

`npx jest tests/integration/auth.login.test.js --runInBand`

