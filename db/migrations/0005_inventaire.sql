-- Prix détaillé façon métropole : type de transport, inventaire, accès, équipe.
alter table commandes
  add column type_transport text not null default 'objets'
    check (type_transport in ('objets', 'magasin', 'demenagement', 'materiaux')),
  add column inventaire jsonb not null default '{}',
  add column volume_m3 numeric(5, 1),
  add column poids_kg integer,
  add column personnes smallint not null default 1 check (personnes between 1 and 3),
  add column minutes_manutention integer not null default 0,
  add column ascenseur_depart boolean not null default false,
  add column ascenseur_arrivee boolean not null default false,
  add column portage_long boolean not null default false,
  add column demontage boolean not null default false,
  add column precisions text;

update commandes set personnes = 2 where aide_manutention;
