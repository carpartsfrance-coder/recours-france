/**
 * Analyse de cohérence d'un justificatif — étage 2.
 *
 * Ce module répond à une seule question : « ce document est-il plausiblement
 * lié à cette entreprise et à cette période ? » Il ne répond JAMAIS à « ce
 * document étaye-t-il le litige ? » — aucun algorithme ne le peut. Une vraie
 * facture du bon commerçant à la bonne date peut concerner un achat qui s'est
 * parfaitement bien passé.
 *
 * Conséquences directes :
 *   — rien ici ne bloque un dépôt ;
 *   — rien ici n'est publié, ni transformé en badge ;
 *   — le résultat sert à conseiller le déposant, et à prioriser l'examen le
 *     jour où une entreprise conteste.
 */
import { extraireTextePdf } from "./lecture-pdf";

export type Coherence = {
  texteExploitable: boolean;
  entrepriseTrouvee: boolean | null;
  dateProcheTrouvee: boolean | null;
  montantTrouve: boolean | null;
  documentCommercial: boolean | null;
  /** Conservées en base, jamais publiées. */
  observations: string[];
  /** Message affiché au déposant, ou null s'il n'y a rien d'utile à dire. */
  conseil: string | null;
};

/** Formes juridiques et mots vides : ils n'identifient aucune entreprise. */
const MOTS_NON_DISCRIMINANTS = new Set([
  "SA", "SAS", "SASU", "SARL", "EURL", "SNC", "SCI", "SCS", "SEM", "GIE",
  "GROUPE", "FRANCE", "SOCIETE", "ETS", "ETABLISSEMENTS", "COMPAGNIE", "CIE",
  "ET", "DE", "DU", "DES", "LA", "LE", "LES", "SERVICES", "PARTICIPATIONS",
]);

const MARQUEURS_COMMERCIAUX = [
  "facture", "commande", "devis", "bon de livraison", "recu", "ticket",
  "tva", "total", "montant", "ttc", "siret", "reference", "client",
];

const JOUR = 86_400_000;
/** Au-delà, la date lue n'apporte plus de confirmation utile. */
const ECART_DATE_TOLERE = 90 * JOUR;

export function analyserCoherence(params: {
  octets: Buffer;
  typeMime: string;
  entreprise: string | null;
  dateFaits: Date;
  montant: number | null;
}): Coherence {
  const texte = params.typeMime === "application/pdf" ? extraireTextePdf(params.octets) : null;

  if (!texte) {
    const image = params.typeMime !== "application/pdf";
    return {
      texteExploitable: false,
      entrepriseTrouvee: null,
      dateProcheTrouvee: null,
      montantTrouve: null,
      documentCommercial: null,
      observations: [image ? "image : contenu non analysable sans reconnaissance de texte" : "PDF sans couche texte (document scanné)"],
      conseil:
        "Nous n’avons pas pu lire le contenu de ce document — c’est habituel pour une photo ou un scan, et sans conséquence sur votre signalement. Vérifiez simplement qu’il s’agit du bon fichier : vous en aurez besoin devant le médiateur.",
    };
  }

  const normalise = sansAccents(texte).toUpperCase();
  const observations: string[] = [];

  const entrepriseTrouvee = params.entreprise ? nomPresent(params.entreprise, normalise) : null;
  const documentCommercial = MARQUEURS_COMMERCIAUX.some((m) => normalise.includes(sansAccents(m).toUpperCase()));
  const dateProcheTrouvee = dateProche(texte, params.dateFaits);
  const montantTrouve = params.montant !== null ? montantPresent(texte, params.montant) : null;

  if (entrepriseTrouvee === false) observations.push("nom de l’entreprise non retrouvé dans le document");
  if (!documentCommercial) observations.push("aucune mention de document commercial (facture, commande, TVA…)");
  if (dateProcheTrouvee === false) observations.push("aucune date proche de celle des faits déclarés");
  if (montantTrouve === false) observations.push("montant déclaré non retrouvé dans le document");

  // On ne parle au déposant que si quelque chose cloche vraiment. Un message à
  // chaque dépôt serait du bruit, et le bruit finit par être ignoré.
  let conseil: string | null = null;
  if (entrepriseTrouvee === false && !documentCommercial) {
    conseil =
      "Ce document ne semble être ni une facture ni un document commercial, et le nom de l’entreprise ne s’y trouve pas. Vérifiez qu’il s’agit du bon fichier.";
  } else if (entrepriseTrouvee === false) {
    conseil = `Nous n’avons pas retrouvé « ${params.entreprise} » dans ce document. Il reste enregistré tel quel, mais vérifiez qu’il s’agit du bon fichier : c’est celui que vous produirez devant le médiateur.`;
  }

  return {
    texteExploitable: true,
    entrepriseTrouvee,
    dateProcheTrouvee,
    montantTrouve,
    documentCommercial,
    observations,
    conseil,
  };
}

function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Le nom est présent si l'un de ses mots distinctifs figure dans le texte. */
function nomPresent(denomination: string, texteNormalise: string): boolean {
  const distinctifs = sansAccents(denomination)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((mot) => mot.length >= 4 && !MOTS_NON_DISCRIMINANTS.has(mot));

  // Sans aucun mot distinctif (« SAS DE LA FRANCE »), on ne conclut rien.
  if (!distinctifs.length) return true;
  return distinctifs.some((mot) => texteNormalise.includes(mot));
}

/** Une date du document tombe-t-elle près de celle des faits déclarés ? */
function dateProche(texte: string, dateFaits: Date): boolean {
  const MOIS = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
  const trouvees: Date[] = [];

  for (const m of texte.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) {
    const annee = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    trouvees.push(new Date(annee, Number(m[2]) - 1, Number(m[1])));
  }
  for (const m of sansAccents(texte).toLowerCase().matchAll(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/g)) {
    const mois = MOIS.indexOf(m[2]);
    if (mois >= 0) trouvees.push(new Date(Number(m[3]), mois, Number(m[1])));
  }

  return trouvees.some(
    (d) => !Number.isNaN(d.getTime()) && Math.abs(d.getTime() - dateFaits.getTime()) <= ECART_DATE_TOLERE,
  );
}

/** Le montant déclaré figure-t-il, à un centime près, quelle que soit l'écriture ? */
function montantPresent(texte: string, montant: number): boolean {
  const cible = Math.round(montant * 100);
  for (const m of texte.matchAll(/\b\d{1,3}(?:[   ]?\d{3})*(?:[.,]\d{1,2})?\b/g)) {
    const valeur = Number(m[0].replace(/[\s ]/g, "").replace(",", "."));
    if (Number.isFinite(valeur) && Math.round(valeur * 100) === cible) return true;
  }
  return false;
}
