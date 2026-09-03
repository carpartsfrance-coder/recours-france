"use server";

import { redirect } from "next/navigation";
import { avecJustificatif } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  exigerAdmin,
  fermerSessionAdmin,
  journaliser,
  ouvrirSessionAdmin,
  verifierMotDePasse,
  creerJetonSuivi,
} from "@/lib/auth";
import { recalculerIndices } from "@/lib/stats";
import { synchroniserEntreprise } from "@/lib/sources";
import { envoyerResultatVerification, envoyerAccuseDemande, envoyerIssueContestation } from "@/lib/emails";
import { supprimerPiece } from "@/lib/upload";

export type EtatAdmin = { message?: string; erreur?: string; succes?: boolean };

// ── Connexion ───────────────────────────────────────────────────────────────

const schemaConnexion = z.object({
  email: z.string().trim().toLowerCase().email("Identifiants invalides."),
  motDePasse: z.string().min(1, "Identifiants invalides."),
});

export async function connexionAdmin(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const analyse = schemaConnexion.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) return { erreur: "Identifiants invalides." };

  const admin = await prisma.adminUser.findUnique({ where: { email: analyse.data.email } });
  if (!admin || !admin.actif) return { erreur: "Identifiants invalides." };

  const valide = await verifierMotDePasse(analyse.data.motDePasse, admin.motDePasseHash);
  if (!valide) return { erreur: "Identifiants invalides." };

  await ouvrirSessionAdmin(admin.id);
  await journaliser(admin.id, "connexion", "adminUser", admin.id);
  redirect("/admin");
}

export async function deconnexionAdmin() {
  await fermerSessionAdmin();
  redirect("/admin/connexion");
}

// ── Contrôle des justificatifs ──────────────────────────────────────────────

/**
 * Contrôle d'une pièce. Accepter la pièce fait passer le signalement en
 * « justificatif examiné » : la pièce a été regardée et elle étaye le signalement.
 */
export async function controlerJustificatif(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim().slice(0, 300);

  const piece = await prisma.justificatif.findUnique({
    where: { id },
    include: { signalement: true },
  });
  if (!piece) return { erreur: "Pièce introuvable." };

  const accepte = decision === "accepter";
  await prisma.justificatif.update({
    where: { id },
    data: {
      etat: accepte ? "CONTROLE" : "REFUSE",
      controleLe: new Date(),
      controlePar: admin.nom,
      motifRefus: accepte ? null : motif || "Pièce non probante",
    },
  });

  if (accepte && piece.signalement.niveauVerification !== "PIECE_EXAMINEE") {
    await prisma.signalement.update({
      where: { id: piece.signalementId },
      data: { niveauVerification: "PIECE_EXAMINEE", verifieLe: new Date(), verifiePar: admin.nom },
    });
    await prisma.evenementSignalement.create({
      data: {
        signalementId: piece.signalementId,
        titre: "Justificatif examiné",
        detail:
          "La pièce a été examinée et elle étaye le signalement. L'examen porte sur la réalité de la relation commerciale, jamais sur le bien-fondé de la réclamation.",
        auteur: "RECOURS_FRANCE",
        etiquette: "EXAMEN",
      },
    });
    if (piece.signalement.entrepriseId) await recalculerIndices(piece.signalement.entrepriseId).catch(() => undefined);
  }

  if (!accepte) {
    await prisma.evenementSignalement.create({
      data: {
        signalementId: piece.signalementId,
        titre: "Pièce non retenue",
        detail: motif || "La pièce ne permet pas d’établir la réalité du signalement.",
        auteur: "RECOURS_FRANCE",
        etiquette: "VÉRIFICATION",
      },
    });
  }

  const jetonExistant = await prisma.jetonAcces.findFirst({
    where: { signalementId: piece.signalementId, expireLe: { gt: new Date() } },
    orderBy: { creeLe: "desc" },
  });
  const jeton = jetonExistant?.jeton ?? (await creerJetonSuivi(piece.signalementId, piece.signalement.email));
  await envoyerResultatVerification(
    piece.signalement.email,
    piece.signalement.reference,
    jeton,
    accepte,
    motif,
  ).catch(() => undefined);

  await journaliser(
    admin.id,
    accepte ? "justificatif.accepte" : "justificatif.refuse",
    "justificatif",
    id,
    piece.signalement.reference,
  );
  revalidatePath("/admin/justificatifs");
  revalidatePath("/admin/signalements");
  await viderLaFichePublique(id);
  return { succes: true, message: accepte ? "Pièce retenue après examen." : "Pièce écartée." };
}

