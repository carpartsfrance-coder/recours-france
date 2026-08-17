"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { prolongerJeton, resoudreJetonSuivi } from "@/lib/auth";
import { enregistrerPiece, supprimerPiece, validerPiece, NOMBRE_MAX } from "@/lib/upload";
import { recalculerIndices } from "@/lib/stats";

export type EtatDossier = { message?: string; erreur?: string };

async function ouvrir(jeton: string) {
  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) throw new Error("Lien de suivi invalide ou expiré.");
  await prolongerJeton(jeton);
  return acces.signalement;
}

async function journaliser(signalementId: string, titre: string, detail?: string) {
  await prisma.evenementSignalement.create({
    data: { signalementId, titre, detail, auteur: "CONSOMMATEUR", etiquette: "CONSOMMATEUR" },
  });
}

async function rafraichirIndices(entrepriseId: string | null) {
  if (entrepriseId) await recalculerIndices(entrepriseId).catch(() => undefined);
}

/** Le consommateur déclare avoir reçu une réponse du professionnel. */
export async function enregistrerReponse(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");
  const nature = String(donnees.get("nature") ?? "");
  const commentaire = String(donnees.get("commentaire") ?? "").trim().slice(0, 400);

  try {
    const signalement = await ouvrir(jeton);
    const statut =
      nature === "solution"
        ? "SOLUTION_PROPOSEE"
        : nature === "partielle"
          ? "RESOLUTION_PARTIELLE"
          : "REPONSE_DECLAREE";

    await prisma.signalement.update({
      where: { id: signalement.id },
      data: {
        reponseDeclaree: true,
        reponseDeclareeLe: signalement.reponseDeclareeLe ?? new Date(),
        statut,
      },
    });
    await journaliser(
      signalement.id,
      "Réponse du professionnel enregistrée",
      `Déclarée par le consommateur${commentaire ? ` : ${commentaire}` : "."} Recours France n’a pas reçu cette réponse.`,
    );
    await rafraichirIndices(signalement.entrepriseId);
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return { message: "Réponse enregistrée. Le statut de votre signalement a été mis à jour." };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Action impossible." };
  }
}

/**
 * Confirmation de résolution : c'est la SEULE façon dont un signalement peut
 * être comptabilisé comme résolu (règle métier n° 2).
 */
export async function confirmerResolution(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");
  const complete = donnees.get("complete") === "on";

  try {
    const signalement = await ouvrir(jeton);
    const maintenant = new Date();
    await prisma.signalement.update({
      where: { id: signalement.id },
      data: {
        resolutionConfirmee: complete,
        resolutionConfirmeeLe: complete ? maintenant : null,
        statut: complete ? "RESOLU_CONFIRME" : "RESOLUTION_PARTIELLE",
        closLe: complete ? maintenant : null,
      },
    });
    await journaliser(
      signalement.id,
      complete ? "Résolution complète confirmée" : "Résolution partielle déclarée",
      complete
        ? "Confirmée par le consommateur après clôture du signalement."
        : "Geste commercial ou remboursement incomplet déclaré par le consommateur.",
    );
    await rafraichirIndices(signalement.entrepriseId);
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return {
      message: complete
        ? "Résolution confirmée. Votre signalement est clôturé et compte désormais comme résolu."
        : "Résolution partielle enregistrée. Votre signalement reste ouvert.",
    };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Action impossible." };
  }
}

/** Déclaration d'absence de solution, ou abandon du signalement. */
export async function cloturerSignalement(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");
  const motif = String(donnees.get("motif") ?? "non-resolu");

  try {
    const signalement = await ouvrir(jeton);
    const maintenant = new Date();
    await prisma.signalement.update({
      where: { id: signalement.id },
      data: {
        statut: motif === "abandon" ? "ABANDONNE" : "NON_RESOLU",
        resolutionConfirmee: false,
        closLe: maintenant,
      },
    });
    await journaliser(
      signalement.id,
      motif === "abandon" ? "Signalement clôturé sans suite" : "Signalement déclaré non résolu",
      "Aucune résolution n’a été confirmée : le signalement n’est pas compté comme résolu.",
    );
    await rafraichirIndices(signalement.entrepriseId);
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return { message: "Signalement clôturé. Vous pouvez toujours le rouvrir en nous écrivant." };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Action impossible." };
  }
}

/** Dépôt d'une pièce supplémentaire, en vue d'une vérification. */
export async function ajouterJustificatif(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");
  const fichiers = donnees.getAll("pieces").filter((f): f is File => f instanceof File && f.size > 0);
  if (!fichiers.length) return { erreur: "Sélectionnez au moins un fichier." };

  try {
    const signalement = await ouvrir(jeton);
    const deja = await prisma.justificatif.count({ where: { signalementId: signalement.id } });
    if (deja + fichiers.length > NOMBRE_MAX) return { erreur: "Cinq pièces au maximum par signalement." };

    for (const f of fichiers) {
      const erreur = validerPiece(f);
      if (erreur) return { erreur };
    }
    for (const f of fichiers) {
      const piece = await enregistrerPiece(f, signalement.reference);
      await prisma.justificatif.create({ data: { ...piece, signalementId: signalement.id } });
    }
    await journaliser(
      signalement.id,
      "Pièces déposées",
      `${fichiers.length} pièce${fichiers.length > 1 ? "s" : ""} en attente de contrôle. Les pièces ne sont jamais publiées.`,
    );
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return {
      message:
        "Pièce reçue. Elle est contrôlée sous 48 heures ouvrées : votre signalement passera alors en signalement vérifié.",
    };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Dépôt impossible." };
  }
}

/** Suppression à la demande du consommateur (RGPD, sans justification). */
export async function supprimerSignalement(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");
  try {
    const signalement = await ouvrir(jeton);
    const pieces = await prisma.justificatif.findMany({ where: { signalementId: signalement.id } });
    for (const p of pieces) await supprimerPiece(p.cheminStockage);
    await prisma.justificatif.deleteMany({ where: { signalementId: signalement.id } });
    await prisma.signalement.update({
      where: { id: signalement.id },
      data: {
        moderation: "RETIRE",
        motifModeration: "Suppression demandée par le consommateur",
        niveauVerification: "DECLARE",
        resume: "[supprimé à la demande du consommateur]",
        prenom: "—",
        nom: "—",
      },
    });
    await rafraichirIndices(signalement.entrepriseId);
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return { message: "Votre signalement et vos pièces ont été supprimés. Il ne figure plus dans aucune statistique." };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Suppression impossible." };
  }
}
