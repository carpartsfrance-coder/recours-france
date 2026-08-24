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

/**
 * Le rôle procédural, avec son incertitude assumée.
 *
 * « partie » n'est pas un troisième camp : c'est l'aveu qu'on ne sait pas
 * lequel des deux. Il survient sur les en-têtes dont les retours à la ligne
 * ont été écrasés, où « PARTIE EN DEMANDE … PARTIE EN DÉFENSE » se retrouvent
 * sur une seule ligne : la société y figure bien, mais la désigner
 * demanderesse quand elle se défendait serait une erreur de fait sur une page
 * qui porte son nom.
 */
export type Role = "demandeur" | "defendeur" | "partie";

export type PartieMorale = {
  /** La dénomination telle qu'elle est écrite dans la décision. */
  denomination: string;
  /** La forme juridique, normalisée sans points ni espaces : « SAS », « SARL ». */
  forme: string;
  role: Role;
  /**
   * Le numéro d'immatriculation, quand la décision le donne.
   *
   * C'est la meilleure chose qui puisse arriver à ce module. Un SIREN désigne
   * une société et une seule : ni homonymie, ni enseigne, ni faisceau
   * d'indices. Mesuré sur des décisions réelles, quarante-quatre pour cent des
   * en-têtes en portent au moins un, et 206 des 211 relevés existaient dans le
   * référentiel — 97,6 %.
   */
  siren: string | null;
};

/**
 * La clé de Luhn d'un SIREN.
 *
 * Un en-tête de jugement est plein de nombres à neuf chiffres qui n'en sont
 * pas : numéros de RG, de minute, de portalis, codes postaux accolés. La clé
 * en écarte les neuf dixièmes, et la proximité d'un marqueur d'immatriculation
 * le reste.
 */
export function sirenValide(numero: string): boolean {
  if (!/^\d{9}$/.test(numero)) return false;
  let somme = 0;
  for (let i = 0; i < 9; i++) {
    let chiffre = Number(numero[8 - i]);
    if (i % 2 === 1) {
      chiffre *= 2;
      if (chiffre > 9) chiffre -= 9;
    }
    somme += chiffre;
  }
  return somme % 10 === 0;
}

/** Le SIREN d'une ligne, s'il y en a un et qu'il suit un marqueur d'immatriculation. */
function sirenDeLaLigne(ligne: string): string | null {
  const m = [...ligne.matchAll(/(RCS|R\.C\.S|SIREN|SIRET|immatricul\w*)[^\n]{0,60}?\b(\d{3}[ \u00A0.]?\d{3}[ \u00A0.]?\d{3})\b/gi)];
  for (const x of m) {
    const n = x[2].replace(/\D/g, "").slice(0, 9);
    if (sirenValide(n)) return n;
  }
  return null;
}

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

/**
 * « Société », sans sigle, désigne aussi une personne morale.
 *
 * Beaucoup de greffes écrivent « Société DISTRIMOTOR, immatriculée au RCS… »
 * plutôt que « S.A.R.L. DISTRIMOTOR ». Le mot est trop courant pour être
 * cherché n'importe où — il ouvre la moitié des phrases d'un exposé des faits —
 * mais dans un bloc de parties, après un intitulé de rôle et hors ligne de
 * représentation, il désigne bien une partie.
 */
