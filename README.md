# FretPéi — transport de marchandises à La Réunion

Plateforme qui met en relation des clients (particuliers, magasins, entreprises) avec des transporteurs
professionnels équipés d'utilitaires. Le prix est fixé par la plateforme, le client paie en ligne,
le transporteur est payé après la livraison et la plateforme garde sa commission.

> Le nom « FretPéi » est provisoire : il se change dans `src/lib/config.ts` et `capacitor.config.ts`.

## Modèle économique (paramètres dans `src/lib/pricing.ts`)

| Levier | Valeur actuelle |
|---|---|
| Commission sur le transport | 20 % |
| Frais de service client | 3,90 € |
| Majoration heure de pointe (lun–ven 6h30–8h30, 15h30–18h30) | +15 % |
| Express | +25 % |
| Aide à la manutention / étage sans ascenseur / assurance renforcée | 35 € / 8 € / 9 € |

Le client paie **avant** la course ; le transporteur est payé **après** la livraison validée par le
code client à 4 chiffres. La trésorerie reste positive à tout moment.

## Parcours

- **`/`** — réservation (ordinateur pour les magasins, mobile pour les particuliers) avec prix en direct, puis paiement Stripe.
- **`/suivi/<jeton>`** — suivi de la commande par le client, avec le code de livraison.
- **`/transporteur`** — inscription (SIRET, registre des transporteurs, assurance), activation des virements Stripe, courses disponibles, acceptation, chargement, livraison avec le code.
- **`/admin`** — chiffre d'affaires et marge du mois, validation des transporteurs, commandes, annulations, relance des virements.
- **`/connexion`** — connexion sans mot de passe par lien e-mail (transporteurs et admin).

## Stack

Next.js 15 (App Router, Server Actions) · PostgreSQL 16 · Stripe Checkout + Connect Express · Tailwind CSS ·
MapLibre + OpenFreeMap (cartes) · Base Adresse Nationale (adresses) · Firebase Cloud Messaging (notifications) ·
Docker Compose sur VPS (cohabite avec les autres applications du serveur) · Capacitor (app mobile).

Aucun service payant hors Stripe : la base, l'hébergement et les e-mails tournent sur le VPS et la messagerie Hostinger.

## Développement local

```bash
npm install
cp .env.example .env.local      # renseigner DATABASE_URL vers un PostgreSQL local
node --env-file=.env.local scripts/migrer.mjs
npm run dev                     # http://localhost:3000
```

Sans SMTP, les liens de connexion s'affichent dans le terminal. Sans Stripe, `PAIEMENT_DEMO=1` simule le paiement.

## Mise en ligne sur le VPS Hostinger (une seule fois)

1. **DNS** : chez le registraire du domaine, créer un enregistrement `A` vers l'IP du VPS (et `www` aussi).
2. **Préparer le VPS** (en `root` via SSH) :
   ```bash
   docker --version || curl -fsSL https://get.docker.com | sh   # n'installe Docker que s'il manque
   adduser --disabled-password --gecos "" deploy
   usermod -aG docker deploy
   mkdir -p /opt/fretpei /home/deploy/.ssh && chown deploy:deploy /opt/fretpei
   ```
3. **Clé de déploiement** (sur ton ordinateur) : `ssh-keygen -t ed25519 -f fretpei_deploy -N ""`,
   puis coller le contenu de `fretpei_deploy.pub` dans `/home/deploy/.ssh/authorized_keys` sur le VPS
   (`chown -R deploy:deploy /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys`).
4. **Secrets du serveur** : créer `/opt/fretpei/.env` à partir de `.env.example`
   (mot de passe PostgreSQL long et aléatoire : `openssl rand -base64 32`), puis `chmod 600 /opt/fretpei/.env`.
5. **Secrets GitHub** (*Settings → Secrets and variables → Actions*) : `VPS_HOST` (IP), `VPS_USER` (`deploy`),
   `VPS_SSH_KEY` (contenu de la clé privée `fretpei_deploy`), et `VPS_PORT` si SSH n'est pas sur le port 22.
6. **Pousser sur `main`** : GitHub Actions vérifie le code (lint, tests, build), l'envoie sur le VPS et
   relance les conteneurs. Les migrations de base s'appliquent automatiquement au démarrage.

