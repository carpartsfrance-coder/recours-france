#!/usr/bin/env bash
#
# Transfert des données de registre vers la base de production.
#
# Ce qui part : les tables construites à partir de sources publiques — Sirene,
# INPI, BODACC, médiateurs. Ce sont des données reconstituables, et c'est
# précisément pour cela qu'on peut les écraser.
#
# Ce qui ne part JAMAIS : les signalements, avis, justificatifs, jetons d'accès
# et comptes d'administration. Ils appartiennent à des personnes. Les cent
# quatre signalements de la base de développement sont d'ailleurs inventés, et
# cette séparation suffit à les empêcher d'atteindre la production — sans avoir
# à se souvenir de les purger.
#
# Le transfert d'Entreprise se fait par tranches de préfixe de SIREN, avec un
# fichier d'état. Sept gigaoctets sur une connexion domestique, c'est une heure
# où tout peut s'interrompre : au relancement, le script reprend où il s'était
# arrêté au lieu de tout refaire.
#
#   bash scripts/transferer-vers-production.sh

set -uo pipefail
cd "$(dirname "$0")/.."

ETAT=".transfert-etat"
LOCAL="$(grep -m1 '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')"

# Reconstituées à chaque exécution ; aucune ne contient de donnée personnelle.
#
# L'ordre n'est pas cosmétique. Cinq de ces tables portent une clé étrangère
# vers Entreprise — Boutique, Etablissement, Evenement, CompteAnnuel et
# DonneeSource. Chargées avant elle, chacune de leurs lignes est rejetée par le
# contrôle d'intégrité. D'où deux groupes, avec Entreprise entre les deux.
AVANT=(Mediateur SiteConnu CompteurAnnuaire)
APRES=(Boutique Etablissement Evenement CompteAnnuel DonneeSource)

rouge()  { printf '\033[31m%s\033[0m\n' "$*"; }
vert()   { printf '\033[32m%s\033[0m\n' "$*"; }
titre()  { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ── L'adresse de production ────────────────────────────────────────────────
printf '\nCollez l’URL de la base de PRODUCTION (External Database URL) :\n> '
read -r PROD
PROD="$(printf '%s' "$PROD" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"

case "$PROD" in
  postgresql://*@*|postgres://*@*) ;;
  *) rouge "URL invalide. Utilisez le bouton « copier » de Render."; exit 1 ;;
esac

# ── Contrôles avant de toucher à quoi que ce soit ──────────────────────────
titre "Contrôles"

tables=$(psql "$PROD" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null)
if [ -z "$tables" ] || [ "$tables" -lt 20 ]; then
  rouge "La base de production n'a pas son schéma (${tables:-0} tables)."
  echo "  Lancez d'abord : bash scripts/installer-base.sh"
  exit 1
fi
vert "  schéma présent — $tables tables"

# Un signalement en production appartient à quelqu'un. On ne l'écrase pas, et
# on n'écrase rien tant qu'il en existe un seul.
sig=$(psql "$PROD" -t -A -c 'SELECT count(*) FROM "Signalement";' 2>/dev/null || echo 0)
if [ "${sig:-0}" -gt 0 ]; then
  rouge "  $sig signalement(s) en production."
  echo "  Ce script ne touche pas aux signalements, mais leur présence signale"
  echo "  que le site est déjà utilisé. Vérifiez avant de poursuivre."
  printf '  Poursuivre quand même ? (tapez OUI) : '
  read -r r; [ "$r" = "OUI" ] || exit 1
else
  vert "  aucun signalement en production"
fi

avant=$(psql "$PROD" -t -A -c 'SELECT count(*) FROM "Entreprise";' 2>/dev/null || echo 0)
attendu=$(psql "$LOCAL" -t -A -c 'SELECT count(*) FROM "Entreprise";')
echo "  entreprises : $avant en production, $attendu à transférer"

# ── Nettoyage local : ce qui ne doit pas être publié ───────────────────────
titre "Nettoyage de la source"
phys=$(psql "$LOCAL" -t -A -c "DELETE FROM \"Entreprise\" WHERE \"categorieJuridique\" IN ('1000') RETURNING 1;" | wc -l | tr -d ' ')
echo "  $phys fiche(s) au nom d'un particulier retirée(s) de la source"

# ── Confirmation ───────────────────────────────────────────────────────────
titre "Ce qui va se passer"
echo "  • les tables de registre sont vidées puis rechargées en production"
echo "  • Entreprise est transférée par tranches, reprenable en cas de coupure"
echo "  • les signalements, avis, justificatifs et comptes ne sont pas touchés"
echo ""
printf '  Confirmer (tapez TRANSFERER) : '
read -r r
[ "$r" = "TRANSFERER" ] || { echo "Annulé."; exit 1; }

