/**
 * Contrôle avant ouverture au public.
 *
 * Une mise en ligne rate rarement sur une erreur de code : elle rate sur une
 * variable oubliée, un bandeau de démonstration resté allumé, cent signalements
 * inventés attribués à des sociétés réelles. Autant de choses qu'on croit avoir
 * faites.
 *
 * Ce script les vérifie une par une et sort en erreur s'il en reste. Il ne
 * modifie rien.
 *
 *   npm run verifier:mise-en-ligne
 */

import { PrismaClient } from "@prisma/client";
import { mentionsManquantes } from "../src/lib/editeur";

const prisma = new PrismaClient();

type Controle = { titre: string; ok: boolean; detail: string };

const controles: Controle[] = [];

function verifier(titre: string, ok: boolean, detail: string) {
  controles.push({ titre, ok, detail });
}

async function main() {
  // ── Mentions légales ───────────────────────────────────────────────────
  const manquantes = mentionsManquantes();
  verifier(
    "Mentions légales",
    manquantes.length === 0,
    manquantes.length === 0
      ? "éditeur et hébergeur renseignés"
      : `${manquantes.length} variable(s) à définir : ${manquantes.join(", ")}`,
  );

  // ── Bandeau de démonstration ───────────────────────────────────────────
  const banniereEteinte = (process.env.DEMO_BANNER ?? "").trim().toLowerCase() === "false";
  verifier(
    "Bandeau de démonstration",
    banniereEteinte,
    banniereEteinte
      ? "éteint"
      : `DEMO_BANNER=${process.env.DEMO_BANNER ?? "(absent)"} — le site annoncerait des données fictives`,
  );

  // ── Forme de l'URL de base ─────────────────────────────────────────────
  // Le bouton « copier » du tableau de bord donne l'URL entière ; à la
  // sélection manuelle on emporte facilement « motdepasse@hote/base » sans le
  // « postgresql://user: » qui precede. Prisma ne le dit qu'à la première
  // requête, page par page, en pleine production.
  const urlBase = process.env.DATABASE_URL ?? "";
  // Le protocole et un hôte suffisent : une URL locale légitime n'a pas de mot
  // de passe (authentification par confiance), et l'exiger la rejetait à tort.
  // Ce que le contrôle traque, c'est le collage tronqué qui perd le préfixe.
  const urlValide = /^postgres(ql)?:\/\/[^@\s]*@?[^@\s]+/.test(urlBase);
  verifier(
    "Forme de DATABASE_URL",
    urlValide,
    urlValide
      ? "protocole et hôte présents"
      : urlBase
        ? `commence par « ${urlBase.slice(0, 24)}… » — il manque le préfixe postgresql://utilisateur:`
        : "absente",
  );

  // ── Secrets ────────────────────────────────────────────────────────────
  const secret = process.env.APP_SECRET ?? "";
  verifier(
    "APP_SECRET",
    secret.length >= 32,
    secret.length >= 32
      ? `${secret.length} caractères`
      : "absent ou trop court — il signe les jetons d'accès aux dossiers",
  );

  const url = process.env.APP_URL ?? "";
  verifier(
    "APP_URL",
    url.startsWith("https://"),
    url.startsWith("https://")
      ? url
      : `« ${url || "(absent)"} » — les liens des courriels et le plan de site en dépendent`,
  );

  // ── Données de démonstration ───────────────────────────────────────────
  // Les lectures en base sont isolées : une base injoignable est un résultat
  // de contrôle, pas une raison d'interrompre les autres. Sans cela le script
  // mourait sur la première requête — et le contrôle de forme d'URL
  // ci-dessus, écrit précisément pour diagnostiquer ce cas, ne s'affichait
  // jamais.
  try {
    const fictifs = await prisma.signalement.count({
      where: {
        OR: [
          { email: { endsWith: "@example.com" } },
          { email: { in: ["k@gmail.com", "ki@gmail.com", "killian@gmail.com", "killian.belabbes@gmail.com"] } },
        ],
      },
    });
    verifier(
      "Signalements de démonstration",
      fictifs === 0,
      fictifs === 0
        ? "aucun"
        : `${fictifs} reproche(s) inventé(s) visant des sociétés réelles — npm run purger:demo -- --appliquer`,
    );

    // ── Contenu réel ─────────────────────────────────────────────────────
    const entreprises = await prisma.entreprise.count();
    verifier("Annuaire", entreprises > 1_000_000, `${entreprises.toLocaleString("fr-FR")} fiches`);

    // ── Noms de personnes physiques ──────────────────────────────────────
    // L'import de masse écarte les entrepreneurs individuels : leur identité
    // est celle d'une personne privée. La création à la volée les laissait
    // passer, et publiait un nom propre sur une page intitulée « avis,
    // problèmes, litiges ». Le trou est bouché, restent les fiches créées
    // avant : elles ne se suppriment pas d'elles-mêmes.
    const physiques = await prisma.entreprise.count({ where: { categorieJuridique: "1000" } });
    verifier(
      "Personnes physiques",
      physiques === 0,
      physiques === 0
        ? "aucune"
        : `${physiques} fiche(s) portant le nom d'un particulier — à supprimer avant publication`,
    );
  } catch {
    verifier("Base de données", false, "injoignable — les contrôles de contenu n'ont pas pu s'exécuter");
  }

  // ── Restitution ────────────────────────────────────────────────────────
  const largeur = Math.max(...controles.map((c) => c.titre.length));
  console.log("");
  for (const c of controles) {
    console.log(`  ${c.ok ? "✓" : "✗"}  ${c.titre.padEnd(largeur)}   ${c.detail}`);
  }

  const echecs = controles.filter((c) => !c.ok);
  console.log("");
  if (echecs.length === 0) {
    console.log("  Rien ne s'oppose à l'ouverture au public.\n");
    return;
  }
  console.log(`  ${echecs.length} point(s) à régler avant d'ouvrir le site au public.\n`);
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
