-- Coordonnées exactes des adresses (Base Adresse Nationale) et mode de commande.
create type mode_commande as enum ('programme', 'maintenant');

alter table commandes
  add column mode mode_commande not null default 'programme',
  add column depart_lat double precision,
  add column depart_lng double precision,
  add column arrivee_lat double precision,
  add column arrivee_lng double precision;
