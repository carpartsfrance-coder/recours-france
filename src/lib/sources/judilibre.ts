/**
 * Judilibre — décisions de justice en open data (Cour de cassation).
 *
 * Nécessite une clé PISTE (JUDILIBRE_API_KEY), gratuite après inscription.
 * Sans clé le connecteur reste inactif : la passerelle PISTE rejette l'appel
 * avant que Judilibre ne le voie, alors même que l'API elle-même autorise
 * l'accès anonyme.
 * https://api.gouv.fr/les-api/api-judilibre
 *
 * ── Ce que l'API ne donne pas ───────────────────────────────────────────────
 * Il n'existe aucun champ « parties », et aucun SIREN nulle part. Vingt-cinq
 * champs de métadonnées — juridiction, chambre, date, numéro, ECLI, solution,
 * code NAC — et le texte intégral. Les parties ne se trouvent que dans ce
 * texte, et c'est tout le problème.
 *
 * Les personnes physiques y sont pseudonymisées (« Monsieur [N] [U] »), les
 * personnes morales ne le sont pas : c'est ce qui rend le rapprochement
 * possible, et c'est aussi ce qui le rend dangereux. Un nom nu, sans
 * identifiant, dans un pays où 3 728 730 sociétés partagent leur dénomination
 * avec une autre. Se tromper, c'est publier « poursuivie » sur une société qui
 * n'a rien fait.
 *
 * D'où les deux règles que ce module applique sans exception :
 *
 * 1. On ne lit que la zone `introduction`, où les parties sont désignées avec
 *    leur forme juridique. Les sociétés citées au fil du texte — un
 *    sous-traitant, un assureur, un tiers — ne sont pas des parties et ne sont
 *    jamais rattachées.
 * 2. Un rapprochement ambigu n'est pas un rapprochement. Si deux sociétés
 *    répondent au même faisceau, on ne publie rien.
 */
import { appelJson, variable } from "./http";

const BASE = variable("JUDILIBRE_API_URL", "https://api.piste.gouv.fr/cassation/judilibre/v1.0");

export function judilibreConfigure(): boolean {
  return Boolean(process.env.JUDILIBRE_API_KEY);
}

function entetes(): Record<string, string> {
  return { KeyId: process.env.JUDILIBRE_API_KEY ?? "", Accept: "application/json" };
}

/** Un segment de zone : des indices dans `text`, pas du texte. */
type Segment = { start: number; end: number };

export type DecisionJudilibre = {
  id: string;
  juridiction: string | null;
  chambre: string | null;
  numero: string | null;
  ecli: string | null;
  date: Date | null;
  /** La solution normalisée, telle que l'API la donne. Jamais reformulée. */
  solution: string | null;
  solutionLibelle: string | null;
  nac: string | null;
  texte: string;
  zones: Record<string, Segment[]> | null;
};

type ReponseDecision = {
  id?: string;
  jurisdiction?: string;
  chamber?: string;
  number?: string;
  ecli?: string;
  decision_date?: string;
  solution?: string;
  solution_alt?: string;
  nac?: string;
  text?: string;
  zones?: Record<string, Segment[]>;
};

export async function chercher(
  requete: string,
  options: { taille?: number; page?: number; juridictions?: string[]; depuis?: string } = {},
): Promise<{ id: string; date: string | null; juridiction: string | null }[]> {
  if (!judilibreConfigure()) return [];
  const url = new URL(`${BASE}/search`);
  // Les guillemets imposent l'expression exacte : sans eux, « GARAGE TIB AUTO »
  // ramène toutes les décisions contenant « garage », soit à peu près tout le
  // contentieux automobile du pays.
  url.searchParams.set("query", `"${requete.replace(/"/g, "")}"`);
  url.searchParams.set("operator", "exact");
  url.searchParams.set("page_size", String(options.taille ?? 20));
  url.searchParams.set("page", String(options.page ?? 0));
  // Les décisions de la Cour de cassation ne portent pas de zone `introduction`
  // et ne nomment pas leurs parties dans un en-tête : elles sont rédigées « sur
  // le pourvoi formé par… ». L'extraction ne vaut que pour les juridictions du
  // fond, dont l'en-tête est structuré.
  for (const j of options.juridictions ?? ["tj", "tcom", "ca"]) url.searchParams.append("jurisdiction", j);
  if (options.depuis) url.searchParams.set("date_start", options.depuis);

  const data = await appelJson<{ results?: { id?: string; decision_date?: string; jurisdiction?: string }[] }>(
    url.toString(),
    "judilibre",
    { headers: entetes(), timeoutMs: 20_000 },
  );
  return (data.results ?? [])
    .filter((r) => r.id)
    .map((r) => ({ id: r.id!, date: r.decision_date ?? null, juridiction: r.jurisdiction ?? null }));
}

