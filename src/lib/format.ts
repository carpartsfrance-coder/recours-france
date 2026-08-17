export type SourceCode =
  | "SIRENE"
  | "RNE"
  | "BODACC"
  | "MEDIATEURS"
  | "SITE_OFFICIEL"
  | "CONSOMMATEUR"
  | "RECOURS_FRANCE";

const LIBELLES_SOURCE: Record<SourceCode, string> = {
  SIRENE: "Sirene (Insee)",
  RNE: "RNE/INPI",
  BODACC: "BODACC",
  MEDIATEURS: "Liste publique des médiateurs",
  SITE_OFFICIEL: "Site officiel de l’entreprise",
  CONSOMMATEUR: "Déclaration consommateur",
  RECOURS_FRANCE: "Recours France",
};

const LIBELLES_SOURCE_COURTS: Record<SourceCode, string> = {
  SIRENE: "SIRENE",
  RNE: "INPI",
  BODACC: "BODACC",
  MEDIATEURS: "MÉDIATEURS",
  SITE_OFFICIEL: "SITE",
  CONSOMMATEUR: "CONSOMMATEUR",
  RECOURS_FRANCE: "PLATEFORME",
};

export function libelleSource(code: SourceCode | string): string {
  return LIBELLES_SOURCE[code as SourceCode] ?? code;
}

export function libelleSourceCourt(code: SourceCode | string): string {
  return LIBELLES_SOURCE_COURTS[code as SourceCode] ?? code;
}

