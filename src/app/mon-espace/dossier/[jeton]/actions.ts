"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { prolongerJeton, resoudreJetonSuivi } from "@/lib/auth";
import { enregistrerPiece, supprimerPiece, validerPiece, NOMBRE_MAX } from "@/lib/upload";
import { controlerOctets } from "@/lib/controle-pieces";
import { analyserCoherence } from "@/lib/coherence";
import { reponseEncorePossible } from "@/lib/contestations";
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

/**
 * Réponse du consommateur à une contestation.
 *
 * Il lui suffit de confirmer, à condition qu'une pièce accompagne le dossier.
 * Sans pièce, la réponse est refusée : ce serait une confirmation sans contenu,
 * et la contestation porte précisément sur l'absence de preuve.
 */
export async function repondreContestation(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");

  try {
    const signalement = await ouvrir(jeton);
    const contestation = await prisma.contestation.findFirst({
      where: { signalementId: signalement.id, etat: "PIECE_DEMANDEE" },
      orderBy: { creeLe: "desc" },
    });
    if (!contestation) return { erreur: "Aucune contestation en attente sur ce dossier." };
    if (!reponseEncorePossible(contestation)) {
      return { erreur: "Le délai de réponse est écoulé. Écrivez-nous si vous souhaitez rouvrir le dossier." };
    }

    const pieces = await prisma.justificatif.count({ where: { signalementId: signalement.id } });
    if (pieces === 0) {
      return {
        erreur:
          "Déposez d’abord une pièce justificative : c’est elle qui répond à la contestation. Utilisez « Ajouter un justificatif » ci-dessus.",
      };
    }

    await prisma.contestation.update({
      where: { id: contestation.id },
      data: { etat: "PIECE_FOURNIE", repondueLe: new Date() },
    });
    await journaliser(
      signalement.id,
      "Réponse à la contestation",
      "Vous avez confirmé votre signalement. Votre pièce va être examinée ; elle n’est ni publiée ni transmise à l’entreprise.",
    );
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return {
      message:
        "Réponse enregistrée. Votre signalement reste publié pendant l’examen de votre pièce. Vous serez informé de l’issue par email.",
    };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Action impossible." };
  }
}

/**
 * Coupe ou rétablit les rappels d'échéance.
 *
 * Volontairement une action de formulaire et non un lien dans l'email : les
 * scanners de messagerie suivent les liens automatiquement et couperaient les
 * rappels de gens qui n'ont rien demandé.
 */
export async function basculerRappels(_precedent: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  const jeton = String(donnees.get("jeton") ?? "");
  const activer = String(donnees.get("activer") ?? "") === "oui";

  try {
    const signalement = await ouvrir(jeton);
    await prisma.signalement.update({
      where: { id: signalement.id },
      data: { relancesActives: activer },
    });
    await journaliser(
      signalement.id,
      activer ? "Rappels réactivés" : "Rappels désactivés",
      activer
        ? "Les rappels d'échéance reprendront aux dates prévues."
        : "Plus aucun rappel ne sera envoyé pour ce dossier.",
    );
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return {
      message: activer
        ? "Rappels réactivés : vous serez prévenu aux prochaines échéances."
        : "Rappels désactivés. Les échéances restent consultables dans votre dossier.",
    };
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

    const controlesParFichier = new Map<File, { anomalies: string[]; octets: Buffer }>();
    for (const f of fichiers) {
      const erreur = validerPiece(f);
      if (erreur) return { erreur };
      const octets = Buffer.from(await f.arrayBuffer());
      const controle = controlerOctets(octets, f.type);
      if (controle.refus) return { erreur: controle.refus };
      controlesParFichier.set(f, { anomalies: controle.anomalies, octets });
    }

    const denomination = signalement.entrepriseId
      ? ((
          await prisma.entreprise.findUnique({
            where: { id: signalement.entrepriseId },
            select: { denomination: true },
          })
        )?.denomination ?? null)
      : signalement.entrepriseLibreNom;

    const conseils: string[] = [];
    for (const f of fichiers) {
      const piece = await enregistrerPiece(f, signalement.reference);
      const controle = controlesParFichier.get(f);
      const anomalies = [...(controle?.anomalies ?? [])];
      const coherence = controle
        ? analyserCoherence({
            octets: controle.octets,
            typeMime: f.type,
            entreprise: denomination,
            dateFaits: signalement.dateFaits,
            montant: signalement.montant ? Number(signalement.montant) : null,
          })
        : null;
      if (coherence?.conseil) conseils.push(coherence.conseil);
      const dejaVu = await prisma.justificatif.findFirst({
        where: { sommeControle: piece.sommeControle, signalement: { email: { not: signalement.email } } },
        select: { id: true },
      });
      if (dejaVu) anomalies.push("fichier déjà déposé sous une autre identité");
      await prisma.justificatif.create({
        data: {
          ...piece,
          signalementId: signalement.id,
          anomalies,
          observations: coherence?.observations ?? [],
          conseil: coherence?.conseil ?? null,
        },
      });
    }
    if (signalement.niveauVerification === "DECLARE") {
      await prisma.signalement.update({
        where: { id: signalement.id },
        data: { niveauVerification: "PIECE_DEPOSEE" },
      });
    }
    await journaliser(
      signalement.id,
      "Pièces déposées",
      `${fichiers.length} pièce${fichiers.length > 1 ? "s" : ""} déposée${fichiers.length > 1 ? "s" : ""}, horodatée${fichiers.length > 1 ? "s" : ""} et scellée${fichiers.length > 1 ? "s" : ""}. Les pièces ne sont jamais publiées.`,
    );
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    return {
      message: [
        "Pièce enregistrée, horodatée et scellée. Elle n’est pas examinée systématiquement : elle le sera si l’entreprise conteste votre signalement.",
        ...conseils,
      ].join(" "),
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
