/**
 * Amorçage de la base.
 *
 * 1. Crée le compte d'administration initial.
 * 2. Constitue quelques fiches réelles à partir des registres publics ouverts
 *    (API Recherche d'entreprises, BODACC, annuaire des médiateurs).
 * 3. Génère des signalements et des avis de démonstration, tous rattachés à des
 *    adresses @example.com : aucun email réel n'est jamais touché.
 *
 * Les données de démonstration portent le drapeau DEMO_BANNER : retirez-les
 * avant toute mise en production (`npx tsx prisma/seed.ts --purge-demo`).
 */
import { PrismaClient, type CategorieLitige, type StatutSignalement } from "@prisma/client";
import { hacherMotDePasse } from "../src/lib/auth";
import { synchroniserEntreprise } from "../src/lib/sources";
import { recalculerIndices } from "../src/lib/stats";

const prisma = new PrismaClient();

// SIREN réels d'entreprises françaises des secteurs les plus exposés aux
// litiges de consommation. Les fiches sont constituées à partir des seules
// données publiques : la dénomination affichée est celle des registres.
const SIRENS = [
  "424059822", // vente à distance
  "775661390", // distribution d'équipements
  "347384570", // commerce d'électroménager
  "552081317", // énergie
  "542107651", // énergie
  "552032534", // agroalimentaire (fiche de contrôle, peu de litiges attendus)
];

const CATEGORIES: CategorieLitige[] = ["REMBOURSEMENT", "LIVRAISON", "GARANTIE", "SAV", "RESILIATION", "AUTRE"];

const RESUMES: Record<CategorieLitige, string> = {
  REMBOURSEMENT:
    "Commande annulée dans le délai de rétractation. Retour envoyé et réception confirmée par le transporteur. Aucun remboursement à ce jour malgré deux relances écrites.",
  LIVRAISON:
    "Livraison annoncée sous 48 heures, colis jamais présenté. Le suivi indique une remise, sans signature ni avis de passage. Le service client renvoie vers le transporteur.",
  GARANTIE:
    "Panne survenue pendant la garantie légale de conformité. La prise en charge est refusée au motif d'un usage anormal, sans expertise contradictoire proposée.",
  SAV: "Produit déposé en réparation il y a plus de deux mois. Aucune date de restitution communiquée, dossier sans réponse malgré trois relances téléphoniques et un courriel.",
  RESILIATION:
    "Résiliation demandée par écrit avec accusé de réception. Les prélèvements se sont poursuivis les deux mois suivants, sans réponse à la demande de remboursement.",
  AUTRE:
    "Offre présentée à un prix différent de celui facturé. La différence n'a pas été expliquée et aucune régularisation n'a été proposée après réclamation écrite.",
};

const PRENOMS = ["Julien", "Sofia", "Marc", "Camille", "Nadia", "Thomas", "Léa", "Karim", "Hélène", "Paul", "Inès", "Antoine"];
const NOMS = ["Moreau", "Bernard", "Dubois", "Lefèvre", "Garnier", "Roux", "Vincent", "Fontaine", "Chevalier", "Marchand"];
const VILLES = ["Bordeaux", "Rennes", "Toulouse", "Lille", "Lyon", "Nantes", "Marseille", "Strasbourg"];

const TEXTES_AVIS = [
  "Remboursement obtenu au bout de six semaines après la relance écrite. Le service client ne répondait plus à mes courriels ; la liste des démarches m'a aidé à structurer ma réclamation.",
  "Deux mois sans réponse malgré les relances, il a fallu saisir le médiateur pour obtenir un avoir. Le suivi du signalement était clair, mais chaque étape a traîné.",
  "Panne signalée pendant la garantie légale, refus de prise en charge au motif d'un usage anormal. Aucune expertise contradictoire proposée à ce jour.",
  "Commande arrivée avec quinze jours de retard, service client injoignable par téléphone. Le geste commercial proposé ne couvrait pas les frais engagés.",
  "Prix intéressants et livraison correcte pour ma part, mais la lecture des signalements récents reste préoccupante.",
];

function aleatoire<T>(liste: T[], graine: number): T {
  return liste[graine % liste.length];
}

function dateIlYA(jours: number): Date {
  return new Date(Date.now() - jours * 86_400_000);
}

async function creerAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@recours-france.fr";
  const motDePasse = process.env.ADMIN_PASSWORD ?? "recours-france-2026";
  const existant = await prisma.adminUser.findUnique({ where: { email } });
  if (existant) {
    console.log(`• Compte d'administration déjà présent : ${email}`);
    return;
  }
  await prisma.adminUser.create({
    data: {
      email,
      nom: "Équipe modération",
      motDePasseHash: await hacherMotDePasse(motDePasse),
      role: "administrateur",
    },
  });
  console.log(`✓ Compte d'administration créé : ${email} / ${motDePasse}`);
  console.log("  Changez ce mot de passe avant toute mise en production.");
}

