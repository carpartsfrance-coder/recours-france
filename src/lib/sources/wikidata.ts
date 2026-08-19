/**
 * Correspondance SIREN → site officiel, depuis Wikidata.
 *
 * Aucun registre public français ne publie l'adresse d'un site : ni Sirene, ni
 * le RNE, ni l'API Recherche d'entreprises. La détection par sondage de
 * domaines fonctionne sur la longue traîne, mais échoue précisément sur les
 * grandes enseignes, qui rejettent le trafic non-navigateur — et ce sont elles
 * qui concentrent les litiges.
 *
 * Wikidata comble exactement ce trou : la propriété P1616 porte le SIREN, la
 * P856 le site officiel. Environ 12 700 entreprises françaises ont les deux,
 * fortement concentrées sur les marques connues.
 *
 * On importe la table entière en une requête, puis les recherches se font hors
 * ligne : aucune requête réseau au moment de synchroniser une fiche, aucun mur
 * anti-robot, aucun robots.txt à respecter.
 */
import { appel } from "./http";

const ENDPOINT = "https://query.wikidata.org/sparql";

/**
 * Wikidata est modifiable par tous. La provenance est donc systématiquement
 * enregistrée pour que la donnée reste auditable et corrigible.
 */
export type CouplageWikidata = { siren: string; site: string; libelle: string };

/** Entreprises dont Wikidata connaît directement le SIREN. */
const REQUETE_SIREN = `
SELECT ?cle ?site ?libelle WHERE {
  ?item wdt:P1616 ?cle .
  ?item wdt:P856 ?site .
  OPTIONAL { ?item rdfs:label ?libelle FILTER(LANG(?libelle) = "fr") }
}`;

/**
 * Entreprises identifiées par leur SIRET seulement.
 *
 * Le SIREN en est les neuf premiers chiffres : ces établissements sont donc
 * exploitables tels quels, et ils sont plus nombreux que ceux portant un SIREN.
 * Plusieurs établissements d'une même société convergent vers le même SIREN —
 * la déduplication s'en charge.
 */
const REQUETE_SIRET = `
SELECT ?cle ?site ?libelle WHERE {
  ?item wdt:P3215 ?cle .
  ?item wdt:P856 ?site .
  OPTIONAL { ?item rdfs:label ?libelle FILTER(LANG(?libelle) = "fr") }
}`;

async function interroger(requete: string) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(requete)}&format=json`;
  const reponse = await appel(url, {
    timeoutMs: 180_000,
    tentatives: 1,
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!reponse.ok) throw new Error(`Wikidata a répondu ${reponse.status}`);
  const donnees = (await reponse.json()) as {
    results: { bindings: { cle: { value: string }; site: { value: string }; libelle?: { value: string } }[] };
  };
  return donnees.results.bindings;
}

/** Récupère l'intégralité de la table. Coûteux : à lancer rarement, pas par fiche. */
export async function tableComplete(): Promise<CouplageWikidata[]> {
  // Le SIREN direct d'abord : quand une entreprise porte les deux identifiants,
  // c'est celui-là qui fait foi.
  const lots = [await interroger(REQUETE_SIREN), await interroger(REQUETE_SIRET)];

  const vus = new Set<string>();
  const couplages: CouplageWikidata[] = [];
  for (const lot of lots) {
    for (const ligne of lot) {
      // Un SIRET vaut son établissement ; le SIREN en est le préfixe.
      const chiffres = ligne.cle.value.replace(/\D/g, "");
      if (chiffres.length !== 9 && chiffres.length !== 14) continue;
      const siren = chiffres.slice(0, 9);
      // Plusieurs établissements ou plusieurs sites pour une même société :
      // le premier rencontré fait foi, les suivants sont ignorés.
      if (vus.has(siren)) continue;
      const site = normaliser(ligne.site.value);
      if (!site) continue;
      vus.add(siren);
      couplages.push({ siren, site, libelle: ligne.libelle?.value ?? "" });
    }
  }
  return couplages;
}

function normaliser(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `https://${u.hostname}`;
  } catch {
    return null;
  }
}
