/**
 * Détection du site officiel d'une entreprise.
 *
 * Aucun registre public ne publie l'adresse d'un site : ni Sirene, ni le RNE,
 * ni l'API Recherche d'entreprises. Il faut donc la trouver — sans moteur de
 * recherche, dont l'interrogation automatisée est payante et contraire aux
 * conditions d'usage.
 *
 * La méthode repose sur une asymétrie utile : **deviner est bon marché, et on
 * dispose d'un vérificateur fiable.** Un site marchand est légalement tenu de
 * publier son SIREN dans ses mentions légales (art. L111-1 du code de la
 * consommation, art. 6-III de la LCEN). On génère donc des candidats, et on ne
 * retient que ceux qui portent le SIREN attendu. Une mauvaise pioche est
 * rejetée : aucun faux positif n'est possible.
 *
 * C'est l'inverse du test existant dans site-officiel.ts, qui extrait le
 * premier groupe de neuf chiffres rencontré — acceptable pour enrichir, mais
 * dangereux pour vérifier : un numéro de téléphone ou un capital social passe.
 */
import { appel } from "./http";
import { explorationAutorisee } from "./robots";
import { trouverLien } from "./site-officiel";
import { prisma } from "../db";

/** Terminaisons essayées, dans l'ordre de vraisemblance pour une entreprise française. */
const TERMINAISONS = [".fr", ".com"];

/** Libellés et chemins des liens menant aux pages légales. */
const LIENS_LEGAUX = [
  "mentions-legales",
  "mentions légales",
  "mentions_legales",
  "informations-legales",
  "cgv",
  "conditions générales",
  "conditions-generales",
];

/** Chemins de repli, si aucun lien n'est trouvé dans la page d'accueil. */
const CHEMINS_REPLI = ["/mentions-legales", "/cgv"];

/** Un domaine qui ne répond pas en trois secondes n'est pas le bon. */
const DELAI_SONDAGE = 3_000;
const DELAI_LECTURE = 6_000;

/** Mots qui n'aident pas à deviner un domaine. */
const MOTS_IGNORES = new Set([
  "SA", "SAS", "SASU", "SARL", "EURL", "SNC", "SCI", "GIE", "SEM",
  "GROUPE", "SOCIETE", "ETABLISSEMENTS", "ETS", "COMPAGNIE", "CIE",
  "ET", "DE", "DU", "DES", "LA", "LE", "LES", "FRANCE",
  "PARTICIPATIONS", "SERVICES", "HOLDING", "INTERNATIONAL",
]);

export type Provenance = "declare" | "consommateur" | "wikidata" | "devine";

export type SiteDetecte = {
  url: string;
  provenance: Provenance;
  /** Page où le SIREN a été retrouvé. */
  preuve: string;
};

/**
 * Domaines candidats dérivés de la dénomination.
 *
 * Volontairement peu nombreux : chaque candidat coûte des requêtes chez un tiers,
 * et la vérification par SIREN rend inutile toute tentative de finesse.
 */
export function candidatsDepuisNom(denomination: string): string[] {
  const tous = denomination
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((m) => m.length >= 2);

  const mots = tous.filter((m) => !MOTS_IGNORES.has(m));
  if (!mots.length) return [];

  const bases = new Set<string>();
  // Le nom complet d'abord : « FRANCE » est écarté comme mot vide, alors qu'il
  // appartient souvent à la marque — CAR PARTS FRANCE se trouve sur
  // carpartsfrance.fr, pas sur carparts.fr.
  bases.add(tous.join("").toLowerCase());
  bases.add(mots.join("").toLowerCase());
  if (mots.length > 1) bases.add(mots.slice(0, 2).join("").toLowerCase());
  bases.add(mots[0].toLowerCase());

  // Le préfixe « www » n'est pas décoratif : beaucoup de domaines apex ne
  // résolvent pas ou ne servent pas HTTPS. Sans lui, cdiscount.fr échoue alors
  // que www.cdiscount.com répond.
  const candidats: string[] = [];
  for (const base of bases) {
    if (base.length < 3 || base.length > 30) continue;
    for (const tld of TERMINAISONS) {
      candidats.push(`https://www.${base}${tld}`);
      candidats.push(`https://${base}${tld}`);
    }
  }
  return candidats.slice(0, 14);
}

/** Normalise une saisie humaine en URL exploitable. */
export function normaliserUrl(saisie: string): string | null {
  const propre = saisie.trim().replace(/\s/g, "");
  if (!propre || propre.length > 200) return null;
  const avecSchema = /^https?:\/\//i.test(propre) ? propre : `https://${propre}`;
  try {
    const url = new URL(avecSchema);
    if (!url.hostname.includes(".")) return null;
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return null;
  }
}

