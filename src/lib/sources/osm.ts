/**
 * Correspondance SIRET → site officiel, depuis OpenStreetMap.
 *
 * Complément naturel de Wikidata, qui couvre les marques notables mais ignore
 * la longue traîne. OSM contient l'inverse : des commerces de proximité
 * cartographiés sur le terrain, dont le site a été relevé sur la devanture.
 * Près de 98 000 objets portent à la fois `ref:FR:SIRET` et `website`.
 *
 * La qualité varie — c'est une base contributive, comme Wikidata. La provenance
 * est donc enregistrée, et aucune source n'est présentée comme autoritaire.
 */
import { appel } from "./http";

const ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Le tag ref:FR:SIRET n'existe qu'en France : filtrer par aire est inutile et coûteux. */
const REQUETE = `[out:json][timeout:280];
nwr["ref:FR:SIRET"]["website"];
out tags;`;

export type CouplageOsm = { siren: string; site: string; libelle: string };

export async function tableComplete(): Promise<CouplageOsm[]> {
  const reponse = await appel(ENDPOINT, {
    method: "POST",
    body: REQUETE,
    timeoutMs: 300_000,
    tentatives: 1,
    headers: { "Content-Type": "text/plain", Accept: "application/json" },
  });
  if (!reponse.ok) throw new Error(`Overpass a répondu ${reponse.status}`);

  const donnees = (await reponse.json()) as {
    elements: { tags?: Record<string, string> }[];
  };

  const vus = new Set<string>();
  const couplages: CouplageOsm[] = [];
  for (const element of donnees.elements ?? []) {
    const tags = element.tags;
    if (!tags) continue;
    const siret = (tags["ref:FR:SIRET"] ?? "").replace(/\D/g, "");
    if (siret.length !== 14) continue;
    const siren = siret.slice(0, 9);
    // Plusieurs établissements d'une même enseigne pointent vers le même SIREN.
    if (vus.has(siren)) continue;
    const site = normaliser(tags.website ?? "");
    if (!site) continue;
    vus.add(siren);
    couplages.push({ siren, site, libelle: tags.name ?? "" });
  }
  return couplages;
}

function normaliser(url: string): string | null {
  const propre = url.trim();
  if (!propre) return null;
  const avecSchema = /^https?:\/\//i.test(propre) ? propre : `https://${propre}`;
  try {
    const u = new URL(avecSchema);
    if (!u.hostname.includes(".")) return null;
    return `https://${u.hostname}`;
  } catch {
    return null;
  }
}
