-- Code à 6 chiffres envoyé avec le lien de connexion (saisi dans l'app, où les liens e-mail s'ouvrent dans Safari).
alter table jetons_connexion
  add column code_empreinte text,
  add column tentatives int not null default 0;
create index jetons_connexion_email_idx on jetons_connexion (email, expire_le desc);