// ── Modération des signalements ─────────────────────────────────────────────

export async function modererSignalement(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim().slice(0, 300);

  const signalement = await prisma.signalement.findUnique({ where: { id } });
  if (!signalement) return { erreur: "Signalement introuvable." };

  const etat = decision === "publier" ? "PUBLIE" : decision === "rejeter" ? "REJETE" : "RETIRE";
  await prisma.signalement.update({
    where: { id },
    data: { moderation: etat, motifModeration: etat === "PUBLIE" ? null : motif || "Non conforme à la charte" },
  });

  await prisma.evenementSignalement.create({
    data: {
      signalementId: id,
      titre: etat === "PUBLIE" ? "Signalement publié" : "Signalement retiré de la publication",
      detail: etat === "PUBLIE" ? "Contrôle de conformité effectué." : motif || "Non conforme à la charte de modération.",
      auteur: "RECOURS_FRANCE",
      etiquette: "MODÉRATION",
    },
  });

  if (signalement.entrepriseId) await recalculerIndices(signalement.entrepriseId).catch(() => undefined);
  await journaliser(admin.id, `signalement.${decision}`, "signalement", id, signalement.reference);
  revalidatePath("/admin/signalements");
  await viderLaFichePublique(id);
  return { succes: true, message: "Décision enregistrée." };
}

/** Déclassement d'un signalement, après contestation établie. */
export async function declasserSignalement(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim().slice(0, 300);
  if (!motif) return { erreur: "Le motif de déclassement est obligatoire." };

  const signalement = await prisma.signalement.findUnique({ where: { id } });
  if (!signalement) return { erreur: "Signalement introuvable." };

  await prisma.signalement.update({
    where: { id },
    data: { niveauVerification: "DECLARE", verifieLe: null, verifiePar: null },
  });
  await prisma.evenementSignalement.create({
    data: {
      signalementId: id,
      titre: "Signalement déclassé",
      detail: `La vérification a été retirée après réexamen : ${motif}`,
      auteur: "RECOURS_FRANCE",
      etiquette: "MODÉRATION",
    },
  });
  if (signalement.entrepriseId) await recalculerIndices(signalement.entrepriseId).catch(() => undefined);
  await journaliser(admin.id, "signalement.declasse", "signalement", id, motif);
  revalidatePath("/admin/signalements");
  return { succes: true, message: "Signalement déclassé." };
}

// ── Modération des avis ─────────────────────────────────────────────────────

export async function modererAvis(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim().slice(0, 300);

  const avis = await prisma.avis.findUnique({ where: { id } });
  if (!avis) return { erreur: "Avis introuvable." };

  const etat = decision === "publier" ? "PUBLIE" : decision === "rejeter" ? "REJETE" : "RETIRE";
  await prisma.avis.update({
    where: { id },
    data: {
      moderation: etat,
      publieLe: etat === "PUBLIE" ? new Date() : null,
      motifModeration: etat === "PUBLIE" ? null : motif || "Non conforme à la charte",
    },
  });

  await journaliser(admin.id, `avis.${decision}`, "avis", id, motif);
  revalidatePath("/admin/avis");
  revalidatePath(`/entreprises`);
  return { succes: true, message: "Décision enregistrée." };
}

// ── Fiches entreprises ──────────────────────────────────────────────────────

