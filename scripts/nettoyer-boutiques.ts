/**
 * Nettoyage des fiches boutique issues de l'import en masse.
 * `npm run nettoyer:boutiques` — simulation ; `-- --appliquer` pour agir.
 *
 * Le tag `website` d'OpenStreetMap ne désigne pas « le site de cette
 * entreprise » mais « où trouver ce commerce ». Un opticien franchisé y porte
 * le site national de son enseigne, un fleuriste sa page Facebook, un coiffeur
 * sa plateforme de réservation. L'import a donc produit des fiches exactes sur
 * le domaine et fausses sur l'exploitant.
 *
 * Deux traitements distincts, parce que les deux défauts n'ont pas la même
 * nature :
 *   — un domaine d'enseigne reste un vrai site marchand : la fiche est
 *     conservée, seul le rattachement arbitraire est retiré ;
 *   — un domaine de plateforme ou de réseau social n'est le site de personne :
 *     la fiche n'a pas lieu d'être.
 */
import { prisma } from "../src/lib/db";

const appliquer = process.argv.includes("--appliquer");

/**
 * Au-delà de ce nombre d'entreprises pour un même domaine, il s'agit d'un
 * réseau, pas d'un commerçant. Le seuil n'est pas à 2 : une holding et sa
 * filiale d'exploitation partagent légitimement un site.
 */
const SEUIL_RESEAU = 3;

/**
 * Domaines qui hébergent des tiers. Seul le domaine nu est visé : un
 * sous-domaine comme recupauto48.wixsite.com EST le site du garage, et doit
 * être conservé.
 */
const PLATEFORMES = new Set([
  "facebook.com", "m.facebook.com", "fr-fr.facebook.com", "instagram.com", "linkedin.com",
  "twitter.com", "x.com", "youtube.com", "tiktok.com", "pinterest.fr", "pinterest.com",
  "planity.com", "doctolib.fr", "pagesjaunes.fr", "google.com", "sites.google.com",
  "wixsite.com", "wix.com", "blogspot.com", "wordpress.com", "over-blog.com",
  "e-monsite.com", "jimdo.com", "webnode.fr", "leboncoin.fr", "airbnb.fr", "booking.com",
  "tripadvisor.fr", "linktr.ee", "index-education.net", "giprecia.org",
]);

async function main() {
  console.log(appliquer ? "\nNettoyage — application réelle\n" : "\nNettoyage — simulation (ajouter --appliquer)\n");

  const avant = await prisma.boutique.count();
  console.log(`  ${avant.toLocaleString("fr-FR")} boutique(s) en base\n`);

  // ── 1. Plateformes et réseaux sociaux : la fiche n'a pas d'objet ─────────
  const toutes = await prisma.boutique.findMany({
    select: { id: true, domaine: true, _count: { select: { signalements: true } } },
  });
  const surPlateforme = toutes.filter((b) => PLATEFORMES.has(b.domaine));
  // Aucune déclaration ne doit être perdue : une fiche qui en porte est gardée.
  const supprimables = surPlateforme.filter((b) => b._count.signalements === 0);
  const protegees = surPlateforme.length - supprimables.length;

  console.log(`  ${supprimables.length} fiche(s) sur une plateforme ou un réseau social`);
  supprimables.slice(0, 6).forEach((b) => console.log(`      ${b.domaine}`));
  if (protegees) console.log(`      (${protegees} conservée(s) : elles portent des déclarations)`);

  if (appliquer && supprimables.length) {
    await prisma.boutique.deleteMany({ where: { id: { in: supprimables.map((b) => b.id) } } });
  }

  // ── 2. Domaines de réseau : la fiche reste, l'exploitant part ────────────
  const parDomaine = await prisma.entreprise.groupBy({
    by: ["siteWeb"],
    where: { siteWeb: { not: null } },
    _count: true,
  });
  const reseaux = parDomaine.filter((d) => d._count >= SEUIL_RESEAU).map((d) => d.siteWeb!);
  const hotes = new Set(
    reseaux.map((u) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")),
  );

  const candidats = await prisma.boutique.findMany({
    where: { entrepriseId: { not: null }, domaine: { in: [...hotes] } },
    select: { id: true, domaine: true, entreprise: { select: { denomination: true } } },
  });

  // Exception : quand la dénomination correspond EXACTEMENT au domaine, la
  // société est la tête de réseau, pas une succursale — boulanger.com appartient
  // bien à BOULANGER. L'égalité stricte est nécessaire : « CITYA IMMOBILIER LA
  // POSTE » contient « citya » sans être le propriétaire de citya.com.
  const normaliser = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const teteDeReseau = candidats.filter((b) => {
    const base = normaliser(b.domaine.split(".")[0]);
    return b.entreprise ? normaliser(b.entreprise.denomination) === base : false;
  });
  const aDelier = candidats.filter((b) => !teteDeReseau.includes(b));

  if (teteDeReseau.length) {
    console.log(`\n  ${teteDeReseau.length} rattachement(s) conservé(s) : la société est la tête de réseau`);
    teteDeReseau.slice(0, 5).forEach((b) =>
      console.log(`      ${b.domaine.padEnd(32)} ${b.entreprise?.denomination.slice(0, 34)}`),
    );
  }

  console.log(`\n  ${aDelier.length} fiche(s) rattachée(s) à un exploitant arbitraire`);
  aDelier.slice(0, 6).forEach((b) =>
    console.log(`      ${b.domaine.padEnd(32)} était attribué à ${b.entreprise?.denomination.slice(0, 34)}`),
  );

  if (appliquer && aDelier.length) {
    await prisma.boutique.updateMany({
      where: { id: { in: aDelier.map((b) => b.id) } },
      data: { entrepriseId: null, rattachementSource: null, rattachementLe: null },
    });
  }

  const apres = await prisma.boutique.count();
  console.log(
    appliquer
      ? `\n  ${avant.toLocaleString("fr-FR")} → ${apres.toLocaleString("fr-FR")} boutique(s), ${aDelier.length} déliée(s)\n`
      : `\n  ${supprimables.length} suppression(s) et ${aDelier.length} déliaison(s) à appliquer.\n`,
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
