#!/usr/bin/env bash
#
# Crée les tables sur la base de production, en une fois.
#
# L'URL est demandée puis lue avec `read -r`, jamais écrite dans la commande :
# un mot de passe engendré au hasard contient volontiers un $, une apostrophe
# ou un accent grave, que le shell interpréterait au lieu de les transmettre.
# Elle ne reste pas non plus dans l'historique du terminal.

set -euo pipefail
cd "$(dirname "$0")/.."

printf '\nCollez l’URL de la base (External Database URL, chez Render) :\n> '
read -r URL

# Espaces et sauts de ligne emportés par le copier-coller, guillemets éventuels.
URL="$(printf '%s' "$URL" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"

if [ -z "$URL" ]; then
  echo "Rien n’a été collé. Relancez la commande." >&2
  exit 1
fi

case "$URL" in
  postgresql://*:*@*|postgres://*:*@*) ;;
  *)
    echo "" >&2
    echo "Cette URL n’a pas la bonne forme. Elle doit ressembler à :" >&2
    echo "  postgresql://utilisateur:motdepasse@hote/base" >&2
    echo "" >&2
    echo "Reçu : ${URL:0:36}…" >&2
    echo "Utilisez le bouton « copier » de Render, pas la sélection à la souris." >&2
    exit 1
    ;;
esac

echo ""
echo "→ Création des tables…"
DATABASE_URL="$URL" npx prisma db push --skip-generate

echo ""
echo "→ Vérification : on redemande la même chose."
echo "  Si le schéma est bien en place, Prisma répond qu’il n’y a rien à faire."
DATABASE_URL="$URL" npx prisma db push --skip-generate

echo ""
echo "──────────────────────────────────────────────────────────────"
echo " Terminé."
echo ""
echo " Ouvrez maintenant cette adresse dans votre navigateur :"
echo "   https://recours-france.onrender.com/api/vivant"
echo ""
echo " Elle doit répondre  \"schema\":\"présent\"  et non \"absent\"."
echo " Le site répond alors sans redéploiement : les tables sont"
echo " côté base, pas côté application."
echo "──────────────────────────────────────────────────────────────"
