/**
 * BODACC — Bulletin officiel des annonces civiles et commerciales (DILA).
 * Données ouvertes, sans clé. Alimente les événements légaux d'une fiche :
 * dépôts de comptes, modifications, procédures collectives, ventes, radiations.
 */
import { appelJson, dateOuNull } from "./http";

const BASE =
  process.env.BODACC_API_URL ??
  "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales";

type Annonce = {
  id: string;
  publicationavis: string | null;
  dateparution: string | null;
  numeroannonce: number | null;
  typeavis_lib: string | null;
  familleavis: string | null;
  familleavis_lib: string | null;
  tribunal: string | null;
  commercant: string | null;
  ville: string | null;
  registre: string[] | null;
  depot: string | null;
  jugement: string | null;
  acte: string | null;
  modificationsgenerales: string | null;
  radiationaurcs: string | null;
  listepersonnes: string | null;
  url_complete: string | null;
};

export type EvenementBodacc = {
  date: Date;
  categorie: string;
  titre: string;
  detail: string | null;
  reference: string;
  urlSource: string | null;
  procedureCollective: boolean;
};

export type DepotComptes = {
  exercice: number;
  dateCloture: Date | null;
  dateDepot: Date | null;
  confidentiel: boolean;
};

function jsonOuNull<T = Record<string, unknown>>(valeur: string | null): T | null {
  if (!valeur) return null;
  try {
    return JSON.parse(valeur) as T;
  } catch {
    return null;
  }
}

const TITRES: Record<string, string> = {
  dpc: "Dépôt des comptes annuels",
  modification: "Modification enregistrée",
  creation: "Création d’établissement",
  immatriculation: "Immatriculation",
  radiation: "Radiation du registre",
  collective: "Procédure collective",
  vente: "Vente ou cession",
  conciliation: "Procédure de conciliation",
  retablissement_professionnel: "Rétablissement professionnel",
  divers: "Annonce diverse",
};

/** Récupère les annonces BODACC d'un SIREN, les plus récentes d'abord. */
export async function annoncesParSiren(siren: string, limite = 60): Promise<Annonce[]> {
  const propre = siren.replace(/\D/g, "");
  if (propre.length !== 9) return [];
  const params = new URLSearchParams({
    where: `registre like "${propre}"`,
    limit: String(Math.min(limite, 100)),
    order_by: "dateparution desc",
  });
  const data = await appelJson<{ results: Annonce[]; total_count: number }>(
    `${BASE}/records?${params.toString()}`,
    "bodacc",
    { timeoutMs: 20_000 },
  );
  return data.results ?? [];
}

export function versEvenements(annonces: Annonce[]): EvenementBodacc[] {
  const evenements: EvenementBodacc[] = [];

  for (const a of annonces) {
    const date = dateOuNull(a.dateparution);
    if (!date) continue;

    const famille = a.familleavis ?? "divers";
    const reference = `Annonce BODACC ${a.publicationavis ?? ""} n° ${a.dateparution?.slice(0, 4) ?? ""}-${
      a.numeroannonce ?? a.id
    }`.replace(/\s+/g, " ");

    let titre = TITRES[famille] ?? a.familleavis_lib ?? "Annonce légale";
    let detail: string | null = null;
    let procedureCollective = false;

    const depot = jsonOuNull<{ dateCloture?: string; typeDepot?: string; descriptif?: string }>(a.depot);
    const jugement = jsonOuNull<{
      famille?: string;
      nature?: string;
      date?: string;
      complementJugement?: string;
    }>(a.jugement);
    const modifs = jsonOuNull<{ descriptif?: string }>(a.modificationsgenerales);
    const radiation = jsonOuNull<{ commentaire?: string; radiationPP?: string }>(a.radiationaurcs);
    const acte = jsonOuNull<Record<string, { descriptif?: string; categorie?: string }>>(a.acte);

    if (famille === "dpc" && depot) {
      const exercice = depot.dateCloture ? new Date(depot.dateCloture).getFullYear() : null;
      titre = "Dépôt des comptes annuels";
      detail = [
        exercice ? `Exercice clos le ${formatFr(depot.dateCloture!)}.` : null,
        depot.typeDepot ?? null,
        depot.descriptif?.includes("confidentialité")
          ? "Comptes accompagnés d’une déclaration de confidentialité."
          : null,
      ]
        .filter(Boolean)
        .join(" ");
    } else if (famille === "collective" && jugement) {
      procedureCollective = true;
      titre = jugement.nature ?? jugement.famille ?? "Procédure collective";
      detail = jugement.complementJugement ?? null;
    } else if (famille === "modification" && modifs) {
      detail = modifs.descriptif ?? null;
    } else if (famille === "radiation" && radiation) {
      detail = radiation.commentaire ?? "Radiation enregistrée au registre du commerce et des sociétés.";
    } else if (acte) {
      const premier = Object.values(acte)[0];
      detail = premier?.descriptif ?? null;
    }

    if (a.tribunal && !detail) detail = a.tribunal;

    evenements.push({
      date,
      categorie: famille,
      titre,
      detail: detail || null,
      reference,
      urlSource: a.url_complete ?? null,
      procedureCollective,
    });
  }

  return evenements;
}

export function versDepotsComptes(annonces: Annonce[]): DepotComptes[] {
  const parExercice = new Map<number, DepotComptes>();

  for (const a of annonces) {
    if (a.familleavis !== "dpc") continue;
    const depot = jsonOuNull<{ dateCloture?: string; descriptif?: string }>(a.depot);
    if (!depot?.dateCloture) continue;
    const cloture = dateOuNull(depot.dateCloture);
    if (!cloture) continue;
    const exercice = cloture.getFullYear();
    if (parExercice.has(exercice)) continue;
    parExercice.set(exercice, {
      exercice,
      dateCloture: cloture,
      dateDepot: dateOuNull(a.dateparution),
      confidentiel: Boolean(depot.descriptif?.includes("confidentialité")),
    });
  }

  return [...parExercice.values()].sort((a, b) => b.exercice - a.exercice);
}

/** Vrai si une procédure collective non clôturée apparaît dans les annonces. */
export function aProcedureCollective(evenements: EvenementBodacc[]): boolean {
  return evenements.some((e) => e.procedureCollective);
}

function formatFr(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