async function importerFiches(): Promise<string[]> {
  const ids: string[] = [];
  for (const siren of SIRENS) {
    process.stdout.write(`• Import ${siren}… `);
    try {
      const resultat = await synchroniserEntreprise(siren);
      if (!resultat) {
        console.log("introuvable");
        continue;
      }
      ids.push(resultat.entrepriseId);
      const echecs = resultat.sources.filter((s) => s.statut === "erreur").map((s) => s.source);
      console.log(
        `ok (${resultat.evenements} événements, ${resultat.etablissements} établissements${echecs.length ? `, échecs : ${echecs.join(", ")}` : ""})`,
      );
    } catch (e) {
      console.log(`échec : ${String(e).slice(0, 120)}`);
    }
  }
  return ids;
}

/**
 * Signalements de démonstration.
 * La première entreprise reçoit assez de signalements vérifiés pour dépasser le
 * seuil de publication du score d'expérience ; la deuxième reste sous le seuil,
 * afin d'exercer les deux états de la fiche.
 */
async function creerSignalements(entrepriseIds: string[]) {
  if (!entrepriseIds.length) return;

  const plan = [
    { id: entrepriseIds[0], nombre: 58, partVerifiee: 0.72 },
    { id: entrepriseIds[1] ?? entrepriseIds[0], nombre: 14, partVerifiee: 0.5 },
    { id: entrepriseIds[3] ?? entrepriseIds[0], nombre: 26, partVerifiee: 0.35 },
  ];

  let compteur = 0;
  for (const { id, nombre, partVerifiee } of plan) {
    for (let i = 0; i < nombre; i++) {
      compteur++;
      const categorie = aleatoire(CATEGORIES, compteur * 7 + i);
      const jours = 5 + ((compteur * 13) % 350);
      const creeLe = dateIlYA(jours);
      const verifie = i / nombre < partVerifiee;

      // Répartition des issues : résolu confirmé, non résolu, en cours, abandonné.
      const tirage = (compteur * 31) % 100;
      let statut: StatutSignalement = "EN_COURS";
      let reponse = false;
      let resolutionConfirmee = false;
      let closLe: Date | null = null;
      let resolutionConfirmeeLe: Date | null = null;

      if (tirage < 42) {
        statut = "RESOLU_CONFIRME";
        reponse = true;
        resolutionConfirmee = true;
        const delai = 3 + ((compteur * 5) % 34);
        resolutionConfirmeeLe = new Date(creeLe.getTime() + delai * 86_400_000);
        closLe = resolutionConfirmeeLe;
      } else if (tirage < 62) {
        statut = "NON_RESOLU";
        reponse = tirage % 3 !== 0;
        closLe = new Date(creeLe.getTime() + 45 * 86_400_000);
      } else if (tirage < 74) {
        statut = "ABANDONNE";
        closLe = new Date(creeLe.getTime() + 30 * 86_400_000);
      } else if (tirage < 88) {
        statut = "REPONSE_DECLAREE";
        reponse = true;
      }

      // Les signalements récents restent ouverts.
      if (jours < 20 && statut !== "EN_COURS") {
        statut = "EN_COURS";
        closLe = null;
        resolutionConfirmee = false;
        resolutionConfirmeeLe = null;
      }

      const prenom = aleatoire(PRENOMS, compteur);
      const nom = aleatoire(NOMS, compteur * 3);
      const reference = `RF-${creeLe.getFullYear()}-${String(creeLe.getMonth() + 1).padStart(2, "0")}-${10_000 + compteur}`;

      const signalement = await prisma.signalement.upsert({
        where: { reference },
        update: {},
        create: {
          reference,
          entrepriseId: id,
          categorie,
          montant: 40 + ((compteur * 37) % 1800),
          dateFaits: dateIlYA(jours + 12),
          contactPrealable: compteur % 3 === 0 ? "AUCUN" : compteur % 3 === 1 ? "ECRIT" : "TELEPHONE",
          resume: RESUMES[categorie],
          prenom,
          nom,
          email: `${prenom.toLowerCase()}.${nom.toLowerCase().replace(/[^a-z]/g, "")}${compteur}@example.com`,
          certifie: true,
          consentement: true,
          niveauVerification: verifie ? "PIECE_EXAMINEE" : "DECLARE",
          verifieLe: verifie ? new Date(creeLe.getTime() + 86_400_000) : null,
          verifiePar: verifie ? "Équipe modération" : null,
          statut,
          reponseDeclaree: reponse,
          reponseDeclareeLe: reponse ? new Date(creeLe.getTime() + 6 * 86_400_000) : null,
          resolutionConfirmee,
          resolutionConfirmeeLe,
          closLe,
          moderation: "PUBLIE",
          creeLe,
        },
      });

      await prisma.evenementSignalement.createMany({
        data: [
          {
            signalementId: signalement.id,
            date: creeLe,
            titre: "Signalement créé",
            detail: `Catégorie ${categorie.toLowerCase()}.`,
            auteur: "CONSOMMATEUR",
            etiquette: "CONSOMMATEUR",
          },
          ...(verifie
            ? [
                {
                  signalementId: signalement.id,
                  date: new Date(creeLe.getTime() + 86_400_000),
                  titre: "Signalement vérifié",
                  detail: "Pièce contrôlée : relation commerciale établie.",
                  auteur: "RECOURS_FRANCE" as const,
                  etiquette: "VÉRIFICATION",
                },
              ]
            : []),
        ],
        skipDuplicates: true,
      });
    }
  }
  console.log(`✓ ${compteur} signalements de démonstration créés`);
}