/**
 * Le SIREN attendu figure-t-il sur ce site ?
 *
 * On cherche une chaîne connue plutôt que d'en extraire une quelconque : c'est
 * ce qui rend le contrôle sûr. Le SIREN est accepté avec ou sans séparateurs,
 * comme il s'écrit couramment (« 424 059 822 », « 424.059.822 »).
 */
export async function porteLeSiren(racine: string, siren: string): Promise<string | null> {
  const attendu = siren.replace(/\D/g, "");
  if (attendu.length !== 9) return null;
  const motif = new RegExp(
    `\\b${attendu.slice(0, 3)}[\\s.\\-]?${attendu.slice(3, 6)}[\\s.\\-]?${attendu.slice(6)}\\b`,
  );

  const lireBrut = async (url: string, delai: number): Promise<string | null> => {
    if (!(await explorationAutorisee(url))) return null;
    try {
      const reponse = await appel(url, {
        timeoutMs: delai,
        tentatives: 0,
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (!reponse.ok) return null;
      return (await reponse.text()).slice(0, 400_000);
    } catch {
      return null;
    }
  };

  // Un seul sondage décide du sort du candidat : si la racine ne répond pas,
  // inutile d'essayer des chemins qui expireront tous. C'est ce qui fait la
  // différence entre quelques secondes et plusieurs minutes par entreprise.
  const accueilBrut = await lireBrut(racine, DELAI_SONDAGE);
  if (accueilBrut === null) return null;
  if (motif.test(sansBalises(accueilBrut))) return racine;

  // Deviner le chemin des mentions légales est aussi hasardeux que deviner le
  // domaine : /cgv, /cgv.html, /nos-conditions-generales… On suit donc le lien
  // réellement présent dans la page, et les chemins usuels ne servent que de
  // repli.
  const cibles = new Set<string>();
  const lienTrouve = trouverLien(accueilBrut, racine, LIENS_LEGAUX);
  if (lienTrouve) cibles.add(lienTrouve);
  for (const chemin of CHEMINS_REPLI) cibles.add(`${racine}${chemin}`);

  const pages = await Promise.all(
    [...cibles].map(async (url) => ({ url, brut: await lireBrut(url, DELAI_LECTURE) })),
  );
  for (const page of pages) {
    if (page.brut && motif.test(sansBalises(page.brut))) return page.url;
  }
  return null;
}

function sansBalises(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
}

/**
 * Détermine le site officiel d'une entreprise, ou null.
 *
 * Les pistes sont essayées par confiance décroissante. La première qui porte le
 * SIREN gagne — inutile d'aller plus loin, la preuve est la même.
 */
export async function detecterSite(entreprise: {
  siren: string;
  denomination: string;
  siteDeclare?: string | null;
  siteIndiqueParConsommateur?: string | null;
}): Promise<SiteDetecte | null> {
  // Table Wikidata importée localement : consultation instantanée, sans réseau.
  // C'est la seule piste qui atteigne les grandes enseignes, dont les sites
  // rejettent le trafic non-navigateur et resteraient donc invérifiables.
  const connu = await prisma.siteConnu
    .findUnique({ where: { siren: entreprise.siren.replace(/\D/g, "") } })
    .catch(() => null);
  if (connu) {
    // Le SIREN vient de Wikidata, pas d'une devinette : la correspondance est
    // déjà établie. On tente quand même la confirmation sur le site, et on
    // retient la donnée même si le site nous bloque.
    const preuve = await porteLeSiren(connu.site, entreprise.siren);
    return {
      url: connu.site,
      provenance: "wikidata",
      preuve: preuve ?? "Wikidata (P1616 SIREN + P856 site officiel) — non reconfirmé sur le site",
    };
  }

  const pistes: { url: string; provenance: Provenance }[] = [];

  const declare = entreprise.siteDeclare ? normaliserUrl(entreprise.siteDeclare) : null;
  if (declare) pistes.push({ url: declare, provenance: "declare" });

  const indique = entreprise.siteIndiqueParConsommateur
    ? normaliserUrl(entreprise.siteIndiqueParConsommateur)
    : null;
  if (indique && indique !== declare) pistes.push({ url: indique, provenance: "consommateur" });

  for (const candidat of candidatsDepuisNom(entreprise.denomination)) {
    if (!pistes.some((p) => p.url === candidat)) pistes.push({ url: candidat, provenance: "devine" });
  }

  // Les pistes sont indépendantes : les éprouver en parallèle divise le temps
  // par autant. On garde la mieux classée parmi celles qui aboutissent.
  const resultats = await Promise.all(
    pistes.map(async (piste) => ({ piste, preuve: await porteLeSiren(piste.url, entreprise.siren) })),
  );
  const retenue = resultats.find((r) => r.preuve !== null);
  return retenue
    ? { url: retenue.piste.url, provenance: retenue.piste.provenance, preuve: retenue.preuve! }
    : null;
}