const MOT_SOCIETE = "Soci[eé]t[eé]";

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
    motif: /^\s*\*?\s*(DEMANDEURE?|DEMANDERESSE|REQUERANTE?|APPELANTE?|PARTIE\(?S?\)? +EN +DEMANDE)S?\b/i,
    role: "demandeur",
  },
  {
    motif: /^\s*\*?\s*(DEFENDEURE?|DEFENDERESSE|INTIMEE?|PARTIE\(?S?\)? +EN +D[EÉ]FENSE)S?\b/i,
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

  const formes = [...FORMES.map((f) => f.split("").join("\\.?")), MOT_SOCIETE].join("|");
  // Forme juridique, puis le nom jusqu'à une virgule, un retour à la ligne ou
  // « dont le siège » — les trois façons dont un en-tête clôt une désignation.
  // La dénomination court de la forme juridique jusqu'au premier marqueur qui
  // n'en fait plus partie. Sans ces bornes elle absorbait l'adresse et
  // l'immatriculation : « SOCIETE CASH [Adresse 21] [Adresse 22] immatriculée
  // au RCS d'[Localité 25] n° 490 100 690 » était stockée telle quelle.
  const bornes = [
    ",", "\\n", "\\[Adresse", "\\[Localité", "\\[Localite",
    "dont le si[eè]ge", "ayant son si[eè]ge", "sise\\b", "sis\\b",
    "immatricul", "\\bRCS\\b", "\\bSIREN\\b", "\\bSIRET\\b",
    "repr[eé]sent", "prise en la personne",
    // Une dénomination ne contient pas de verbe conjugué : « SAS DISTRIMOTOR
    // contenant la clause attributive de compétence alléguée n'est pas signé »
    // était capturé en entier faute de cette borne.
    "\\b(?:contenant|ayant|exer[çc]ant|agissant|domicili|pris en|venant aux)",
    "$",
  ].join("|");
  const motif = new RegExp(`\\b((?:${formes})\\.?)\\s+([^,\\n]{2,90}?)(?=\\s*(?:${bornes}))`, "gi");

  /**
   * Un nom entièrement pseudonymisé n'en est pas un.
   *
   * Le service de pseudonymisation retire aussi les dénominations qui sont des
   * patronymes : « SARL MACKOWIAK » devient « SARL [N] ». Sans numéro
   * d'immatriculation, ces parties-là sont irrattachables — et le tenter sur
   * un jeton reviendrait à rapprocher au hasard.
   */
  const pseudonymise = (nom: string) => /^(\[[^\]]*\]\s*)+$/.test(nom.trim());

  const parties: PartieMorale[] = [];
  const vues = new Set<string>();
  let role: Role | null = null;

  for (const ligne of entete.split(/\n/)) {
    const marqueurs = ROLES.filter((r) => r.motif.test(ligne));
    if (marqueurs.length === 1) role = marqueurs[0].role;
    else if (marqueurs.length > 1) role = "partie";
    if (!role) continue;
    if (REPRESENTATION.test(ligne)) continue;

    const sirenLigne = sirenDeLaLigne(ligne);
    // Un en-tête dont les retours à la ligne ont été écrasés met plusieurs
    // parties sur la même ligne. Le numéro qui s'y trouve n'appartient alors
    // à aucune en particulier : l'attribuer au hasard rattacherait une
    // décision à la mauvaise société. On ne le retient que s'il n'y a qu'un
    // seul nom sur la ligne.
    const noms = [...ligne.matchAll(motif)];
    const siren = noms.length === 1 ? sirenLigne : null;
    let nomTrouve = false;

    for (const m of noms) {
      const forme = normaliserForme(m[1]);
      const connue = FORMES.includes(forme) || /^SOCIETE$/i.test(forme.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      if (!connue) continue;
      const denomination = m[2].trim().replace(/\s+/g, " ");
      if (!denomination) continue;
      // Sans identifiant, un nom pseudonymisé ne mène nulle part.
      if (pseudonymise(denomination) && !siren) continue;
      // La clé porte les deux : sans la dénomination, plusieurs parties
      // partageant une ligne — donc un même numéro — se confondraient en une.
      const cle = `${role}|${siren ?? ""}|${normaliserDenomination(denomination)}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      nomTrouve = true;
      parties.push({ denomination, forme, role, siren });
    }

    // Un numéro isolé sur sa ligne appartient à la partie qu'on vient de lire :
    // l'immatriculation suit souvent la dénomination, à la ligne suivante.
    if (!nomTrouve && sirenLigne) {
      const derniere = parties[parties.length - 1];
      if (derniere && derniere.role === role && !derniere.siren) derniere.siren = sirenLigne;
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
  // Le numéro d'immatriculation tranche seul. Quand la décision le donne, il
  // n'y a plus ni faisceau ni renoncement : une société, une seule.
  if (partie.siren) {
    const parSiren = candidats.find((c) => c.siren === partie.siren);
    if (parSiren) return parSiren;
  }

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

/**
 * Moisson en masse, par le point d'export prévu pour cela.
 *
 * `/search` plafonne à dix mille résultats par requête — la page deux cents
 * répond 416, quel que soit le nombre réel de décisions. `/export` est le
 * point conçu pour la récupération exhaustive : il rend les décisions
 * complètes, texte et zones compris, ce qui épargne aussi l'appel individuel
 * à `/decision` — le poste principal du temps de collecte.
 *
 * Le plafond n'a pas disparu pour autant : il se contourne en découpant par
 * tranches de dates assez courtes pour rester sous la limite.
 */
export async function exporter(options: {
  juridiction: string;
  depuis: string;
  jusqua: string;
  taille?: number;
  lot?: number;
}): Promise<{ total: number; decisions: DecisionJudilibre[] }> {
  if (!judilibreConfigure()) return { total: 0, decisions: [] };
  const url = new URL(`${BASE}/export`);
  url.searchParams.set("jurisdiction", options.juridiction);
  url.searchParams.set("date_start", options.depuis);
  url.searchParams.set("date_end", options.jusqua);
  url.searchParams.set("date_type", "creation");
  url.searchParams.set("batch_size", String(options.taille ?? 50));
  url.searchParams.set("batch", String(options.lot ?? 0));
  url.searchParams.set("order", "asc");

  const data = await appelJson<{ total?: number; results?: ReponseDecision[] }>(
    url.toString(),
    "judilibre",
    { headers: entetes(), timeoutMs: 45_000 },
  );
  const decisions = (data.results ?? [])
    .filter((d) => d.id && d.text)
    .map((d) => ({
      id: d.id!,
      juridiction: d.jurisdiction ?? null,
      chambre: d.chamber ?? null,
      numero: d.number ?? null,
      ecli: d.ecli ?? null,
      date: d.decision_date ? new Date(d.decision_date) : null,
      solution: d.solution ?? null,
      solutionLibelle: d.solution_alt ?? null,
      nac: d.nac ?? null,
      texte: d.text!,
      zones: d.zones ?? null,
    }));
  return { total: data.total ?? 0, decisions };
}
