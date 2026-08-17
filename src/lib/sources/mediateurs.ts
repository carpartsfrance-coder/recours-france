/**
 * Annuaire public des médiateurs de la consommation (CECMC, data.economie.gouv.fr).
 * Donnée ouverte, sans clé. Rafraîchie mensuellement.
 *
 * Attention au périmètre : la liste publique associe un médiateur à un SECTEUR,
 * pas à un SIREN. Un médiateur rattaché par secteur est donc affiché comme
 * « compétence présumée d'après le secteur d'activité » ; il n'est présenté
 * comme le médiateur de l'entreprise que lorsque celle-ci le déclare sur son
 * site et que la déclaration est retrouvée dans la liste publique.
 */
import { appelJson } from "./http";

const BASE =
  process.env.MEDIATEURS_DATASET_URL ??
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/mediation-consommation-annuaire-des-mediateurs";

export type MediateurPublic = {
  nom: string;
  type: string | null;
  url: string | null;
  codeSecteur: string | null;
  libelleSecteur: string | null;
  categorie: string | null;
};

type Ligne = {
  mediateur: string | null;
  type: string | null;
  url: string | null;
  code_secteur: string | null;
  libelle_secteur: string | null;
  categorie: string | null;
};

/** Télécharge l'annuaire complet (≈ 1 300 lignes, paginé par 100). */
export async function annuaireComplet(): Promise<MediateurPublic[]> {
  const lignes: MediateurPublic[] = [];
  let offset = 0;

  for (let page = 0; page < 25; page++) {
    const data = await appelJson<{ results: Ligne[]; total_count: number }>(
      `${BASE}/records?limit=100&offset=${offset}`,
      "mediateurs",
      { timeoutMs: 20_000 },
    );
    const resultats = data.results ?? [];
    for (const l of resultats) {
      if (!l.mediateur) continue;
      lignes.push({
        nom: l.mediateur.trim(),
        type: l.type,
        url: l.url,
        codeSecteur: l.code_secteur,
        libelleSecteur: l.libelle_secteur,
        categorie: l.categorie,
      });
    }
    offset += 100;
    if (offset >= (data.total_count ?? 0)) break;
  }

  return lignes;
}

/** Recherche un médiateur par son nom, pour confirmer une déclaration d'entreprise. */
export async function chercherParNom(nom: string): Promise<MediateurPublic[]> {
  const params = new URLSearchParams({ where: `search(mediateur, "${nom.replace(/"/g, "")}")`, limit: "5" });
  try {
    const data = await appelJson<{ results: Ligne[] }>(`${BASE}/records?${params}`, "mediateurs");
    return (data.results ?? [])
      .filter((l) => l.mediateur)
      .map((l) => ({
        nom: l.mediateur!.trim(),
        type: l.type,
        url: l.url,
        codeSecteur: l.code_secteur,
        libelleSecteur: l.libelle_secteur,
        categorie: l.categorie,
      }));
  } catch {
    return [];
  }
}

/**
 * Correspondance secteur Recours France → catégories de l'annuaire officiel.
 * Sert uniquement à proposer un médiateur « présumé compétent ».
 */
const CORRESPONDANCES: Record<string, string[]> = {
  "commerce-detail": ["Commerce de produits de grande consommation"],
  "vente-distance": ["Commerce de produits de grande consommation", "Vente à distance"],
  automobile: ["Automobile", "Commerce de produits de grande consommation"],
  telecom: ["Communications électroniques", "Numérique"],
  energie: ["Énergie", "Energie"],
  "banque-assurance": ["Banque", "Assurance", "Services financiers"],
  travaux: ["Bâtiment", "Habitat", "Construction"],
  immobilier: ["Immobilier", "Habitat"],
  voyage: ["Tourisme", "Voyage", "Transport"],
  logistique: ["Transport", "Poste"],
  numerique: ["Numérique", "Communications électroniques"],
  "sante-bienetre": ["Santé", "Services à la personne"],
  formation: ["Enseignement", "Formation"],
  reparation: ["Commerce de produits de grande consommation", "Artisanat"],
  restauration: ["Restauration", "Commerce de produits de grande consommation"],
};

export function candidatsPourSecteur(
  annuaire: MediateurPublic[],
  secteur: string | null,
): MediateurPublic[] {
  if (!secteur) return [];
  const cles = CORRESPONDANCES[secteur] ?? [];
  if (!cles.length) return [];
  const normalise = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const clesNorm = cles.map(normalise);

  const vus = new Set<string>();
  return annuaire
    .filter((m) => {
      const cat = normalise(m.categorie ?? "");
      const sect = normalise(m.libelleSecteur ?? "");
      return clesNorm.some((c) => cat.includes(c) || sect.includes(c));
    })
    .filter((m) => {
      if (vus.has(m.nom)) return false;
      vus.add(m.nom);
      return true;
    });
}

export function slugMediateur(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
