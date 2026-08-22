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

-- Les index trigrammes et l'index composite secteur/état/dénomination ont
-- quitté ce fichier : ils sont désormais déclarés dans prisma/schema.prisma,
-- qui sait les exprimer depuis Prisma 6. C'est ce qui les protège vraiment —
-- « db push » ne supprime que ce qu'il ne connaît pas.
--
-- Ne reste ici que l'index PARTIEL, la seule chose que Prisma ne déclare pas.
