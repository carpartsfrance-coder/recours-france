#!/usr/bin/env bash
# Que contient vraiment la base de production ? Lecture seule.
set -euo pipefail
cd "$(dirname "$0")/.."

printf '\nURL de la base de PRODUCTION (elle ne s’affichera pas)\n> '
read -r -s DB
printf '\n'
[ -z "$DB" ] && { echo "Rien saisi."; exit 1; }

psql "$DB" -Atc "select 'table DecisionJustice : ' || case when to_regclass('\"DecisionJustice\"') is null then 'ABSENTE' else 'présente' end"
psql "$DB" -Atc "select 'décisions en base : ' || count(*) from \"DecisionJustice\"" 2>/dev/null || echo "décisions en base : (table absente)"
psql "$DB" -Atc "select 'pour DISTRIMOTOR : ' || count(*) from \"DecisionJustice\" d join \"Entreprise\" e on e.id=d.\"entrepriseId\" where e.siren='432892412'" 2>/dev/null || true
psql "$DB" -Atc "select 'évènements BODACC pour DISTRIMOTOR : ' || count(*) from \"Evenement\" v join \"Entreprise\" e on e.id=v.\"entrepriseId\" where e.siren='432892412'"
