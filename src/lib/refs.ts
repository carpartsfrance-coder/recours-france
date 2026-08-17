import { randomInt } from "node:crypto";
import { prisma } from "./db";

/**
 * Référence publique d'un signalement : RF-AAAA-MM-NNNNN.
 * Le suffixe est tiré au hasard pour ne pas révéler le volume déposé.
 */
export async function genererReference(date = new Date()): Promise<string> {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");

  for (let i = 0; i < 12; i++) {
    const suffixe = String(randomInt(10_000, 99_999));
    const reference = `RF-${annee}-${mois}-${suffixe}`;
    const existe = await prisma.signalement.findUnique({ where: { reference }, select: { id: true } });
    if (!existe) return reference;
  }
  // Repli déterministe si la plage est saturée pour ce mois.
  const total = await prisma.signalement.count();
  return `RF-${annee}-${mois}-${String(100_000 + total)}`;
}

export function referenceValide(reference: string): boolean {
  return /^RF-\d{4}-\d{2}-\d{4,6}$/.test(reference.trim().toUpperCase());
}