export function couleursSource(code: SourceCode | string): { texte: string; fond: string } {
  switch (code) {
    case "RNE":
      return { texte: "#1E4BD2", fond: "#DEE6FB" };
    case "BODACC":
      return { texte: "#5B3E8E", fond: "#EDE7FB" };
    case "SIRENE":
      return { texte: "#0E7A4A", fond: "#DCF0E4" };
    default:
      return { texte: "#4A515F", fond: "#E9EDF4" };
  }
}

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatDate(valeur: Date | string | null | undefined): string {
  if (!valeur) return "—";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatDateLongue(valeur: Date | string | null | undefined): string {
  if (!valeur) return "—";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "—";
  const jour = d.getDate() === 1 ? "1er" : String(d.getDate());
  return `${jour} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateCourte(valeur: Date | string | null | undefined): string {
  if (!valeur) return "—";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "—";
  const abbr = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const jour = d.getDate() === 1 ? "1er" : String(d.getDate());
  return `${jour} ${abbr[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateISO(valeur: Date | string | null | undefined): string {
  if (!valeur) return "";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function ilYA(valeur: Date | string | null | undefined): string {
  if (!valeur) return "—";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  const jours = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd’hui";
  if (jours === 1) return "hier";
  if (jours < 31) return `il y a ${jours} jours`;
  const mois = Math.floor(jours / 30);
  if (mois < 12) return `il y a ${mois} mois`;
  const ans = Math.floor(jours / 365);
  return ans === 1 ? "il y a 1 an" : `il y a ${ans} ans`;
}

export function formatNombre(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR");
}

export function formatMontant(valeur: number | string | null | undefined, devise = "€"): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  const n = typeof valeur === "string" ? Number(valeur) : valeur;
  if (Number.isNaN(n)) return "—";
  const arrondi = Number.isInteger(n) ? n : Math.round(n * 100) / 100;
  return `${arrondi.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${devise}`;
}

export function formatPourcent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Math.round(n)} %`;
}

export function formatSiren(siren: string | null | undefined): string {
  if (!siren) return "—";
  const s = siren.replace(/\D/g, "");
  return s.length === 9 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}` : siren;
}

export function formatSiret(siret: string | null | undefined): string {
  if (!siret) return "—";
  const s = siret.replace(/\D/g, "");
  return s.length === 14 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}` : siret;
}

/**
 * Adresse postale lisible. Sirene renvoie une adresse qui contient déjà le code
 * postal et la commune : on ne les répète pas.
 */
export function adressePostale(entreprise: {
  adresseSiege?: string | null;
  codePostal?: string | null;
  commune?: string | null;
}): string | null {
  const base = entreprise.adresseSiege?.trim() ?? "";
  const ville = [entreprise.codePostal, entreprise.commune].filter(Boolean).join(" ").trim();
  if (!base) return ville || null;
  if (!ville) return base;
  const sansAccent = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  return sansAccent(base).includes(sansAccent(ville)) ? base : `${base}, ${ville}`;
}

export function anciennete(dateImmatriculation: Date | string | null | undefined): number | null {
  if (!dateImmatriculation) return null;
  const d = dateImmatriculation instanceof Date ? dateImmatriculation : new Date(dateImmatriculation);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000)));
}

export function libelleAnciennete(dateImmatriculation: Date | string | null | undefined): string | null {
  const ans = anciennete(dateImmatriculation);
  if (ans === null) return null;
  if (ans < 1) return "Moins d’un an d’activité";
  return `${ans} ${ans === 1 ? "an" : "ans"} d’activité`;
}

/** Slug d'URL : dénomination + SIREN, stable et lisible. */
export function slugEntreprise(denomination: string, siren: string): string {
  const base = denomination
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "entreprise"}-${siren}`;
}

export function sirenDepuisSlug(slug: string): string | null {
  const m = slug.match(/(\d{9})$/);
  return m ? m[1] : null;
}

export const LIBELLES_CATEGORIE: Record<string, string> = {
  REMBOURSEMENT: "Remboursement",
  LIVRAISON: "Livraison",
  GARANTIE: "Garantie",
  SAV: "Service après-vente",
  RESILIATION: "Résiliation et abonnement",
  AUTRE: "Autre motif",
};

export const LIBELLES_STATUT: Record<string, string> = {
  EN_COURS: "En cours",
  REPONSE_DECLAREE: "Réponse déclarée",
  SOLUTION_PROPOSEE: "Solution proposée",
  RESOLUTION_PARTIELLE: "Résolution partielle",
  RESOLU_CONFIRME: "Résolu",
  NON_RESOLU: "Non résolu",
  ABANDONNE: "Abandonné",
};

export function couleurStatut(statut: string): string {
  switch (statut) {
    case "RESOLU_CONFIRME":
      return "var(--rf-succes)";
    case "NON_RESOLU":
      return "var(--rf-erreur)";
    case "EN_COURS":
    case "RESOLUTION_PARTIELLE":
      return "var(--rf-alerte)";
    case "ABANDONNE":
      return "var(--rf-texte-desactive)";
    default:
      return "var(--rf-cobalt)";
  }
}

export function classeBadgeStatut(statut: string): string {
  switch (statut) {
    case "RESOLU_CONFIRME":
      return "rf-badge rf-badge--sm rf-badge--succes";
    case "NON_RESOLU":
      return "rf-badge rf-badge--sm rf-badge--erreur";
    case "EN_COURS":
    case "RESOLUTION_PARTIELLE":
      return "rf-badge rf-badge--sm rf-badge--alerte";
    case "ABANDONNE":
      return "rf-badge rf-badge--sm rf-badge--non-verifie";
    default:
      return "rf-badge rf-badge--sm rf-badge--verifie-doux";
  }
}

export const LIBELLES_CONTACT: Record<string, string> = {
  ECRIT: "Oui, par écrit",
  TELEPHONE: "Par téléphone",
  AUCUN: "Pas encore",
};

export const LIBELLES_EFFECTIF: Record<string, string> = {
  NN: "Effectif non renseigné",
  "00": "0 salarié",
  "01": "1 ou 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés",
  "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés",
  "53": "10 000 salariés et plus",
};

export function libelleEffectif(code: string | null | undefined): string {
  if (!code) return "Effectif non renseigné";
  const libelle = LIBELLES_EFFECTIF[code];
  return libelle ? `${libelle} (tranche Insee)` : "Effectif non renseigné";
}

/** Tronque proprement un texte sans couper un mot. */
export function tronquer(texte: string, longueur: number): string {
  if (texte.length <= longueur) return texte;
  const coupe = texte.slice(0, longueur);
  const espace = coupe.lastIndexOf(" ");
  return `${coupe.slice(0, espace > 40 ? espace : longueur)}…`;
}

/** Anonymise un nom pour l'affichage public : « Julien Moreau » → « Julien M. ». */
export function auteurAnonyme(prenom: string, nom: string): string {
  const initiale = nom.trim().charAt(0).toUpperCase();
  return initiale ? `${prenom.trim()} ${initiale}.` : prenom.trim();
}

/**
 * Qualité d'un dirigeant, sans son nom.
 * Le nom des personnes physiques dirigeantes n'est pas publié sur une fiche :
 * seule leur fonction l'est.
 */
export function qualiteDirigeant(representantLegal: string | null | undefined): string | null {
  if (!representantLegal) return null;
  const apresVirgule = representantLegal.includes(",")
    ? representantLegal.slice(representantLegal.lastIndexOf(",") + 1)
    : null;
  const brut = (apresVirgule ?? representantLegal).replace(/[()]/g, "").trim();
  // Sans qualité identifiable, on n'affiche jamais la chaîne d'origine.
  if (!brut || /\d/.test(brut) || brut === representantLegal.trim()) return "Représentant légal";
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

export function masquerEmail(email: string): string {
  const [locale, domaine] = email.split("@");
  if (!domaine) return "•••";
  const visible = locale.slice(0, Math.min(2, locale.length));
  return `${visible}${"•".repeat(Math.max(2, locale.length - 2))}@${domaine}`;
}
