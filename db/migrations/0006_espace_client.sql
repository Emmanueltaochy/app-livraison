-- Espace client : client Stripe (cartes enregistrées) et recherche des commandes par client.
alter table utilisateurs add column stripe_customer_id text unique;
create index if not exists commandes_client_idx on commandes (client_id, cree_le desc);
create index if not exists commandes_client_email_idx on commandes (lower(client_email)) where client_id is null;
