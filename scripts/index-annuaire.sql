-- Index que le schéma Prisma ne sait pas exprimer.
--
-- « prisma db push » ne « pourrait » pas les écarter : il les écarte. Reproduit
-- sur une base jetable — un index trigramme posé à la main disparaît au db push
-- suivant, qui annonce « Your database is now in sync » et sort en code 0, sans
-- avertissement ni demande de --accept-data-loss. Cette commande tournant à
-- chaque déploiement, ce fichier doit la suivre systématiquement.

-- Aucune limite de durée : une construction GIN sur treize millions de lignes
-- dure des dizaines de minutes, et un statement_timeout hérité de la connexion
-- l'interromprait au milieu — en laissant précisément l'index invalide que la
-- section suivante doit réparer.
SET statement_timeout = 0;

-- Réparation des index invalides, avant toute création.
--
-- Une construction CONCURRENTLY interrompue — connexion coupée, délai dépassé —
-- laisse un index indisvalid = false. Il occupe sa place au catalogue, le
-- planificateur l'ignore totalement, et « CREATE INDEX IF NOT EXISTS » répond
-- « already exists, skipping » indéfiniment sans jamais le réparer. C'est
-- arrivé en production : la recherche restait à cent secondes alors que l'index
-- semblait présent.
--
-- REINDEX CONCURRENTLY le reconstruit sans verrouiller la table. Il ne peut
-- pas s'exécuter dans un bloc de transaction, ce qu'un « DO $$ » est : d'où le
-- \gexec de psql, qui exécute chaque ligne rendue comme une commande à part
-- entière, hors transaction.
SELECT format('REINDEX INDEX CONCURRENTLY %I;', c.relname)
FROM pg_class c
JOIN pg_index i ON i.indexrelid = c.oid
WHERE i.indrelid = '"Entreprise"'::regclass AND NOT i.indisvalid
\gexec

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