export async function decision(id: string): Promise<DecisionJudilibre | null> {
  if (!judilibreConfigure()) return null;
  const url = new URL(`${BASE}/decision`);
  url.searchParams.set("id", id);
  url.searchParams.set("resolve_references", "true");

  const d = await appelJson<ReponseDecision>(url.toString(), "judilibre", {
    headers: entetes(),
    timeoutMs: 25_000,
  });
  if (!d?.id || !d.text) return null;
  return {
    id: d.id,
    juridiction: d.jurisdiction ?? null,
    chambre: d.chamber ?? null,
    numero: d.number ?? null,
    ecli: d.ecli ?? null,
    date: d.decision_date ? new Date(d.decision_date) : null,
    solution: d.solution ?? null,
    solutionLibelle: d.solution_alt ?? null,
    nac: d.nac ?? null,
    texte: d.text,
    zones: d.zones ?? null,
  };
}

/* ── Extraction des parties ───────────────────────────────────────────────── */

export type Role = "demandeur" | "defendeur";

export type PartieMorale = {
  /** La dénomination telle qu'elle est écrite dans la décision. */
  denomination: string;
  /** La forme juridique, normalisée sans points ni espaces : « SAS », « SARL ». */
  forme: string;
  role: Role;
};

/**
 * Les formes juridiques telles qu'elles s'écrivent dans une décision.
 *
 * Elles y apparaissent ponctuées — « S.A.R.L. » — ou non, en tête du nom.
 * C'est ce marqueur qui distingue une personne morale d'une personne physique
 * dans un bloc de parties, et il vaut mieux que la longueur ou la casse : une
 * pseudonymisation laisse « Monsieur [N] [U] », qui n'a pas de forme juridique.
 */
const FORMES = [
  "SASU", "SAS", "SARLU", "SARL", "EURL", "SELARL", "SELAS", "SELAFA", "SELCA",
  "SNC", "SCOP", "SCIC", "SCPI", "SCP", "SCM", "SCA", "SCS", "SCI", "GIE", "GAEC",
  "EARL", "SEM", "SA",
];

/** « S.A.R.L. » et « SARL » désignent la même chose. */
function normaliserForme(brut: string): string {
  return brut.replace(/[.\s]/g, "").toUpperCase();
}

/**
 * Réduit une dénomination à ce qui peut être comparé.
 *
 * Les accents, la ponctuation et les mots vides sautent. « GARAGE TIB AUTO 83 »
 * et « Garage TIB-Auto 83 » sont la même société ; « SARL GARAGE MARTIN » et
 * « GARAGE MARTIN » aussi, la forme étant traitée séparément.
 */
export function normaliserDenomination(brut: string): string {
  return (
    brut
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      // Les points d'abord : sans quoi « S.A.R.L. » devient « S A R L » et
      // n'est plus reconnu comme une forme juridique, qui reste alors collée
      // au nom. Deux écritures de la même société cessent de se rejoindre.
      .replace(/\./g, "")
      .replace(new RegExp(`\\b(${FORMES.join("|")})\\b`, "g"), " ")
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
  );
}

/**
 * Les intitulés qui ouvrent un bloc de parties.
 *
 * Ils varient d'une juridiction à l'autre, et c'est ce qui rend l'extraction
 * fragile : « DEMANDEUR » au tribunal judiciaire, « APPELANTES » en cour
 * d'appel, « PARTIE(S) EN DEMANDE » au tribunal de commerce. En manquer un ne
 * produit pas d'erreur visible — juste une décision qui n'est rattachée à
 * personne, ce qui se remarque beaucoup moins qu'un faux rattachement.
 */
const ROLES: { motif: RegExp; role: Role }[] = [
  {
    motif: /^\s*(DEMANDEUR|DEMANDERESSE|REQUERANT|REQUERANTE|APPELANT|APPELANTE|PARTIES? +EN +DEMANDE)S?\b/i,
    role: "demandeur",
  },
  {
    motif: /^\s*(DEFENDEUR|DEFENDERESSE|INTIME|INTIMEE|PARTIES? +EN +DEFENSE)S?\b/i,
    role: "defendeur",
  },
];

