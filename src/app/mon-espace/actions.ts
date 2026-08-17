"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { creerJetonSuivi } from "@/lib/auth";
import { envoyerLiensSuivi } from "@/lib/emails";

export type EtatAcces = { message?: string; erreur?: string; envoye?: boolean };

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * Envoie par email les liens de suivi des signalements rattachés à une adresse.
 * La réponse est volontairement identique que l'adresse existe ou non :
 * la plateforme ne confirme jamais l'existence d'un signalement.
 */
export async function demanderLiens(_precedent: EtatAcces, donnees: FormData): Promise<EtatAcces> {
  const analyse = schema.safeParse({ email: donnees.get("email") });
  if (!analyse.success) return { erreur: "Indiquez une adresse email valide." };

  const email = analyse.data.email;
  const signalements = await prisma.signalement.findMany({
    where: { email, moderation: { not: "RETIRE" } },
    include: { entreprise: { select: { denomination: true } } },
    orderBy: { creeLe: "desc" },
    take: 20,
  });

  if (signalements.length) {
    const dossiers = [];
    for (const s of signalements) {
      const existant = await prisma.jetonAcces.findFirst({
        where: { signalementId: s.id, type: "SUIVI_SIGNALEMENT", expireLe: { gt: new Date() } },
        orderBy: { creeLe: "desc" },
      });
      const jeton = existant?.jeton ?? (await creerJetonSuivi(s.id, email));
      dossiers.push({
        reference: s.reference,
        entreprise: s.entreprise?.denomination ?? s.entrepriseLibreNom ?? "Entreprise non identifiée",
        jeton,
      });
    }
    await envoyerLiensSuivi(email, dossiers).catch((e) => console.error("[mail] liens de suivi", e));
  }

  return {
    envoye: true,
    message:
      "Si des signalements sont rattachés à cette adresse, un email contenant vos liens de suivi vient d’être envoyé. Vérifiez votre courrier indésirable.",
  };
}
