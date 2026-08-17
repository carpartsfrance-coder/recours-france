/**
 * API Sirene 3.11 (Insee) — clé facultative.
 * Sert à compléter la liste des établissements et l'état administratif au-delà
 * de ce que renvoie l'API Recherche d'entreprises. Sans clé, le connecteur est
 * inactif et la fiche s'appuie sur les autres sources.
 * https://portail-api.insee.fr/
 */
import { appelJson, dateOuNull } from "./http";

const BASE = process.env.SIRENE_API_URL ?? "https://api.insee.fr/api-sirene/3.11";

export function sireneConfigure(): boolean {
  return Boolean(process.env.SIRENE_API_KEY);
}

type EtablissementSirene = {
  siret: string;
  etablissementSiege: boolean;
  dateCreationEtablissement: string | null;
  dateDernierTraitementEtablissement: string | null;
  adresseEtablissement?: {
    numeroVoieEtablissement?: string | null;
    typeVoieEtablissement?: string | null;
    libelleVoieEtablissement?: string | null;
    codePostalEtablissement?: string | null;
    libelleCommuneEtablissement?: string | null;
  };
  periodesEtablissement?: {
    dateFin: string | null;
    dateDebut: string | null;
    etatAdministratifEtablissement: string | null;
    activitePrincipaleEtablissement: string | null;
    enseigne1Etablissement: string | null;
  }[];
};

export type EtablissementNormalise = {
  siret: string;
  estSiege: boolean;
  enseigne: string | null;
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  departement: string | null;
  naf: string | null;
  actif: boolean;
  dateCreation: Date | null;
  dateFermeture: Date | null;
};

/** Liste complète des établissements d'un SIREN (siège inclus). */
export async function etablissementsParSiren(siren: string): Promise<EtablissementNormalise[]> {
  if (!sireneConfigure()) return [];
  const propre = siren.replace(/\D/g, "");
  if (propre.length !== 9) return [];

  const params = new URLSearchParams({
    q: `siren:${propre}`,
    nombre: "100",
  });

  const data = await appelJson<{ etablissements?: EtablissementSirene[] }>(
    `${BASE}/siret?${params.toString()}`,
    "sirene",
    {
      headers: { "X-INSEE-Api-Key-Integration": process.env.SIRENE_API_KEY as string },
      timeoutMs: 20_000,
    },
  );

  return (data.etablissements ?? []).map((e) => {
    const periode = e.periodesEtablissement?.[0];
    const a = e.adresseEtablissement ?? {};
    const adresse = [a.numeroVoieEtablissement, a.typeVoieEtablissement, a.libelleVoieEtablissement]
      .filter(Boolean)
      .join(" ")
      .trim();
    const cp = a.codePostalEtablissement ?? null;
    return {
      siret: e.siret,
      estSiege: Boolean(e.etablissementSiege),
      enseigne: periode?.enseigne1Etablissement ?? null,
      adresse: adresse || null,
      codePostal: cp,
      commune: a.libelleCommuneEtablissement ?? null,
      departement: cp ? cp.slice(0, 2) : null,
      naf: periode?.activitePrincipaleEtablissement ?? null,
      actif: periode?.etatAdministratifEtablissement !== "F",
      dateCreation: dateOuNull(e.dateCreationEtablissement),
      dateFermeture: periode?.etatAdministratifEtablissement === "F" ? dateOuNull(periode.dateDebut) : null,
    };
  });
}

/** Vérifie l'état administratif d'une unité légale (A = active, C = cessée). */
export async function etatUniteLegale(siren: string): Promise<"ACTIVE" | "CESSEE" | null> {
  if (!sireneConfigure()) return null;
  const propre = siren.replace(/\D/g, "");
  try {
    const data = await appelJson<{
      uniteLegale?: { periodesUniteLegale?: { etatAdministratifUniteLegale?: string }[] };
    }>(`${BASE}/siren/${propre}`, "sirene", {
      headers: { "X-INSEE-Api-Key-Integration": process.env.SIRENE_API_KEY as string },
    });
    const etat = data.uniteLegale?.periodesUniteLegale?.[0]?.etatAdministratifUniteLegale;
    if (!etat) return null;
    return etat === "C" ? "CESSEE" : "ACTIVE";
  } catch {
    return null;
  }
}
