/**
 * API Recherche d'entreprises (DINUM / Insee) — ouverte, sans clé.
 * Sert de socle d'identité : SIREN, dénomination, activité, siège,
 * état administratif, effectifs, dirigeants, comptes agrégés.
 * https://recherche-entreprises.api.gouv.fr/docs
 */
import { appelJson, dateOuNull } from "./http";
import { NATURES_JURIDIQUES } from "../referentiels/natures-juridiques";
import { libelleNaf, secteurDepuisNaf } from "../referentiels/naf";

const BASE = process.env.RECHERCHE_ENTREPRISES_URL ?? "https://recherche-entreprises.api.gouv.fr";

type Siege = {
  siret?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  libelle_commune?: string | null;
  departement?: string | null;
  region?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  activite_principale?: string | null;
  est_siege?: boolean;
  etat_administratif?: string | null;
  date_creation?: string | null;
  date_fermeture?: string | null;
  liste_enseignes?: string[] | null;
  nom_commercial?: string | null;
  tranche_effectif_salarie?: string | null;
};

type Dirigeant = {
  nom?: string | null;
  prenoms?: string | null;
  qualite?: string | null;
  denomination?: string | null;
  type_dirigeant?: string | null;
};

export type ResultatRecherche = {
  siren: string;
  nom_complet: string;
  nom_raison_sociale: string | null;
  sigle: string | null;
  nature_juridique: string | null;
  activite_principale: string | null;
  section_activite_principale: string | null;
  date_creation: string | null;
  date_fermeture: string | null;
  etat_administratif: string | null;
  tranche_effectif_salarie: string | null;
  nombre_etablissements: number | null;
  nombre_etablissements_ouverts: number | null;
  date_mise_a_jour_insee: string | null;
  date_mise_a_jour_rne: string | null;
  tva: string | string[] | null;
  siege: Siege | null;
  dirigeants: Dirigeant[] | null;
  finances: Record<string, { ca?: number; resultat_net?: number }> | null;
  matching_etablissements: Siege[] | null;
};

type ReponseRecherche = {
  results: ResultatRecherche[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type FiltresRecherche = {
  page?: number;
  parPage?: number;
  departement?: string;
  sectionActivite?: string;
  etat?: "A" | "C";
};

export async function rechercher(
  requete: string,
  filtres: FiltresRecherche = {},
): Promise<{ resultats: ResultatRecherche[]; total: number; pages: number }> {
  const params = new URLSearchParams({
    q: requete,
    page: String(filtres.page ?? 1),
    per_page: String(Math.min(filtres.parPage ?? 10, 25)),
    minimal: "false",
  });
  if (filtres.departement) params.set("departement", filtres.departement);
  if (filtres.sectionActivite) params.set("section_activite_principale", filtres.sectionActivite);
  if (filtres.etat) params.set("etat_administratif", filtres.etat);

  const data = await appelJson<ReponseRecherche>(
    `${BASE}/search?${params.toString()}`,
    "recherche-entreprises",
  );
  return { resultats: data.results ?? [], total: data.total_results ?? 0, pages: data.total_pages ?? 0 };
}

export async function parSiren(siren: string): Promise<ResultatRecherche | null> {
  const propre = siren.replace(/\D/g, "");
  if (propre.length !== 9) return null;
  const { resultats } = await rechercher(propre, { parPage: 5 });
  return resultats.find((r) => r.siren === propre) ?? null;
}

/** Normalise un résultat d'API en champs de la table Entreprise. */
export function versEntreprise(r: ResultatRecherche) {
  const siege = r.siege ?? {};
  const naf = r.activite_principale ?? siege.activite_principale ?? null;
  const enseigne =
    siege.nom_commercial?.trim() ||
    (siege.liste_enseignes && siege.liste_enseignes.length ? siege.liste_enseignes[0].trim() : null);

  const dirigeant = (r.dirigeants ?? []).find((d) => d.type_dirigeant === "personne physique") ?? null;
  const representant = dirigeant
    ? [dirigeant.prenoms, dirigeant.nom].filter(Boolean).join(" ").trim() +
      (dirigeant.qualite ? `, ${dirigeant.qualite.toLowerCase()}` : "")
    : ((r.dirigeants ?? [])[0]?.denomination ?? null);

  return {
    siren: r.siren,
    denomination: (r.nom_raison_sociale || r.nom_complet || "").trim().toUpperCase(),
    enseigne: enseigne && enseigne !== r.nom_raison_sociale ? enseigne : null,
    sigle: r.sigle,
    siretSiege: siege.siret ?? null,
    formeJuridique: r.nature_juridique ? (NATURES_JURIDIQUES[r.nature_juridique] ?? null) : null,
    categorieJuridique: r.nature_juridique,
    naf,
    nafLibelle: naf ? libelleNaf(naf) : null,
    secteur: naf ? secteurDepuisNaf(naf) : null,
    dateImmatriculation: dateOuNull(r.date_creation),
    dateCessation: dateOuNull(r.date_fermeture),
    trancheEffectif: r.tranche_effectif_salarie ?? null,
    representantLegal: representant || null,
    numeroTva: (Array.isArray(r.tva) ? r.tva[0] : r.tva) ?? null,
    adresseSiege: siege.adresse?.trim() ?? null,
    codePostal: siege.code_postal ?? null,
    commune: siege.libelle_commune ?? null,
    departement: siege.departement ?? null,
    region: siege.region ?? null,
    latitude: siege.latitude ? Number(siege.latitude) : null,
    longitude: siege.longitude ? Number(siege.longitude) : null,
    etatAdministratif: (r.etat_administratif === "C" ? "CESSEE" : "ACTIVE") as "ACTIVE" | "CESSEE",
    nombreEtablissements: r.nombre_etablissements ?? 0,
    nombreEtablissementsOuverts: r.nombre_etablissements_ouverts ?? 0,
  };
}

/** Établissements connus via l'API (siège + établissements correspondants). */
export function versEtablissements(r: ResultatRecherche) {
  const liste = [r.siege, ...(r.matching_etablissements ?? [])].filter(
    (e): e is Siege => Boolean(e && e.siret),
  );
  const vus = new Set<string>();
  return liste
    .filter((e) => {
      const siret = e.siret!;
      if (vus.has(siret)) return false;
      vus.add(siret);
      return true;
    })
    .map((e) => ({
      siret: e.siret!,
      estSiege: Boolean(e.est_siege),
      enseigne: e.nom_commercial?.trim() ?? null,
      adresse: e.adresse?.trim() ?? null,
      codePostal: e.code_postal ?? null,
      commune: e.libelle_commune ?? null,
      departement: e.departement ?? null,
      naf: e.activite_principale ?? null,
      actif: e.etat_administratif !== "F",
      dateCreation: dateOuNull(e.date_creation),
      dateFermeture: dateOuNull(e.date_fermeture),
    }));
}

/** Comptes agrégés publiés par l'API (source : dépôts BODACC/INPI consolidés). */
export function versComptes(r: ResultatRecherche) {
  if (!r.finances) return [];
  return Object.entries(r.finances)
    .map(([exercice, valeurs]) => ({
      exercice: Number(exercice),
      chiffreAffaires: valeurs?.ca ?? null,
      resultatNet: valeurs?.resultat_net ?? null,
    }))
    .filter((c) => Number.isFinite(c.exercice));
}
