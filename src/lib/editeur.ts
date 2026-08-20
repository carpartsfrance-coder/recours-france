/**
 * Identité légale de l'éditeur et de l'hébergeur.
 *
 * Ces mentions sont obligatoires : article 6 III de la loi pour la confiance
 * dans l'économie numérique pour l'éditeur et l'hébergeur, article R123-237 du
 * code de commerce pour le RCS et la TVA. Les omettre est un délit — un an
 * d'emprisonnement et 75 000 € d'amende pour une personne physique.
 *
 * Elles ne sont pas écrites dans le code. Une adresse de siège, un numéro de
 * SIREN et le nom d'un directeur de la publication ne se devinent pas, et une
 * mention légale inventée est pire qu'une mention absente : elle engage une
 * société sur des informations fausses. Elles arrivent donc par
 * l'environnement, et se renseignent chez l'hébergeur.
 *
 * Rien ici ne peut échouer silencieusement. `mentionsCompletes` recense ce qui
 * manque, la page des mentions légales affiche un avertissement visible tant
 * que la liste n'est pas vide, et `npm run verifier:mise-en-ligne` refuse le
 * feu vert.
 */

function lire(cle: string): string {
  return (process.env[cle] ?? "").trim();
}

export const EDITEUR = {
  raisonSociale: lire("EDITEUR_RAISON_SOCIALE"),
  formeJuridique: lire("EDITEUR_FORME") || "Société par actions simplifiée",
  capital: lire("EDITEUR_CAPITAL"),
  adresse: lire("EDITEUR_ADRESSE"),
  codePostal: lire("EDITEUR_CODE_POSTAL"),
  ville: lire("EDITEUR_VILLE"),
  siren: lire("EDITEUR_SIREN"),
  rcsVille: lire("EDITEUR_RCS_VILLE"),
  tva: lire("EDITEUR_TVA"),
  directeurPublication: lire("EDITEUR_DIRECTEUR_PUBLICATION"),
};

/**
 * L'hébergeur.
 *
 * Le service tourne chez Render, en région Francfort — c'est écrit dans
 * render.yaml, et c'est la seule partie que le code connaisse de source sûre.
 * La raison sociale exacte, l'adresse postale et le téléphone se recopient
 * depuis les mentions légales de l'hébergeur lui-même : les réciter de mémoire
 * serait le meilleur moyen de publier une adresse fausse.
 */
export const HEBERGEUR = {
  nom: lire("HEBERGEUR_NOM"),
  adresse: lire("HEBERGEUR_ADRESSE"),
  telephone: lire("HEBERGEUR_TELEPHONE"),
  localisationDonnees: lire("HEBERGEUR_REGION") || "Francfort, Allemagne (Union européenne)",
};

/** Les champs sans lesquels la page ne satisfait pas la loi. */
const OBLIGATOIRES: [string, string][] = [
  ["EDITEUR_RAISON_SOCIALE", EDITEUR.raisonSociale],
  ["EDITEUR_ADRESSE", EDITEUR.adresse],
  ["EDITEUR_CODE_POSTAL", EDITEUR.codePostal],
  ["EDITEUR_VILLE", EDITEUR.ville],
  ["EDITEUR_SIREN", EDITEUR.siren],
  ["EDITEUR_RCS_VILLE", EDITEUR.rcsVille],
  ["EDITEUR_DIRECTEUR_PUBLICATION", EDITEUR.directeurPublication],
  ["HEBERGEUR_NOM", HEBERGEUR.nom],
  ["HEBERGEUR_ADRESSE", HEBERGEUR.adresse],
  ["HEBERGEUR_TELEPHONE", HEBERGEUR.telephone],
];

/** Les variables manquantes, dans l'ordre où on les renseignera. */
export function mentionsManquantes(): string[] {
  return OBLIGATOIRES.filter(([, valeur]) => !valeur).map(([cle]) => cle);
}

export function mentionsCompletes(): boolean {
  return mentionsManquantes().length === 0;
}

/**
 * Le nom à écrire dans les pieds de page, les courriels et les politiques.
 *
 * À défaut de raison sociale renseignée, « Recours France » tout court — le
 * nom du service, qui n'engage rien. Ces endroits affichaient « Recours France
 * SAS » : une forme juridique inventée, écrite en dur à quatre endroits, dans
 * des textes qui désignent un responsable de traitement.
 */
export function nomEditeur(): string {
  return EDITEUR.raisonSociale || "Recours France";
}

/** « 12 rue de la Paix — 75002 Paris », ou rien si le siège n'est pas renseigné. */
export function siegeSocial(): string {
  if (!EDITEUR.adresse) return "";
  return `${EDITEUR.adresse} — ${EDITEUR.codePostal} ${EDITEUR.ville}`.trim();
}