/**
 * Les lignes qui désignent un représentant, jamais une partie.
 *
 * « représentée et assistée par Me Nathalie TIMOTEI de la SELARL TIMOTEI ET
 * ASSOCIES, avocat au barreau de ROUEN » — sans ce filtre, le cabinet d'avocats
 * était rattaché comme défendeur. Sur données réelles, c'est l'erreur la plus
 * fréquente et la plus grave : elle accuse d'un litige celui qui plaidait.
 *
 * Le filtre porte sur la ligne, pas sur la forme juridique : une SELARL peut
 * parfaitement être partie à une instance, c'est sa position dans la phrase qui
 * en décide.
 */
const REPRESENTATION =
  /repr[eé]sent[ée]|assist[ée]|substitu[ée]|plaidant|comparant par|\bavocat|\bbarreau\b|\bMe\s|conseil de/i;

/**
 * Les personnes morales désignées comme parties, avec leur rôle.
 *
 * On ne lit que la zone `introduction`. Faute de zone, on prend le début du
 * texte : l'en-tête d'une décision y tient toujours, et lire tout le corps
 * ramasserait les tiers cités dans l'exposé des faits — un sous-traitant, un
 * assureur, un fournisseur — qui ne sont pas parties à l'instance.
 */
export function partiesMorales(d: DecisionJudilibre): PartieMorale[] {
  const segments = d.zones?.introduction;
  const entete = segments?.length
    ? segments.map((s) => d.texte.slice(s.start, s.end)).join("\n")
    : d.texte.slice(0, 3000);

  const formes = FORMES.map((f) => f.split("").join("\\.?")).join("|");
  // Forme juridique, puis le nom jusqu'à une virgule, un retour à la ligne ou
  // « dont le siège » — les trois façons dont un en-tête clôt une désignation.
  const motif = new RegExp(
    `\\b((?:${formes})\\.?)\\s+([^,\\n]{2,90}?)(?=\\s*(?:,|\\n|dont le si[eè]ge|repr[eé]sent|prise en la personne|$))`,
    "gi",
  );

  const parties: PartieMorale[] = [];
  const vues = new Set<string>();
  let role: Role | null = null;

  for (const ligne of entete.split(/\n/)) {
    for (const r of ROLES) {
      if (r.motif.test(ligne)) role = r.role;
    }
    if (!role) continue;
    if (REPRESENTATION.test(ligne)) continue;

    for (const m of ligne.matchAll(motif)) {
      const forme = normaliserForme(m[1]);
      if (!FORMES.includes(forme)) continue;
      const denomination = m[2].trim().replace(/\s+/g, " ");
      const cle = `${role}|${normaliserDenomination(denomination)}`;
      if (!denomination || vues.has(cle)) continue;
      vues.add(cle);
      parties.push({ denomination, forme, role });
    }
  }
  return parties;
}

/* ── Rapprochement ────────────────────────────────────────────────────────── */

export type Candidat = { id: string; siren: string; denomination: string; formeJuridique: string | null };

/**
 * La société de notre référentiel désignée par une partie — ou rien.
 *
 * Le faisceau tient en deux exigences et une abstention. La dénomination
 * normalisée doit correspondre exactement : un rapprochement approximatif sur
 * un nom de société est un rapprochement faux, tôt ou tard. La forme juridique
 * doit être compatible lorsqu'elle est connue des deux côtés. Et si plusieurs
 * sociétés survivent, on ne choisit pas : on renonce.
 *
 * Renoncer coûte une décision non affichée. Se tromper coûte une accusation
 * publique contre un innocent, sur une page qui porte son nom.
 */
export function rapprocher(partie: PartieMorale, candidats: Candidat[]): Candidat | null {
  const cible = normaliserDenomination(partie.denomination);
  if (cible.length < 4) return null;

  const exacts = candidats.filter((c) => normaliserDenomination(c.denomination) === cible);
  if (exacts.length === 0) return null;

  const memeForme = exacts.filter((c) => {
    if (!c.formeJuridique) return false;
    return normaliserForme(c.formeJuridique).includes(partie.forme);
  });

  const retenus = memeForme.length > 0 ? memeForme : exacts;
  return retenus.length === 1 ? retenus[0] : null;
}
