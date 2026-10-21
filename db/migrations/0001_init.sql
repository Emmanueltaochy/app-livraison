-- Schéma initial : utilisateurs, sessions, transporteurs, comptes pro (magasins), commandes.
-- Toutes les requêtes passent par le serveur Next.js : aucun accès direct depuis le navigateur.

create type role_utilisateur as enum ('client', 'transporteur', 'admin');
create type statut_transporteur as enum ('en_attente', 'valide', 'refuse', 'suspendu');
create type statut_commande as enum (
  'attente_paiement', -- créée, paiement Stripe non confirmé
  'payee',            -- payée, en attente d'un transporteur
  'acceptee',         -- un transporteur a pris la course
  'enlevee',          -- marchandise chargée
  'livree',           -- livrée (code client validé)
  'annulee'
);
create type vehicule as enum ('petit', 'moyen', 'grand');

create table utilisateurs (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role role_utilisateur not null default 'client',
  nom text,
  telephone text,
  cree_le timestamptz not null default now()
);

-- Liens de connexion envoyés par e-mail (on ne stocke que l'empreinte SHA-256 du jeton).
create table jetons_connexion (
  empreinte text primary key,
  email text not null,
  expire_le timestamptz not null,
  utilise_le timestamptz
);

create table sessions (
  empreinte text primary key,
  utilisateur_id uuid not null references utilisateurs on delete cascade,
  expire_le timestamptz not null,
  cree_le timestamptz not null default now()
);
create index sessions_utilisateur_idx on sessions (utilisateur_id);

create table transporteurs (
  id uuid primary key references utilisateurs on delete cascade,
  statut statut_transporteur not null default 'en_attente',
  raison_sociale text not null,
  siret text not null,
  numero_registre_transport text not null, -- inscription DEAL (licence < 3,5 t)
  assurance_marchandises text not null,     -- assureur + n° de police
  vehicule vehicule not null,
  immatriculation text not null,
  stripe_account_id text unique,
  stripe_pret boolean not null default false,
  abonnement_pro boolean not null default false,
  cree_le timestamptz not null default now()
);

create table comptes_pro (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid not null references utilisateurs on delete cascade,
  raison_sociale text not null,
  siret text,
  remise_taux numeric(4,3) not null default 0, -- remise négociée sur le transport
  cree_le timestamptz not null default now()
);

create table commandes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default upper(substr(md5(random()::text), 1, 8)),
  jeton_suivi text not null unique default replace(gen_random_uuid()::text, '-', ''),
  code_livraison text not null default lpad((floor(random() * 10000))::int::text, 4, '0'),
  statut statut_commande not null default 'attente_paiement',

  client_id uuid references utilisateurs on delete set null, -- null = commande invité
  compte_pro_id uuid references comptes_pro on delete set null,
  client_nom text not null,
  client_telephone text not null,
  client_email text not null,

  commune_depart text not null,
  adresse_depart text not null,
  commune_arrivee text not null,
  adresse_arrivee text not null,
  date_enlevement timestamptz not null,
  description text not null,
  vehicule vehicule not null,
  aide_manutention boolean not null default false,
  etages_depart int not null default 0,
  etages_arrivee int not null default 0,
  assurance_renforcee boolean not null default false,
  express boolean not null default false,

  distance_km int not null,
  transport_cts int not null,
  frais_service_cts int not null,
  total_cts int not null,
  commission_cts int not null,
  remuneration_transporteur_cts int not null,

  transporteur_id uuid references transporteurs on delete set null,
  stripe_session_id text,
  stripe_charge_id text,
  stripe_transfer_id text,

  cree_le timestamptz not null default now(),
  payee_le timestamptz,
  acceptee_le timestamptz,
  enlevee_le timestamptz,
  livree_le timestamptz
);

create index commandes_statut_idx on commandes (statut, date_enlevement);
create index commandes_transporteur_idx on commandes (transporteur_id);
