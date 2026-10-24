-- Transporteurs en ligne, positions GPS et appareils pour les notifications push.

alter table transporteurs
  add column en_ligne boolean not null default false,
  add column position_lat double precision,
  add column position_lng double precision,
  add column position_le timestamptz;

-- Trace GPS pendant une course (suivi en direct par le client).
create table positions_course (
  id bigserial primary key,
  commande_id uuid not null references commandes on delete cascade,
  lat double precision not null,
  lng double precision not null,
  enregistree_le timestamptz not null default now()
);
create index positions_course_commande_idx on positions_course (commande_id, enregistree_le desc);

-- Jetons Firebase Cloud Messaging des téléphones (un utilisateur peut en avoir plusieurs).
create table appareils (
  jeton text primary key,
  utilisateur_id uuid not null references utilisateurs on delete cascade,
  plateforme text not null check (plateforme in ('android', 'ios', 'web')),
  vu_le timestamptz not null default now()
);
create index appareils_utilisateur_idx on appareils (utilisateur_id);
