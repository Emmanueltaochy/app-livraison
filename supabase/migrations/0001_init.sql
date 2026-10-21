-- Schéma initial : profils, transporteurs, comptes pro (magasins), commandes.
-- Les écritures sensibles passent par le serveur (clé service_role) ;
-- le RLS limite ce que chaque utilisateur peut lire avec la clé publique.

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

create table profils (
  id uuid primary key references auth.users on delete cascade,
  role role_utilisateur not null default 'client',
  nom text,
  telephone text,
  cree_le timestamptz not null default now()
);

create table transporteurs (
  id uuid primary key references profils on delete cascade,
  statut statut_transporteur not null default 'en_attente',
  raison_sociale text not null,
  siret text not null,
  numero_registre_transport text not null, -- inscription DEAL (licence < 3,5 t)
  assurance_marchandises text not null,     -- assureur + n° de police
  vehicule vehicule not null,
  immatriculation text not null,
  stripe_account_id text,
  stripe_pret boolean not null default false,
  abonnement_pro boolean not null default false,
  cree_le timestamptz not null default now()
);

create table comptes_pro (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid not null references profils on delete cascade,
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

  client_id uuid references profils on delete set null, -- null = commande invité
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

-- Crée le profil à l'inscription.
create function public.creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profils (id) values (new.id);
  return new;
end $$;

create trigger a_l_inscription after insert on auth.users
  for each row execute function public.creer_profil();

create function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where id = auth.uid() and role = 'admin');
$$;

alter table profils enable row level security;
alter table transporteurs enable row level security;
alter table comptes_pro enable row level security;
alter table commandes enable row level security;

create policy "profil: soi-même ou admin" on profils
  for select using (id = auth.uid() or est_admin());

create policy "transporteur: soi-même ou admin" on transporteurs
  for select using (id = auth.uid() or est_admin());

create policy "compte pro: propriétaire ou admin" on comptes_pro
  for select using (proprietaire = auth.uid() or est_admin());

create policy "commandes: client, transporteur assigné ou admin" on commandes
  for select using (
    client_id = auth.uid()
    or transporteur_id = auth.uid()
    or est_admin()
    or compte_pro_id in (select id from comptes_pro where proprietaire = auth.uid())
  );
