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

-- Recherche par fragment de nom.
--
-- « ILIKE '%cdiscount%' » n'utilise aucun index ordinaire : trié, il balayait
-- les treize millions de dénominations depuis « A » — vingt-quatre secondes ;
-- non trié, il les balayait quand même — quatre secondes. L'index trigramme
-- est le seul qui sache répondre à une recherche par fragment.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Entreprise_denomination_trgm_idx"
  ON "Entreprise" USING gin (denomination gin_trgm_ops);

-- L'enseigne et l'adresse du site entrent dans le même OR que la dénomination.
-- Sans index trigramme sur elles, le planificateur renonce à celui de la
-- dénomination et balaie tout : dix-neuf millisecondes deviennent vingt-cinq
-- secondes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Entreprise_enseigne_trgm_idx"
  ON "Entreprise" USING gin (enseigne gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Entreprise_siteweb_trgm_idx"
  ON "Entreprise" USING gin ("siteWeb" gin_trgm_ops);
