#!/usr/bin/env bash
#
# Remplit la base de production : données publiques d'une entreprise, puis
# décisions de justice.
#
# L'URL de la base est demandée puis lue avec « read -r -s » : elle ne
# s'affiche pas, ne passe pas par la ligne de commande, et ne reste pas dans
# l'historique du terminal.
#
# Les envois de courriel sont coupés de force. Le script de synchronisation en
# déclenche — relances, accusés — et les lancer à la main sur la base de
# production enverrait de vrais messages à de vraies personnes, à un moment
# qu'elles n'attendent pas.

set -euo pipefail
cd "$(dirname "$0")/.."

printf '\nURL de la base de PRODUCTION (Render → base → External Database URL)\n'
printf 'Elle ne s’affichera pas.\n> '
read -r -s DB
printf '\n'

[ -z "$DB" ] && { echo "Rien saisi, on s’arrête."; exit 1; }

# La clé Judilibre vient du .env local, déjà vérifiée.
CLE=$(grep -E '^JUDILIBRE_API_KEY=' .env | cut -d= -f2- | tr -d '"')
[ -z "$CLE" ] && { echo "JUDILIBRE_API_KEY absente du .env — lancez d’abord « npm run cle:judilibre »."; exit 1; }

export DATABASE_URL="$DB"
export JUDILIBRE_API_KEY="$CLE"
export MAIL_ENABLED="false"
export SMTP_HOST="" SMTP_USER="" SMTP_PASSWORD=""

printf '\nQue voulez-vous faire ?\n'
printf '  1  une seule entreprise, pour essayer\n'
printf '  2  toutes les décisions de justice (plusieurs heures)\n> '
read -r CHOIX

case "$CHOIX" in
  1)
    printf 'SIREN (neuf chiffres) > '
    read -r SIREN
    SIREN=$(printf '%s' "$SIREN" | tr -cd '0-9')
    echo
    echo "── Données publiques (Sirene, BODACC, comptes) ──"
    npx tsx scripts/sync.ts --siren="$SIREN"
    echo
    echo "── Décisions de justice ──"
    for J in tj tcom ca; do
      npx tsx scripts/collecter-decisions.ts \
        --juridiction="$J" --siren="$SIREN" --depuis=2000-01-01 \
        --lots=1 --taille=20 --appliquer
    done
    ;;
  2)
    printf 'Depuis quelle année ? (2023 conseillé) > '
    read -r ANNEE
    ANNEE=$(printf '%s' "$ANNEE" | tr -cd '0-9')
    [ -z "$ANNEE" ] && ANNEE=2023
    echo
    echo "Collecte depuis le 01/01/$ANNEE. Laissez tourner ; Ctrl-C pour arrêter,"
    echo "ce qui est déjà rattaché reste en base."
    for J in tcom tj ca; do
      echo
      echo "── $J ──"
      npx tsx scripts/collecter-decisions.ts \
        --juridiction="$J" --requete=societe --depuis="$ANNEE-01-01" \
        --lots=2000 --taille=50 --appliquer
    done
    ;;
  *)
    echo "Choix inconnu."; exit 1
    ;;
esac

echo
echo "Terminé."
