/**
 * Stockage des justificatifs.
 *
 * Les pièces ne sont JAMAIS publiées : elles sont écrites hors du répertoire
 * public et ne sont lisibles que par une route d'administration authentifiée.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { EXTENSIONS, NOMBRE_MAX, TAILLE_MAX, TYPES_ACCEPTES } from "./upload-constantes";

export { EXTENSIONS, NOMBRE_MAX, TAILLE_MAX, TYPES_ACCEPTES, formatTaille } from "./upload-constantes";

const RACINE = path.join(process.cwd(), "storage", "justificatifs");

export type PieceEnregistree = {
  nomOrigine: string;
  typeMime: string;
  taille: number;
  cheminStockage: string;
  sommeControle: string;
};

export function validerPiece(fichier: File): string | null {
  if (fichier.size === 0) return "Le fichier est vide.";
  if (fichier.size > TAILLE_MAX) return "Le fichier dépasse 10 Mo.";
  if (!TYPES_ACCEPTES.includes(fichier.type)) return "Format non accepté : PDF, JPG ou PNG uniquement.";
  return null;
}

export async function enregistrerPiece(fichier: File, referenceDossier: string): Promise<PieceEnregistree> {
  const erreur = validerPiece(fichier);
  if (erreur) throw new Error(erreur);

  const octets = Buffer.from(await fichier.arrayBuffer());
  const somme = createHash("sha256").update(octets).digest("hex");

  const dossier = path.join(RACINE, referenceDossier);
  await mkdir(dossier, { recursive: true });

  const extension = EXTENSIONS[fichier.type] ?? "bin";
  const nom = `${randomBytes(8).toString("hex")}.${extension}`;
  const chemin = path.join(dossier, nom);
  await writeFile(chemin, octets, { mode: 0o600 });

  return {
    nomOrigine: nettoyerNom(fichier.name),
    typeMime: fichier.type,
    taille: fichier.size,
    cheminStockage: path.join(referenceDossier, nom),
    sommeControle: somme,
  };
}

export async function lirePiece(cheminRelatif: string): Promise<Buffer> {
  const complet = path.join(RACINE, cheminRelatif);
  // Empêche toute remontée hors du répertoire de stockage.
  if (!path.resolve(complet).startsWith(path.resolve(RACINE))) throw new Error("Chemin invalide");
  return readFile(complet);
}

export async function supprimerPiece(cheminRelatif: string): Promise<void> {
  const complet = path.join(RACINE, cheminRelatif);
  if (!path.resolve(complet).startsWith(path.resolve(RACINE))) return;
  await unlink(complet).catch(() => undefined);
}

function nettoyerNom(nom: string): string {
  return nom.replace(/[/\\]/g, "_").slice(0, 120) || "piece";
}
