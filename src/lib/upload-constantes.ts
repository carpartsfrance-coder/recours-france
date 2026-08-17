/** Contraintes de dépôt, partagées entre le client et le serveur. */

export const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo par pièce
export const NOMBRE_MAX = 5;
export const TYPES_ACCEPTES = ["application/pdf", "image/jpeg", "image/png"];
export const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
