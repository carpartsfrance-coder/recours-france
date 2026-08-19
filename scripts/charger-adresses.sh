#!/usr/bin/env bash
# Charge les adresses de siège dans les fiches entreprises.
# psql ne lit pas .env : on l'extrait ici, et on retire la chaîne de requête
# (« ?schema=public ») que Prisma ajoute et que psql refuse.
set -euo pipefail
cd "$(dirname "$0")/.."
URL=$(grep -m1 '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')
[ -n "$URL" ] || { echo "DATABASE_URL introuvable dans .env" >&2; exit 1; }
FICHIER="$PWD/storage/adresses-sieges.tsv"
[ -f "$FICHIER" ] || { echo "Fichier de transit absent : lancez d'abord npm run adresses:extraire" >&2; exit 1; }

echo "-- préparation de la table de transit"
psql "$URL" -q -c 'DROP TABLE IF EXISTS transit_adresses;' -c '
CREATE UNLOGGED TABLE transit_adresses (
  siren        text,
  siret        text,
  adresse      text,
  code_postal  text,
  commune      text,
  commune_slug text,
  departement  text,
  enseigne     text
);'

echo "-- chargement du fichier (2 Go, quelques minutes)"
# Le chemin est écrit en clair dans la commande : \copy n'interpole pas les
# variables de psql, et « FROM STDIN » lirait le script au lieu du fichier.
psql "$URL" -q -c "\\copy transit_adresses FROM '$FICHIER' WITH (FORMAT text, DELIMITER E'\\t', NULL '\\N')"

echo "-- rapprochement"
exec psql "$URL" -f scripts/charger-adresses.sql
