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
Docker Compose + Caddy (HTTPS automatique) sur VPS · Capacitor (app mobile).

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
   curl -fsSL https://get.docker.com | sh
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

> Si le VPS héberge déjà un site avec Nginx sur les ports 80/443, supprimer le service `caddy` de
> `docker-compose.yml` et faire pointer Nginx vers `http://127.0.0.1:3000`.

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

L'app est une coque Capacitor qui charge la plateforme en ligne : **une modification du site met à jour
l'app sans republier sur les stores**. Une fois le site en ligne :

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
CAPACITOR_SERVER_URL=https://<domaine> npx cap add android
CAPACITOR_SERVER_URL=https://<domaine> npx cap add ios   # nécessite un Mac + Xcode
```

Pour être accepté par Apple, il faut ajouter de vraies fonctions natives (plugins `@capacitor/push-notifications`,
`@capacitor/geolocation`, `@capacitor/camera`) : c'est la prochaine étape côté transporteur.
Comptes nécessaires : Google Play (25 $ une fois), Apple Developer (99 $/an).

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
