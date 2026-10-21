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

## Stack

Next.js 15 (App Router, Server Actions) · Supabase (Postgres + connexion par e-mail) · Stripe Checkout + Connect Express · Tailwind CSS · Capacitor (app mobile).

## Mise en route

1. `npm install`
2. Créer un projet sur [supabase.com](https://supabase.com) (gratuit), puis exécuter
   `supabase/migrations/0001_init.sql` dans *SQL Editor*.
3. Dans Supabase → *Authentication → URL Configuration*, ajouter `http://localhost:3000/auth/callback`
   (et l'URL de production) aux *Redirect URLs*.
4. `cp .env.example .env.local` et remplir les clés.
5. `npm run dev` puis ouvrir http://localhost:3000.

Sans clé Stripe, `PAIEMENT_DEMO=1` simule le paiement en local pour tester tout le parcours.

### Devenir administrateur

Se connecter une fois sur `/connexion`, puis dans Supabase (*SQL Editor*) :

```sql
update profils set role = 'admin' where id = (select id from auth.users where email = 'votre@email.fr');
```

### Stripe

1. Activer **Connect** dans le tableau de bord Stripe (type de compte : Express).
2. Ajouter un webhook vers `https://<votre-domaine>/api/stripe/webhook` avec les événements
   `checkout.session.completed` et `account.updated` (cocher « événements des comptes connectés » pour ce dernier).
3. En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook --forward-connect-to localhost:3000/api/stripe/webhook`.

## Mise en ligne

Déployer sur [Vercel](https://vercel.com) (gratuit au départ) en important le dépôt GitHub et en
recopiant les variables de `.env.local` (sans `PAIEMENT_DEMO`).

## Application mobile (iOS / Android)

L'app est une coque Capacitor qui charge la plateforme en ligne : **une modification du site met à jour
l'app sans republier sur les stores**. Une fois le site en ligne :

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
CAPACITOR_SERVER_URL=https://<votre-domaine> npx cap add android
CAPACITOR_SERVER_URL=https://<votre-domaine> npx cap add ios   # nécessite un Mac + Xcode
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