export async function resynchroniserFiche(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const siren = String(donnees.get("siren") ?? "").replace(/\D/g, "");
  if (siren.length !== 9) return { erreur: "SIREN invalide." };

  const resultat = await synchroniserEntreprise(siren);
  if (!resultat) return { erreur: "SIREN introuvable dans les registres publics." };
  await recalculerIndices(resultat.entrepriseId).catch(() => undefined);

  await journaliser(admin.id, "entreprise.sync", "entreprise", resultat.entrepriseId, siren);
  revalidatePath("/admin/entreprises");
  const echecs = resultat.sources.filter((s) => s.statut === "erreur");
  return {
    succes: true,
    message: `Fiche synchronisée : ${resultat.evenements} événement(s), ${resultat.etablissements} établissement(s).${
      echecs.length ? ` Sources en échec : ${echecs.map((s) => s.source).join(", ")}.` : ""
    }`,
  };
}

/** Renseigne le site officiel puis relance l'enrichissement (coordonnées, CGV, SAV). */
export async function definirSiteOfficiel(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const site = String(donnees.get("siteWeb") ?? "").trim();

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) return { erreur: "Entreprise introuvable." };

  await prisma.entreprise.update({ where: { id }, data: { siteWeb: site || null } });
  if (site) await synchroniserEntreprise(entreprise.siren, { avecSite: true }).catch(() => undefined);

  await journaliser(admin.id, "entreprise.site", "entreprise", id, site);
  revalidatePath("/admin/entreprises");
  return { succes: true, message: site ? "Site enregistré et enrichissement relancé." : "Site retiré." };
}

// ── Corrections et revendications ───────────────────────────────────────────

export async function traiterCorrection(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  const reponse = String(donnees.get("reponse") ?? "").trim().slice(0, 800);

  const correction = await prisma.correction.findUnique({ where: { id }, include: { entreprise: true } });
  if (!correction) return { erreur: "Demande introuvable." };

  await prisma.correction.update({
    where: { id },
    data: {
      etat: decision === "accepter" ? "ACCEPTEE" : decision === "refuser" ? "REFUSEE" : "EN_COURS",
      reponse: reponse || null,
      traiteLe: new Date(),
      traitePar: admin.nom,
    },
  });

  if (reponse) {
    await envoyerAccuseDemande(
      correction.email,
      decision === "accepter" ? "Correction appliquée" : "Réponse à votre signalement d’erreur",
      reponse,
    ).catch(() => undefined);
  }

  await journaliser(admin.id, `correction.${decision}`, "correction", id, correction.champ);
  revalidatePath("/admin/corrections");
  return { succes: true, message: "Demande traitée." };
}

export async function traiterRevendication(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  const reponse = String(donnees.get("reponse") ?? "").trim().slice(0, 800);

  const revendication = await prisma.revendication.findUnique({ where: { id }, include: { entreprise: true } });
  if (!revendication) return { erreur: "Demande introuvable." };

  await prisma.revendication.update({
    where: { id },
    data: {
      etat: decision === "accepter" ? "ACCEPTEE" : decision === "refuser" ? "REFUSEE" : "EN_COURS",
      reponse: reponse || null,
      traiteLe: new Date(),
      traitePar: admin.nom,
    },
  });

  if (reponse) {
    await envoyerAccuseDemande(
      revendication.emailPro,
      decision === "accepter" ? "Revendication acceptée" : "Réponse à votre demande de revendication",
      reponse,
    ).catch(() => undefined);
  }

  await journaliser(admin.id, `revendication.${decision}`, "revendication", id, revendication.entreprise.denomination);
  revalidatePath("/admin/revendications");
  return { succes: true, message: "Demande traitée." };
}

// ── Suppression d'une pièce après contrôle ──────────────────────────────────

export async function purgerJustificatif(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const piece = await prisma.justificatif.findUnique({
    where: { id },
    select: { cheminStockage: true },
  });
  if (!piece) return { erreur: "Pièce introuvable." };

  await supprimerPiece(piece.cheminStockage);
  await prisma.justificatif.delete({ where: { id } });
  await journaliser(admin.id, "justificatif.purge", "justificatif", id);
  revalidatePath("/admin/justificatifs");
  return { succes: true, message: "Pièce supprimée du stockage." };
}


// ── Contestations ──────────────────────────────────────────────────────────