async function creerAvis(entrepriseIds: string[]) {
  if (!entrepriseIds.length) return;
  const signalements = await prisma.signalement.findMany({
    where: { entrepriseId: entrepriseIds[0], niveauVerification: "PIECE_EXAMINEE" },
    take: 4,
  });

  let n = 0;
  for (const [index, s] of signalements.entries()) {
    n++;
    const existe = await prisma.avis.findFirst({ where: { signalementId: s.id } });
    if (existe) continue;
    await prisma.avis.create({
      data: {
        entrepriseId: s.entrepriseId!,
        signalementId: s.id,
        note: [4, 2, 1, 3][index % 4],
        texte: TEXTES_AVIS[index % TEXTES_AVIS.length],
        auteur: `${s.prenom} ${s.nom.charAt(0)}.`,
        ville: aleatoire(VILLES, index),
        email: s.email,
        verifie: true,
        moderation: "PUBLIE",
        publieLe: dateIlYA(10 + index * 8),
      },
    });
  }

  // Deux avis non vérifiés, exclus de la moyenne.
  for (let i = 0; i < 2; i++) {
    const email = `visiteur${i}@example.com`;
    const existe = await prisma.avis.findFirst({ where: { entrepriseId: entrepriseIds[0], email } });
    if (existe) continue;
    await prisma.avis.create({
      data: {
        entrepriseId: entrepriseIds[0],
        note: i === 0 ? 2 : 4,
        texte: TEXTES_AVIS[3 + i],
        auteur: "Compte utilisateur",
        email,
        verifie: false,
        moderation: "PUBLIE",
        publieLe: dateIlYA(5 + i * 12),
      },
    });
    n++;
  }
  console.log(`✓ ${n} avis de démonstration créés`);
}

async function purgerDemo() {
  const supprimes = await prisma.signalement.deleteMany({ where: { email: { endsWith: "@example.com" } } });
  const avis = await prisma.avis.deleteMany({ where: { email: { endsWith: "@example.com" } } });
  console.log(`✓ ${supprimes.count} signalements et ${avis.count} avis de démonstration supprimés`);
  for (const e of await prisma.entreprise.findMany({ select: { id: true } })) {
    await recalculerIndices(e.id).catch(() => undefined);
  }
}

async function main() {
  if (process.argv.includes("--purge-demo")) {
    await purgerDemo();
    return;
  }

  console.log("Amorçage de Recours France\n");
  await creerAdmin();

  console.log("\nConstitution des fiches depuis les registres publics :");
  const ids = await importerFiches();

  if (!ids.length) {
    console.log("\n⚠ Aucune fiche importée — vérifiez l’accès réseau aux API publiques.");
    return;
  }

  console.log("\nDonnées de démonstration :");
  await creerSignalements(ids);
  await creerAvis(ids);

  console.log("\nRecalcul des indices :");
  for (const id of ids) {
    const calcul = await recalculerIndices(id);
    const entreprise = await prisma.entreprise.findUnique({ where: { id }, select: { denomination: true } });
    console.log(
      `• ${entreprise?.denomination}: transparence ${calcul?.transparence.score}/100, expérience ${
        calcul?.experience.publie ? `${calcul.experience.score}/100` : "non publiée"
      }`,
    );
  }

  console.log("\nTerminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
