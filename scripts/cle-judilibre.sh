#!/usr/bin/env bash
#
# Enregistre la clé PISTE de Judilibre, et vérifie qu'elle fonctionne.
#
# La clé est lue avec « read -r -s » : elle ne s'affiche pas à l'écran, ne
# passe pas par la ligne de commande, et ne reste pas dans l'historique du
# terminal. Elle n'est écrite que dans .env, qui est ignoré par git.

set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${JUDILIBRE_API_URL:-https://api.piste.gouv.fr/cassation/judilibre/v1.0}"

printf '\nCollez la clé API PISTE (elle ne s’affichera pas) :\n> '
read -r -s CLE
printf '\n\n'

if [ -z "$CLE" ]; then
  echo "Aucune clé saisie. Rien n’a été modifié."
  exit 1
fi

printf 'Vérification auprès de Judilibre… '
CODE=$(curl -s -o /tmp/judilibre-essai.json -w '%{http_code}' --max-time 25 \
  -H "KeyId: $CLE" -H 'Accept: application/json' \
  "$BASE/taxonomy?id=jurisdiction")

case "$CODE" in
  200)
    echo "d’accord (HTTP 200)."
    echo
    echo "Juridictions couvertes :"
    python3 -c "
import json
d = json.load(open('/tmp/judilibre-essai.json'))
r = d.get('result') or d
items = r if isinstance(r, list) else list(r.items())
for x in items[:12]:
    print('  -', x if isinstance(x, str) else (x[0] if isinstance(x, tuple) else x))
" 2>/dev/null || head -c 400 /tmp/judilibre-essai.json
    ;;
  400|401|403)
    # PISTE rejette une clé inconnue par un 400, pas par un 401 : la passerelle
    # refuse la requête avant que Judilibre ne la voie. Le distinguer d’une
    # vraie erreur de requête éviterait de chercher la panne au mauvais endroit.
    echo "refusée (HTTP $CODE)."
    echo
    echo "La passerelle PISTE a rejeté la clé. Deux causes possibles :"
    echo "  • la clé est incomplète ou mal recopiée ;"
    echo "  • l’application PISTE n’est pas abonnée à l’API Judilibre."
    echo "Dans le portail : Applications → votre application → onglet APIs → ajouter « Judilibre »."
    rm -f /tmp/judilibre-essai.json
    exit 1
    ;;
  *)
    echo "réponse inattendue (HTTP $CODE)."
    head -c 300 /tmp/judilibre-essai.json
    echo
    rm -f /tmp/judilibre-essai.json
    exit 1
    ;;
esac
rm -f /tmp/judilibre-essai.json

# Remplace la ligne si elle existe, l’ajoute sinon. On passe par un fichier
# temporaire plutôt que par « sed -i », dont la syntaxe diffère entre macOS et
# Linux, et surtout pour ne pas faire passer la clé par une expression sed —
# un « & » ou un « / » y auraient un sens.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
if grep -q '^JUDILIBRE_API_KEY=' .env 2>/dev/null; then
  grep -v '^JUDILIBRE_API_KEY=' .env > "$TMP"
else
  cp .env "$TMP" 2>/dev/null || : > "$TMP"
fi
{ printf 'JUDILIBRE_API_KEY='; printf '%s\n' "\"$CLE\""; } >> "$TMP"
cp "$TMP" .env
chmod 600 .env

echo
echo "Clé enregistrée dans .env (ignoré par git, permissions 600)."
echo "Pensez à la poser aussi dans Render → Environment, pour la production."
