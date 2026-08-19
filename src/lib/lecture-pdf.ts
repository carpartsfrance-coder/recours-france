/**
 * Extraction du texte d'un PDF, sans dépendance.
 *
 * Suffisant pour ce qu'on en fait : chercher un nom, une date, un montant. Il
 * ne s'agit pas de reconstituer la mise en page.
 *
 * Deux cas ne donneront jamais rien, et c'est normal :
 *   — un PDF issu d'un scan ou d'une photo ne contient aucune couche texte ;
 *   — certaines polices embarquées encodent les caractères sur mesure.
 * Dans ces cas la fonction renvoie null, et l'appelant doit se taire plutôt que
 * de conclure quoi que ce soit.
 */
import { inflateSync } from "node:zlib";

/** En dessous, ce qu'on a extrait n'est pas du texte exploitable. */
const LONGUEUR_MINIMALE = 40;

export function extraireTextePdf(octets: Buffer): string | null {
  const morceaux: string[] = [];

  for (const flux of fluxDuDocument(octets)) {
    if (flux === null) continue;
    let contenu = flux;
    try {
      contenu = inflateSync(flux);
    } catch {
      // Flux non compressé, ou compression non gérée : on tente tel quel.
    }
    morceaux.push(texteDuContenu(contenu.toString("latin1")));
  }

  const texte = morceaux.join(" ").replace(/\s+/g, " ").trim();
  if (texte.length < LONGUEUR_MINIMALE) return null;
  // Un flux binaire mal identifié produit des suites d'octets dont certaines
  // ressemblent à des opérateurs de texte. Sans ce filtre, un PDF scanné
  // renverrait du charabia qu'on prendrait pour une couche texte absente
  // d'ailleurs — et toutes les conclusions suivantes seraient fausses.
  return estTextePlausible(texte) ? texte : null;
}

/**
 * Vrai texte ou résidu binaire ? On demande une proportion élevée de
 * caractères courants et la présence de mots véritables.
 */
function estTextePlausible(texte: string): boolean {
  const courants = texte.match(/[A-Za-zÀ-ÿ0-9 .,:;/'’()%€-]/g)?.length ?? 0;
  if (courants / texte.length < 0.9) return false;
  const mots = texte.match(/[A-Za-zÀ-ÿ]{3,}/g) ?? [];
  return mots.length >= 5;
}

/** Filtres et types qui désignent un flux d'image, jamais du texte. */
const FLUX_BINAIRES = ["/Image", "/DCTDecode", "/JPXDecode", "/CCITTFaxDecode", "/JBIG2Decode"];

/**
 * Découpe brute des paires stream / endstream. Renvoie null pour un flux dont
 * le dictionnaire annonce une image : l'inspecter ne peut produire que du bruit.
 */
function* fluxDuDocument(octets: Buffer): Generator<Buffer | null> {
  const DEBUT = Buffer.from("stream");
  const FIN = Buffer.from("endstream");
  let i = 0;
  while (i < octets.length) {
    const debut = octets.indexOf(DEBUT, i);
    if (debut === -1) return;

    const dictionnaire = octets.subarray(Math.max(0, debut - 600), debut).toString("latin1");
    const estImage = FLUX_BINAIRES.some((marqueur) => dictionnaire.includes(marqueur));

    let corps = debut + DEBUT.length;
    // Le mot-clé est suivi de CRLF ou LF.
    if (octets[corps] === 0x0d) corps++;
    if (octets[corps] === 0x0a) corps++;
    const fin = octets.indexOf(FIN, corps);
    if (fin === -1) return;
    yield estImage ? null : octets.subarray(corps, fin);
    i = fin + FIN.length;
  }
}

/** Récupère les chaînes des opérateurs de dessin de texte : Tj, TJ, ' et ". */
function texteDuContenu(contenu: string): string {
  const sortie: string[] = [];
  const operateurs = /\((?:\\.|[^\\()])*\)\s*(?:Tj|TJ|'|")|\[(?:[^\][]|\\.)*\]\s*TJ/g;

  for (const bloc of contenu.match(operateurs) ?? []) {
    for (const chaine of bloc.match(/\((?:\\.|[^\\()])*\)/g) ?? []) {
      sortie.push(decoderChaine(chaine.slice(1, -1)));
    }
  }
  return sortie.join(" ");
}

/** Séquences d'échappement PDF, y compris les codes octaux. */
function decoderChaine(brut: string): string {
  return brut
    .replace(/\\([0-7]{1,3})/g, (_, o: string) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\([()\\])/g, "$1");
}
