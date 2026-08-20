"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { genererReference } from "@/lib/refs";
import { creerJetonSuivi, empreinteIp } from "@/lib/auth";
import { chargerEntreprise } from "@/lib/fiche";
import { lireBrouillon } from "@/lib/brouillon";
import { situationParCle } from "@/lib/tunnel";
import { recalculerIndices } from "@/lib/stats";
import type { CategorieLitige, DemandeConsommateur, EtatProfessionnel } from "@prisma/client";

/**
 * Dépôt d'un signalement à partir du brouillon du tunnel.
 *
 * Le récit est enregistré dans `resume`, qui n'est jamais publié : il alimente
 * le courrier de réclamation, le récapitulatif et le traitement d'une
 * éventuelle contestation. Ce qui paraît sur la fiche est composé des champs
 * structurés — situation, demande, état du professionnel, relances — que
 * l'étape 2 recueille sous forme de choix fermés, donc publiables sans
 * relecture.
 *
 * Rien n'est écrit en base avant cet instant : quelqu'un qui abandonne à
 * l'étape deux ne laisse aucune ligne derrière lui.
 */
export async function deposerDepuisBrouillon(
  slug: string,
  email: string,
): Promise<string | null> {
  const brouillon = await lireBrouillon();
  const situation = situationParCle(brouillon.situation);
  if (!situation || !brouillon.recit) return null;

  const base = await chargerEntreprise(slug);
  if (!base) return null;

  const montantBrut = brouillon.montant ? Number(brouillon.montant.replace(",", ".")) : NaN;
  const montant = Number.isFinite(montantBrut) && montantBrut > 0 ? montantBrut : null;

  const reference = await genererReference();
  const enTetes = await headers();

  try {
    const signalement = await prisma.signalement.create({
      data: {
        reference,
        entrepriseId: base.id,
        categorie: situation.categorie as CategorieLitige,
        sousCategorie: brouillon.sous ?? null,
        montant,
        // Le montant reste compté dans les statistiques même lorsqu'il n'est
        // pas affiché : c'est l'affichage que l'auteur choisit, pas la mesure.
        montantPublic: brouillon.montantPublic !== false,
        dateFaits: brouillon.dateFaits ? new Date(brouillon.dateFaits) : new Date(),
        contactPrealable: brouillon.relances ? "ECRIT" : "AUCUN",
        demande: (brouillon.demande as DemandeConsommateur | undefined) ?? null,
        etatProfessionnel: (brouillon.etatPro as EtatProfessionnel | undefined) ?? null,
        relances: brouillon.relances ?? null,
        resume: brouillon.recit,
        email,
        certifie: true,
        consentement: true,
        ipHash: empreinteIp(enTetes.get("x-forwarded-for") ?? ""),
        userAgent: enTetes.get("user-agent")?.slice(0, 300) ?? null,
      },
    });

    await creerJetonSuivi(signalement.id, email);
    await recalculerIndices(base.id).catch(() => undefined);

    return reference;
  } catch (e) {
    console.error("[tunnel] dépôt impossible", e);
    return null;
  }
}
