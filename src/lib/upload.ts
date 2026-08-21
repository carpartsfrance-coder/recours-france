/**
 * Stockage des justificatifs.
 *
 * Les pièces ne sont JAMAIS publiées : elles ne sont lisibles que par une
 * route d'administration authentifiée, qui trace chaque consultation.
 *
 * Elles vivent en base, pas sur disque. Ce service repose entièrement sur la
 * preuve, et un système de fichiers d'hébergeur est éphémère : à chaque
 * déploiement, les pièces disparaissaient tandis que leur ligne subsistait.
 * Un justificatif dont la ligne existe mais dont le fichier a disparu est pire
 * qu'un justificatif absent — le déposant croit sa preuve versée, et ne
 * l'apprend qu'au moment où elle compte.
 *
 * En base, la ligne et les octets sont écrits dans la même transaction,
 * sauvegardés par la même sauvegarde, restaurés au même instant. Le service
 * cesse par ailleurs d'être attaché à une machine, ce qu'un disque imposait.
 *
 * Les octets sont dans une table à part, ContenuJustificatif : voir le schéma.
 */
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { EXTENSIONS, NOMBRE_MAX, TAILLE_MAX, TYPES_ACCEPTES } from "./upload-constantes";

export { EXTENSIONS, NOMBRE_MAX, TAILLE_MAX, TYPES_ACCEPTES, formatTaille } from "./upload-constantes";

/** Emplacement des pièces déposées avant le passage en base. Lecture seule. */
const ANCIENNE_RACINE = path.join(process.cwd(), "storage", "justificatifs");

export type PieceEnregistree = {
  nomOrigine: string;
  typeMime: string;
  taille: number;
  sommeControle: string;
  /**
   * À écrire dans ContenuJustificatif, jamais dans Justificatif.
   *
   * Le paramètre de type est explicite : `Uint8Array` seul se résout en
   * `Uint8Array<ArrayBufferLike>`, quand Prisma exige `Uint8Array<ArrayBuffer>`.
   * Buffer, qui l'étend, souffre du même écart.
   */
  octets: Uint8Array<ArrayBuffer>;
};

export function validerPiece(fichier: File): string | null {
  if (fichier.size === 0) return "Le fichier est vide.";
  if (fichier.size > TAILLE_MAX) return "Le fichier dépasse 10 Mo.";
  if (!TYPES_ACCEPTES.includes(fichier.type)) return "Format non accepté : PDF, JPG ou PNG uniquement.";
  return null;
}

export async function enregistrerPiece(fichier: File): Promise<PieceEnregistree> {
  const erreur = validerPiece(fichier);
  if (erreur) throw new Error(erreur);

  // `new Uint8Array` et non `Buffer.from` : ce dernier produit un
  // Buffer<ArrayBufferLike>, quand Prisma exige un Uint8Array<ArrayBuffer>.
  const octets = new Uint8Array(await fichier.arrayBuffer());
  return {
    nomOrigine: nettoyerNom(fichier.name),
    typeMime: fichier.type,
    taille: fichier.size,
    sommeControle: createHash("sha256").update(octets).digest("hex"),
    octets,
  };
}

/**
 * Lit les octets d'une pièce. C'est le seul endroit qui les charge.
 *
 * Le repli sur disque ne sert qu'aux pièces déposées avant la bascule ; il
 * disparaîtra le jour où il n'en restera plus.
 */
export async function lirePiece(justificatifId: string, cheminHerite?: string | null): Promise<Buffer> {
  const contenu = await prisma.contenuJustificatif.findUnique({
    where: { justificatifId },
    select: { octets: true },
  });
  if (contenu) return Buffer.from(contenu.octets);

  if (!cheminHerite) throw new Error("Contenu introuvable");
  const complet = path.join(ANCIENNE_RACINE, cheminHerite);
  // Empêche toute remontée hors du répertoire de stockage.
  if (!path.resolve(complet).startsWith(path.resolve(ANCIENNE_RACINE))) throw new Error("Chemin invalide");
  return readFile(complet);
}

/**
 * Efface le fichier d'une pièce héritée du stockage disque.
 *
 * Les octets en base, eux, partent avec la ligne : ContenuJustificatif est en
 * cascade sur Justificatif. Cette fonction ne subsiste que pour les anciennes
 * pièces, et ne fait rien quand il n'y a pas de chemin.
 */
export async function supprimerPiece(cheminHerite?: string | null): Promise<void> {
  if (!cheminHerite) return;
  const complet = path.join(ANCIENNE_RACINE, cheminHerite);
  if (!path.resolve(complet).startsWith(path.resolve(ANCIENNE_RACINE))) return;
  await unlink(complet).catch(() => undefined);
}

function nettoyerNom(nom: string): string {
  return nom.replace(/[/\\]/g, "_").slice(0, 120) || "piece";
}
