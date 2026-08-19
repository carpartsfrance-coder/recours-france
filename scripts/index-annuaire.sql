-- Index que le schéma Prisma ne sait pas exprimer.
--
-- Prisma ne déclare pas les index partiels : à relancer après tout
-- « prisma db push », qui pourrait les avoir écartés.

-- Seules 90 000 entreprises sur treize millions ont un site connu. Sans cet
-- index, les retrouver imposait un balayage séquentiel de quatre millions de
-- lignes — 4,6 secondes, sur chaque page de regroupement et chaque fiche.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Entreprise_site_secteur_idx"
  ON "Entreprise" (secteur, denomination)
  WHERE "siteWeb" IS NOT NULL;

-- Le classement alphabétique d'un secteur s'appuyait sur l'index des
-- dénominations, en écartant au passage les lignes des autres secteurs.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Entreprise_secteur_etat_denom_idx"
  ON "Entreprise" (secteur, "etatAdministratif", denomination);
