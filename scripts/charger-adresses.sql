-- Chargement des adresses de siège dans les fiches entreprises.
--
-- Une table de transit non journalisée reçoit le fichier en COPY, puis une
-- seule jointure met à jour les fiches. Treize millions d'UPDATE individuels
-- prendraient la nuit ; ici la base fait le rapprochement en un ordre.
--
-- La table et son remplissage sont préparés par charger-adresses.sh : un
-- « \copy FROM STDIN » placé dans un script lu par -f consommerait les lignes
-- du script comme si elles étaient les données.

\set ON_ERROR_STOP on

-- Pas de clé primaire sur le SIREN : un établissement fermé peut rester
-- marqué comme siège, et un doublon ferait échouer le COPY après deux heures
-- de chargement. L'index posé plus bas suffit à la jointure ; si un SIREN
-- apparaît deux fois, les deux lignes décrivent la même société.
CREATE INDEX ON transit_adresses (siren);
ANALYZE transit_adresses;

\echo '-- sièges chargés en transit (lignes, SIREN distincts) :'
SELECT count(*) AS lignes, count(DISTINCT siren) AS sirens FROM transit_adresses;

UPDATE "Entreprise" e
SET "adresseSiege" = COALESCE(e."adresseSiege", t.adresse),
    "codePostal"   = COALESCE(e."codePostal",   t.code_postal),
    commune        = COALESCE(e.commune,        t.commune),
    "communeSlug"  = COALESCE(e."communeSlug",  t.commune_slug),
    departement    = COALESCE(e.departement,    t.departement),
    "siretSiege"   = COALESCE(e."siretSiege",   t.siret),
    -- L'enseigne ne remplace jamais la dénomination : elle complète la
    -- recherche, parce que le public connaît l'enseigne du commerce et pas la
    -- raison sociale qui l'exploite.
    enseigne       = COALESCE(e.enseigne,       NULLIF(t.enseigne, ''))
FROM transit_adresses t
WHERE e.siren = t.siren
  -- La comparaison sur la seule commune évitait les mises à jour inutiles,
  -- mais écartait aussi les fiches déjà pourvues d'une commune par l'API et
  -- auxquelles il ne manquait que le fragment d'URL : elles n'apparaissaient
  -- alors sur aucune page de commune.
  AND (e.commune IS DISTINCT FROM t.commune OR e."communeSlug" IS NULL);

\echo '-- fiches avec commune après chargement :'
SELECT count(*) FILTER (WHERE commune IS NOT NULL) AS avec_commune,
       count(*) FILTER (WHERE departement IS NOT NULL) AS avec_departement,
       count(*) AS total
FROM "Entreprise";

DROP TABLE transit_adresses;