# ── Transfert d'une table entière ──────────────────────────────────────────
# Une table qui échoue arrête tout : poursuivre laisserait une production
# partielle, dont personne ne saurait dire ce qui manque.
transferer() {
  local t="$1"
  local n cols
  n=$(psql "$LOCAL" -t -A -c "SELECT count(*) FROM \"$t\";" 2>/dev/null || echo 0)
  if [ "${n:-0}" -eq 0 ]; then printf '  %-18s vide, ignorée\n' "$t"; return 0; fi
  cols=$(psql "$LOCAL" -t -A -c "SELECT string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='$t';")
  psql "$PROD" -q -c "TRUNCATE \"$t\" CASCADE;" || { rouge "  $t : vidage impossible"; exit 1; }
  if psql "$LOCAL" -q -c "\\copy (SELECT $cols FROM \"$t\") TO STDOUT" \
     | psql "$PROD" -q -c "\\copy \"$t\" ($cols) FROM STDIN"; then
    printf '  %-18s %s lignes\n' "$t" "$n"
  else
    rouge "  $t : ÉCHEC — transfert interrompu"
    exit 1
  fi
}

titre "Tables sans dépendance"
for t in "${AVANT[@]}"; do transferer "$t"; done

# ── Entreprise, par tranches ───────────────────────────────────────────────
titre "Entreprise — $attendu lignes"
COLS=$(psql "$LOCAL" -t -A -c "SELECT string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='Entreprise';")

if [ ! -f "$ETAT" ]; then
  echo "  première exécution : la table de production est vidée"
  psql "$PROD" -q -c 'TRUNCATE "Entreprise" CASCADE;' || { rouge "  vidage impossible"; exit 1; }
  : > "$ETAT"
else
  echo "  reprise : $(wc -l < "$ETAT" | tr -d ' ') tranche(s) déjà transférée(s)"
fi

TRANCHES=$(psql "$LOCAL" -t -A -c "SELECT DISTINCT left(siren,2) FROM \"Entreprise\" ORDER BY 1;")
total=$(echo "$TRANCHES" | wc -l | tr -d ' ')
i=0
for p in $TRANCHES; do
  i=$((i+1))
  grep -qx "$p" "$ETAT" && continue
  n=$(psql "$LOCAL" -t -A -c "SELECT count(*) FROM \"Entreprise\" WHERE left(siren,2)='$p';")
  printf '  [%3d/%3d] tranche %s — %8s lignes … ' "$i" "$total" "$p" "$n"
  if psql "$LOCAL" -q -c "\\copy (SELECT $COLS FROM \"Entreprise\" WHERE left(siren,2)='$p') TO STDOUT" \
     | psql "$PROD" -q -c "\\copy \"Entreprise\" ($COLS) FROM STDIN"; then
    echo "$p" >> "$ETAT"; vert "fait"
  else
    rouge "ÉCHEC"
    echo ""
    echo "  Relancez la commande : le script reprendra à cette tranche."
    exit 1
  fi
done

# ── Les tables qui dépendent d'Entreprise ──────────────────────────────────
titre "Tables rattachées aux entreprises"
for t in "${APRES[@]}"; do transferer "$t"; done

# ── Index et décomptes ─────────────────────────────────────────────────────
titre "Index"
echo "  Prisma d'abord (index déclarés au schéma)…"
DATABASE_URL="$PROD" npx prisma db push --skip-generate 2>&1 | grep -iE "in sync|Error" | sed 's/^/    /'
echo "  puis les index partiels et trigrammes, que Prisma ne sait pas exprimer…"
psql "$PROD" -q -f scripts/index-annuaire.sql 2>&1 | grep -iE "error|notice" | head -4 | sed 's/^/    /'
vert "  index en place"

titre "Décomptes de l'annuaire"
DATABASE_URL="$PROD" npm run compteurs 2>&1 | tail -3 | sed 's/^/  /'

# ── Vérification ───────────────────────────────────────────────────────────
titre "Vérification"
apres=$(psql "$PROD" -t -A -c 'SELECT count(*) FROM "Entreprise";')
printf '  entreprises en production : %s (attendu %s)\n' "$apres" "$attendu"
if [ "$apres" = "$attendu" ]; then
  vert "  transfert complet"
  rm -f "$ETAT"
else
  rouge "  écart de $((attendu - apres)) lignes — relancez le script"
  exit 1
fi

echo ""
echo "  Contrôlez ensuite : https://recours-france.fr/annuaire"
echo "  et le plan de site : curl -s https://recours-france.fr/sitemap-index.xml | grep -c '<sitemap>'"
