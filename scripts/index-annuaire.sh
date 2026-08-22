#!/usr/bin/env bash
#
# Applique les index que Prisma ne sait pas exprimer.
#
# Index partiels et index trigrammes : le schéma Prisma ne les déclare pas, et
# `prisma db push` peut donc les écarter en alignant la base. Sans eux, la
# recherche de l'annuaire passe de quelques millisecondes à vingt-quatre
# secondes. Ce script est appelé après chaque `db push`, en pré-déploiement.
#
# L'URL vient de l'environnement en premier — chez l'hébergeur il n'y a pas de
# fichier .env, et la version précédente de cette commande, qui le lisait sans
# repli, échouait silencieusement en production.
#
# Le fichier SQL est idempotent (CREATE INDEX IF NOT EXISTS) : quand tout est
# en place, l'exécution ne coûte rien. Le premier passage sur treize millions
# de lignes, lui, est long — c'est le script de transfert qui l'assume.

set -euo pipefail
cd "$(dirname "$0")/.."

URL="${DATABASE_URL:-}"
if [ -z "$URL" ] && [ -f .env ]; then
  URL="$(grep -m1 '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"')"
fi
if [ -z "$URL" ]; then
  echo "DATABASE_URL introuvable : ni dans l'environnement, ni dans .env." >&2
  exit 1
fi

# psql n'accepte pas les paramètres de connexion propres à Prisma.
URL="${URL%%\?*}"

psql "$URL" -v ON_ERROR_STOP=1 -f scripts/index-annuaire.sql