/**
 * Examen d'une contestation à laquelle le consommateur a répondu.
 *
 * C'est le SEUL cas de contestation qui demande une décision humaine. Ceux où
 * le consommateur se tait sont tranchés par la tâche planifiée, sans personne.
 */
export async function trancherContestation(_precedent: EtatAdmin, donnees: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = String(donnees.get("id") ?? "");
  const retenue = String(donnees.get("_action") ?? "") === "retenir";
  const motif = String(donnees.get("motif") ?? "").trim();

  const contestation = await prisma.contestation.findUnique({
    where: { id },
    include: { signalement: { include: { entreprise: { select: { denomination: true } } } } },
  });
  if (!contestation) return { erreur: "Contestation introuvable." };
  if (contestation.etat !== "PIECE_FOURNIE") {
    return { erreur: "Cette contestation n’attend pas d’examen." };
  }

  const entreprise =
    contestation.signalement.entreprise?.denomination ??
    contestation.signalement.entrepriseLibreNom ??
    "l’entreprise";

  await prisma.contestation.update({
    where: { id },
    data: {
      etat: retenue ? "ACCEPTEE" : "REJETEE",
      trancheeLe: new Date(),
      trancheePar: admin.nom,
      decision: motif || (retenue ? "La pièce n’étaye pas le signalement." : "La pièce étaye le signalement."),
    },
  });

  if (retenue) {
    await prisma.signalement.update({
      where: { id: contestation.signalementId },
      data: { moderation: "RETIRE", motifModeration: motif || "Contestation retenue après examen de la pièce." },
    });
    if (contestation.signalement.entrepriseId) {
      await recalculerIndices(contestation.signalement.entrepriseId).catch(() => undefined);
    }
  }

  await prisma.evenementSignalement.create({
    data: {
      signalementId: contestation.signalementId,
      titre: retenue ? "Signalement retiré après examen" : "Contestation écartée",
      detail: retenue
        ? "La pièce produite n’établit pas la réalité du signalement. Votre dossier personnel reste accessible."
        : "La pièce produite établit la réalité du signalement : il reste publié.",
      auteur: "RECOURS_FRANCE",
      etiquette: "CONTESTATION",
    },
  });

  await envoyerIssueContestation({
    email: contestation.signalement.email,
    prenom: contestation.signalement.prenom ?? "",
    reference: contestation.signalement.reference,
    entreprise,
    maintenu: !retenue,
    motif: retenue ? motif || null : null,
  }).catch(() => undefined);

  await envoyerAccuseDemande(
    contestation.email,
    retenue ? "Contestation retenue" : "Contestation écartée",
    retenue
      ? `Après examen de la pièce produite par le consommateur, votre contestation du dossier ${contestation.signalement.reference} est retenue : le signalement a été retiré de la publication.`
      : `Après examen, la pièce produite par le consommateur établit la réalité du dossier ${contestation.signalement.reference}. Votre contestation est écartée et le signalement reste publié.`,
  ).catch(() => undefined);

  await journaliser(admin.id, retenue ? "contestation.retenue" : "contestation.ecartee", "contestation", id, motif || undefined);
  revalidatePath("/admin/contestations");
  return { succes: true, message: retenue ? "Contestation retenue, signalement retiré." : "Contestation écartée, signalement maintenu." };
}

/**
 * Une décision de modération change la fiche publique, qui est en cache.
 *
 * Publier ou déclasser un signalement sans vider ce cache laisse la fiche
 * mentir pendant vingt-quatre heures — dans un sens comme dans l'autre, et le
 * second est le plus gênant : un signalement retiré resterait affiché.
 */
async function viderLaFichePublique(signalementId: string) {
  try {
    const s = await prisma.signalement.findUnique({
      where: { id: signalementId },
      select: { entreprise: { select: { slug: true } }, boutique: { select: { slug: true } } },
    });
    if (s?.entreprise) revalidatePath(`/entreprises/${s.entreprise.slug}`);
    if (s?.boutique) revalidatePath(`/boutiques/${s.boutique.slug}`);
  } catch {
    // Le cache expire de toute façon ; l'échec ne doit pas faire échouer la
    // décision de modération, qui est déjà écrite.
  }
}