Ensuite, **chaque push sur `main` met le site (et l'app mobile) à jour automatiquement.**

### Cohabitation avec les autres applications du VPS

- Tout est isolé sous le nom de projet Docker `fretpei` et le dossier `/opt/fretpei` : le déploiement ne touche rien d'autre.
- Aucun port public n'est pris : l'app écoute sur `127.0.0.1:3100` (modifiable via `APP_PORT`), la base n'est pas exposée.
- Le HTTPS passe par le reverse proxy déjà en place :
  - **Nginx** : modèle prêt dans `deploy/nginx-fretpei.conf` (+ `certbot --nginx` pour le certificat) ;
  - **Traefik / Coolify / autre** : déclarer le domaine vers `http://127.0.0.1:3100`.
- Serveur vierge uniquement : `docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d` ajoute Caddy (ports 80/443, HTTPS automatique).
- Mémoire limitée à 1 Go pour l'app et 1 Go pour la base, pour ne pas pénaliser les autres services.

### Devenir administrateur

Se connecter une fois sur `/connexion`, puis sur le VPS :

```bash
cd /opt/fretpei && docker compose exec db psql -U fretpei -c \
  "update utilisateurs set role = 'admin' where email = 'votre@email.fr';"
```

### Sauvegardes

Le service `sauvegarde` fait un `pg_dump` quotidien dans `/opt/fretpei/sauvegardes` (14 jours conservés).
Restauration : `docker compose exec -T db pg_restore -U fretpei -d fretpei --clean < sauvegardes/<fichier>.dump`.
Pense à copier régulièrement ce dossier hors du VPS.

### Stripe

1. Activer **Connect** dans le tableau de bord Stripe (type de compte : Express).
2. Ajouter un webhook vers `https://<domaine>/api/stripe/webhook` avec les événements
   `checkout.session.completed` et `account.updated` (cocher « événements des comptes connectés » pour ce dernier),
   puis copier son secret dans `STRIPE_WEBHOOK_SECRET`.

## Application mobile (iOS / Android)

Coque Capacitor 8 (`android/`, `ios/`, `capacitor.config.ts`) qui charge la plateforme en ligne :
**une modification du site met à jour l'app sans republier sur les stores.** Les fonctions natives
passent par des plugins : GPS en arrière-plan (`@capacitor-community/background-geolocation`),
notifications (`@capacitor/push-notifications`).

L'adresse chargée par l'app se règle dans `capacitor.config.ts` (`server.url`) ou via `CAPACITOR_SERVER_URL`.
⚠️ L'identifiant `re.fretpei.app` est **définitif** une fois publié : à valider avant la première mise en ligne.

### Android : APK de test

Chaque modification de `android/`, `mobile/` ou `capacitor.config.ts` sur `main` lance
**Actions → App Android** (ou lancement manuel : *Run workflow*). L'APK de test se télécharge dans
les *Artifacts* du build, puis s'installe sur un téléphone Android (autoriser les sources inconnues).

### Notifications : Firebase (une fois)

1. https://console.firebase.google.com → créer un projet (ex. « FretPei »).
2. Ajouter une app **Android** avec l'identifiant `re.fretpei.app` → télécharger `google-services.json`
   → coller son contenu dans le secret GitHub **`GOOGLE_SERVICES_JSON`**.
3. *Paramètres du projet → Comptes de service → Générer une nouvelle clé privée* (fichier JSON)
   → sur le VPS, ajouter à `/opt/fretpei/.env` :
   `FIREBASE_SERVICE_ACCOUNT=<contenu du JSON encodé en base64 : base64 -w0 fichier.json>`
   puis `cd /opt/fretpei && docker compose up -d`.

Sans cette configuration, l'app fonctionne mais les notifications sont seulement journalisées côté serveur.

### Play Store : AAB signé

1. Générer la clé de signature **une seule fois et la conserver précieusement** (sans elle, plus de mise à jour possible) :
   `keytool -genkeypair -v -keystore fretpei.jks -alias fretpei -keyalg RSA -keysize 2048 -validity 10000`
2. Secrets GitHub : `ANDROID_KEYSTORE_BASE64` (`base64 -w0 fretpei.jks`), `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS` (`fretpei`), `ANDROID_KEY_PASSWORD`.
3. Le build produit alors aussi `app-release.aab`, à téléverser dans la Play Console
   (activer la signature d'application par Google Play).
4. Fiche Play Store : déclarer l'usage de la **localisation en arrière-plan** (partage de position
   pendant les courses) et fournir la politique de confidentialité.

### iOS : tester sur ton iPhone (Mac + Xcode)

```bash
git clone https://github.com/Emmanueltaochy/app-livraison.git && cd app-livraison
npm install && npx cap sync ios && npx cap open ios
```
Dans Xcode :
1. *App* (cible) → **Signing & Capabilities** → *Team* : ton équipe Apple Developer (celle de Swap'îles).
   L'identifiant `re.fretpei.app` est enregistré automatiquement.
2. Vérifier les capacités **Push Notifications** et **Background Modes → Location updates**
   (déjà déclarées dans le projet ; les ajouter avec « + Capability » si Xcode ne les affiche pas).
3. Brancher l'iPhone, le choisir en haut, puis ▶︎ **Run**. Au premier lancement :
   *Réglages → Général → VPN et gestion de l'appareil* → faire confiance au développeur.

Pour TestFlight / App Store : *Product → Archive → Distribute App*.
La compilation est aussi vérifiée automatiquement sur GitHub (**Actions → App iOS**).

### Notifications iPhone (APNs)

1. https://developer.apple.com/account → *Keys* → **+** → cocher *Apple Push Notifications service (APNs)*
   → télécharger le fichier `.p8` (une seule fois possible) et noter le **Key ID**.
2. Noter le **Team ID** (*Membership details*).
3. Sur le VPS, ajouter à `/opt/fretpei/.env` puis `docker compose up -d` :
   ```
   APNS_CLE=<contenu du .p8 encodé en base64 : base64 -i AuthKey_XXXX.p8>
   APNS_CLE_ID=<Key ID>
   APNS_EQUIPE_ID=<Team ID>
   ```
Une même clé APNs sert pour toutes tes apps (Swap'îles compris) : tu peux réutiliser celle que tu as déjà.

## Commandes utiles

```bash
npm run dev     # développement
npm test        # tests du moteur de prix
npm run lint
npm run build
```

## Points juridiques à valider avant lancement

- Les transporteurs doivent être inscrits au registre des transporteurs (DEAL Réunion) avec
  l'attestation de capacité « véhicules légers » : la plateforme vérifie le dossier avant activation.
- Les transporteurs restent libres d'accepter ou non les courses (pas d'exclusivité, pas d'horaires imposés) pour limiter le risque de requalification.
- CGV / CGU, mentions légales et politique de confidentialité restent à rédiger.
