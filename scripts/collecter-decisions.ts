/**
 * Collecte des décisions de justice et rattachement aux fiches.
 *
 * Le parcours va des décisions vers les entreprises, jamais l'inverse. Chercher
 * le nom de chacune de nos treize millions de sociétés dans Judilibre
 * demanderait treize millions de requêtes ; parcourir le corpus une fois en
 * demande quelques milliers, et le rattachement se fait en base.
 *
 *   npm run collecter:decisions -- --juridiction=tcom --depuis=2025-01-01 --lots=5
 *
 * Sans clé PISTE, le script s'arrête sans rien faire.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  chercher, decision, judilibreConfigure, normaliserDenomination,
  partiesMorales, rapprocher, type Candidat,
} from "../src/lib/sources/judilibre";

const prisma = new PrismaClient();
const PAUSE_MS = 250;

function argument(nom: string, defaut: string): string {
  return process.argv.find((a) => a.startsWith(`--${nom}=`))?.split("=")[1] ?? defaut;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!judilibreConfigure()) {
    console.error("JUDILIBRE_API_KEY absente : rien à faire.");
    process.exit(1);
  }

  const juridiction = argument("juridiction", "tcom");
  const depuis = argument("depuis", "2025-01-01");

  /**
   * `--siren=` cherche par la dénomination, pas par le numéro.
   *
   * Le numéro d'immatriculation s'écrit avec des espaces dans les jugements —
   * « 432 892 412 » — et le moteur de recherche le découpe en trois mots. Le
   * chercher tel quel ne ramène rien ; le chercher espacé ramène des milliers
   * de décisions qui contiennent l'un des trois groupes. La dénomination, elle,
   * est un vrai terme de recherche. Le SIREN sert ensuite, à la lecture du
   * texte, pour identifier la partie sans risque d'homonyme.
   */
  const sirenCible = argument("siren", "").replace(/\D/g, "");
  let requete = argument("requete", "societe");
  if (sirenCible) {
    const cible = await prisma.entreprise.findFirst({
      where: { siren: sirenCible },
      select: { denomination: true },
    });
    if (!cible) {
      console.error(`Aucune entreprise au SIREN ${sirenCible}.`);
      process.exit(1);
    }
    requete = cible.denomination;
    console.log(`SIREN ${sirenCible} → recherche « ${requete} »`);
  }
  const lots = Number(argument("lots", "3"));
  const taille = Number(argument("taille", "20"));
  const appliquer = process.argv.includes("--appliquer");

  // `unaccent` sert au rapprochement par nom. Sur une base fraîchement créée
  // par Render l'extension n'existe pas, et la requête échouait au premier
  // nom à comparer. Elle est idempotente : rien ne se passe si elle est là.
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS unaccent").catch((e) => {
    console.warn(`[avertissement] extension unaccent indisponible : ${e}`);
  });

  console.log(`Juridiction ${juridiction}, depuis le ${depuis}, ${lots} page(s) de ${taille}.`);
  console.log(appliquer ? "Écriture en base activée.\n" : "Simulation : rien ne sera écrit (--appliquer pour exécuter).\n");

  let vues = 0, avecParties = 0, rattachees = 0, ambigues = 0, inconnues = 0, parSiren = 0;

  for (let page = 0; page < lots; page++) {
    const hits = await chercher(requete, { taille, page, juridictions: [juridiction], depuis });
    if (hits.length === 0) {
      if (page === 0) console.log("  (aucune décision trouvée pour cette recherche)");
      break;
    }

    for (const h of hits) {
      await dormir(PAUSE_MS);
      const d = await decision(h.id).catch(() => null);
      if (!d) continue;
      vues++;

      const parties = partiesMorales(d);
      if (parties.length === 0) continue;
      avecParties++;

      for (const p of parties) {
        // Quand la décision donne le numéro d'immatriculation, il suffit :
        // une requête sur clé unique, et plus aucune question d'homonymie.
        let candidats: Candidat[] = [];
        if (p.siren) {
          candidats = await prisma.entreprise.findMany({
            where: { siren: p.siren },
            select: { id: true, siren: true, denomination: true, formeJuridique: true },
          });
          if (candidats.length) parSiren++;
        }

        if (candidats.length === 0) {
          const cle = normaliserDenomination(p.denomination);
          if (cle.length < 4) continue;

          /**
           * Le tri se fait en deux temps, et ce n'est pas un raffinement.
           *
           * La version précédente comparait `upper(unaccent(denomination))` à
           * la clé. Une fonction appliquée à la colonne interdit tout index :
           * Postgres balayait les treize millions de lignes, et la production,
           * qui coupe à dix secondes, tuait la requête. En local la même
           * requête passait — assez lentement pour qu'on ne le remarque pas.
           *
           * `ILIKE` sur un motif encadré de pourcents emprunte au contraire
           * l'index trigramme déjà posé sur la colonne. Il ramène un petit
           * ensemble, que l'égalité exacte départage ensuite en mémoire. La
           * règle stricte est intacte ; seul le chemin pour y arriver change.
           */
          const approchants: Candidat[] = await prisma.$queryRaw`
            SELECT id, siren, denomination, "formeJuridique"
            FROM "Entreprise"
            WHERE denomination ILIKE ${"%" + cle + "%"}
            LIMIT 200`;
          candidats = approchants.filter((c) => normaliserDenomination(c.denomination) === cle);
        }

        if (candidats.length === 0) { inconnues++; continue; }
        const retenu = rapprocher(p, candidats);
        if (!retenu) { ambigues++; continue; }

        rattachees++;
        console.log(`  ${d.juridiction} ${d.date?.toISOString().slice(0, 10)} n°${d.numero} → ${retenu.denomination} (${retenu.siren}, ${p.role})`);

        if (appliquer && d.date) {
          await prisma.decisionJustice.upsert({
            where: { entrepriseId_judilibreId: { entrepriseId: retenu.id, judilibreId: d.id } },
            create: {
              entrepriseId: retenu.id, judilibreId: d.id,
              juridiction: d.juridiction ?? juridiction, chambre: d.chambre,
              numero: d.numero, ecli: d.ecli, date: d.date,
              solution: d.solutionLibelle ?? d.solution,
              role: p.role, denominationCitee: p.denomination,
            },
            update: { solution: d.solutionLibelle ?? d.solution },
          });
        }
      }
    }
  }

  console.log(`\ndécisions lues        : ${vues}`);
  console.log(`avec personne morale  : ${avecParties}`);
  console.log(`rattachées            : ${rattachees}`);
  console.log(`   dont par SIREN     : ${parSiren}`);
  console.log(`écartées, homonymie   : ${ambigues}`);
  console.log(`hors référentiel      : ${inconnues}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
