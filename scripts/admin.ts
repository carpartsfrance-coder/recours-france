/**
 * Crée ou réinitialise un compte d'administration.
 *
 * Écrit pour être lancé sur n'importe quelle base — la locale comme celle de
 * production — sans qu'aucun identifiant ne passe par la ligne de commande.
 * Une ligne de commande finit dans l'historique du shell, dans la liste des
 * processus, et parfois dans les journaux de l'hébergeur ; tout ce qui est
 * secret est donc demandé au clavier, sans écho.
 *
 * L'adresse de la base est prise dans `DATABASE_URL` si elle est déjà posée —
 * c'est le cas dans le shell de Render — et demandée sinon.
 *
 *   npm run admin
 *
 * Le mot de passe n'est jamais affiché ni journalisé, et l'adresse de la base
 * n'est montrée que privée de ses identifiants.
 */

import "dotenv/config";
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";
import { hacherMotDePasse } from "../src/lib/mot-de-passe";

/**
 * Lecture au clavier, avec ou sans écho.
 *
 * Une seule interface pour tout le script : `readline` met en tampon ce qu'il
 * lit, et en ouvrir une par question fait avaler les réponses suivantes par la
 * première dès que l'entrée n'est pas un vrai terminal — un `printf | npm run`
 * restait bloqué à la première invite.
 *
 * `readline` n'a pas de mode masqué : on intercepte son écriture pour ne
 * réafficher que des étoiles. Le caractère reste dans le tampon, seul son
 * affichage change.
 */
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let masquer = false;

{
  const interne = rl as unknown as { _writeToOutput: (s: string) => void };
  const ecrire = interne._writeToOutput.bind(rl);
  interne._writeToOutput = (s: string) => {
    if (!masquer || s.includes("?") || s.includes(":")) ecrire(s);
    else if (s.trim().length > 0) ecrire("*");
  };
}

function demander(question: string, masque = false): Promise<string> {
  masquer = masque;
  return new Promise((resoudre) => {
    rl.question(question, (reponse) => {
      masquer = false;
      if (masque) process.stdout.write("\n");
      resoudre(reponse.trim());
    });
  });
}

/** L'adresse de la base, privée de ses identifiants, pour l'afficher sans risque. */
function sansSecret(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? "***@" : ""}${u.host}${u.pathname}`;
  } catch {
    return "(adresse illisible)";
  }
}

async function main() {
  console.log("Compte d'administration — Recours France\n");

  let url = process.env.DATABASE_URL ?? "";
  if (url) {
    console.log(`Base trouvée dans l'environnement : ${sansSecret(url)}`);
    const garder = await demander("L'utiliser ? [O/n] ");
    if (garder.toLowerCase().startsWith("n")) url = "";
  }
  if (!url) {
    console.log("\nColle l'adresse de la base (elle ne s'affichera pas).");
    console.log("Sur Render : Dashboard → la base Postgres → « Internal Database URL ».");
    url = await demander("DATABASE_URL : ", true);
  }
  if (!url.startsWith("postgres")) {
    console.error("\nCe n'est pas une adresse PostgreSQL. Rien n'a été fait.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    // Un compte à créer sur la mauvaise base est une erreur silencieuse : on
    // montre d'abord ce que la base contient, pour que l'utilisateur la
    // reconnaisse avant d'écrire quoi que ce soit.
    const [entreprises, signalements, comptes] = await Promise.all([
      prisma.entreprise.count(),
      prisma.signalement.count(),
      prisma.adminUser.findMany({ select: { email: true, actif: true, dernierAccesLe: true } }),
    ]);

    console.log(`\nBase : ${sansSecret(url)}`);
    console.log(`  ${entreprises.toLocaleString("fr-FR")} entreprises, ${signalements} signalement(s)`);
    if (comptes.length === 0) {
      console.log("  aucun compte d'administration");
    } else {
      console.log(`  ${comptes.length} compte(s) :`);
      for (const c of comptes) {
        const vu = c.dernierAccesLe ? c.dernierAccesLe.toISOString().slice(0, 16).replace("T", " ") : "jamais";
        console.log(`     ${c.email}${c.actif ? "" : "  (désactivé)"}  — dernier accès ${vu}`);
      }
    }

    const suite = await demander("\nC'est bien la bonne base ? [o/N] ");
    if (!suite.toLowerCase().startsWith("o")) {
      console.log("Annulé. Rien n'a été écrit.");
      return;
    }


    const saisie = await demander("\nAdresse e-mail [admin@recours-france.fr] : ");
    const email = (saisie || "admin@recours-france.fr").toLowerCase();

    const mdp = await demander("Nouveau mot de passe : ", true);
    if (mdp.length < 12) {
      console.error("Douze caractères au minimum. Rien n'a été fait.");
      process.exit(1);
    }
    const confirmation = await demander("Confirmer : ", true);
    if (mdp !== confirmation) {
      console.error("Les deux saisies diffèrent. Rien n'a été fait.");
      process.exit(1);
    }

    const hash = await hacherMotDePasse(mdp);
    const existant = comptes.find((c) => c.email === email);

    await prisma.adminUser.upsert({
      where: { email },
      update: { motDePasseHash: hash, actif: true },
      create: { email, nom: "Équipe modération", role: "administrateur", motDePasseHash: hash },
    });

    // Les sessions ouvertes survivraient à un changement de mot de passe, ce
    // qui vide l'opération de son sens quand on la fait parce qu'on soupçonne
    // une fuite.
    const { count } = await prisma.adminSession.deleteMany({});

    console.log(`\n✓ ${existant ? "Mot de passe changé" : "Compte créé"} : ${email}`);
    if (count > 0) console.log(`  ${count} session(s) ouverte(s) fermée(s).`);
    console.log("\nConnexion : /admin/connexion");
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main().catch((e) => {
  console.error(`\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
