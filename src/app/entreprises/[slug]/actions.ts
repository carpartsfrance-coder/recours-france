"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { envoyerAccuseDemande, envoyerDemandeDePiece } from "@/lib/emails";
import { auteurAnonyme, avecJustificatif} from "@/lib/format";
import { referenceValide } from "@/lib/refs";
import { AVIS_ACTIFS } from "@/lib/config";
import { echeanceDepuis, motifRecevable, DELAI_REPONSE_JOURS } from "@/lib/contestations";
import { creerJetonSuivi } from "@/lib/auth";

export type EtatDemande = { message?: string; erreur?: string; succes?: boolean };

// ── Laisser un avis ─────────────────────────────────────────────────────────

const schemaAvis = z.object({
  slug: z.string().min(1),
  note: z.coerce.number().int().min(1).max(5),
  texte: z
    .string()
    .trim()
    .min(40, "Décrivez votre expérience en quelques lignes (40 caractères minimum).")
    .max(1200, "L’avis est limité à 1 200 caractères."),
  prenom: z.string().trim().min(2, "Indiquez votre prénom."),
  nom: z.string().trim().min(1, "Indiquez au moins l’initiale de votre nom."),
  ville: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse email valide."),
  reference: z.string().trim().optional(),
  charte: z.literal("on", { message: "Vous devez accepter la charte de modération." }),
});

/**
 * Dépôt d'un avis. Un avis n'est « vérifié » que s'il est rattaché à un
 * signalement avec justificatif déposé avec la même adresse email : lui seul entre dans
 * la moyenne publiée.
 */
export async function deposerAvis(_precedent: EtatDemande, donnees: FormData): Promise<EtatDemande> {
  if (!AVIS_ACTIFS) {
    return {
      erreur:
        "Le dépôt d’avis n’est pas ouvert. Vous pouvez signaler un litige : le dossier est publié sous forme structurée, sans texte libre.",
    };
  }
  const analyse = schemaAvis.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Certains champs doivent être corrigés." };
  }
  const d = analyse.data;

  const entreprise = await prisma.entreprise.findUnique({ where: { slug: d.slug } });
  if (!entreprise) return { erreur: "Entreprise inconnue." };

  let signalementId: string | null = null;
  let verifie = false;

  if (d.reference && d.reference.trim()) {
    if (!referenceValide(d.reference)) return { erreur: "La référence de signalement est mal formée (RF-AAAA-MM-NNNNN)." };
    const signalement = await prisma.signalement.findUnique({
      where: { reference: d.reference.trim().toUpperCase() },
    });
    if (!signalement || signalement.email !== d.email) {
      return {
        erreur:
          "Aucun signalement ne correspond à cette référence pour cette adresse email. Vérifiez les deux, ou laissez la référence vide.",
      };
    }
    if (signalement.entrepriseId !== entreprise.id) {
      return { erreur: "Ce signalement ne concerne pas cette entreprise." };
    }
    signalementId = signalement.id;
    verifie = avecJustificatif(signalement.niveauVerification);
  }

  const doublon = await prisma.avis.findFirst({ where: { entrepriseId: entreprise.id, email: d.email } });
  if (doublon) return { erreur: "Un avis a déjà été déposé pour cette entreprise avec cette adresse email." };

  await prisma.avis.create({
    data: {
      entrepriseId: entreprise.id,
      signalementId,
      note: d.note,
      texte: d.texte,
      auteur: auteurAnonyme(d.prenom, d.nom),
      ville: d.ville || null,
      email: d.email,
      verifie,
      moderation: "EN_ATTENTE",
    },
  });

  revalidatePath(`/entreprises/${d.slug}`);
  return {
    succes: true,
    message: verifie
      ? "Merci. Votre avis est rattaché à un signalement avec justificatif : il sera publié après modération et entrera dans la moyenne."
      : "Merci. Votre avis sera publié après modération, signalé comme sans justificatif : il n’entre ni dans la moyenne, ni dans les statistiques.",
  };
}

// ── Signaler une erreur sur une fiche ───────────────────────────────────────

const schemaCorrection = z.object({
  slug: z.string().min(1),
  champ: z.string().trim().min(2, "Indiquez la donnée concernée."),
  valeurActuelle: z.string().trim().max(300).optional(),
  valeurProposee: z.string().trim().max(300).optional(),
  explication: z.string().trim().min(20, "Expliquez l’erreur en quelques lignes.").max(1500),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse email valide."),
  qualite: z.string().trim().max(120).optional(),
});

export async function signalerErreur(_precedent: EtatDemande, donnees: FormData): Promise<EtatDemande> {
  const analyse = schemaCorrection.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Certains champs doivent être corrigés." };
  }
  const d = analyse.data;

  const entreprise = await prisma.entreprise.findUnique({ where: { slug: d.slug } });
  if (!entreprise) return { erreur: "Entreprise inconnue." };

  await prisma.correction.create({
    data: {
      entrepriseId: entreprise.id,
      champ: d.champ,
      valeurActuelle: d.valeurActuelle || null,
      valeurProposee: d.valeurProposee || null,
      explication: d.explication,
      email: d.email,
      qualite: d.qualite || null,
    },
  });

  await envoyerAccuseDemande(
    d.email,
    "Signalement d’erreur enregistré",
    `Votre signalement d’erreur sur la fiche ${entreprise.denomination} (donnée « ${d.champ} ») a bien été enregistré. Il sera examiné par l’équipe données de Recours France.`,
  ).catch(() => undefined);

  return {
    succes: true,
    message:
      "Signalement enregistré. Une donnée inexacte est corrigée sous 15 jours après examen. Une donnée publique erronée doit être rectifiée à la source auprès du registre concerné : la fiche se met à jour à la synchronisation suivante.",
  };
}

// ── Revendiquer une entreprise ──────────────────────────────────────────────

const schemaRevendication = z.object({
  slug: z.string().min(1),
  nomContact: z.string().trim().min(2, "Indiquez votre nom."),
  fonction: z.string().trim().min(2, "Indiquez votre fonction dans l’entreprise."),
  emailPro: z.string().trim().toLowerCase().email("Indiquez un email professionnel valide."),
  telephone: z.string().trim().max(30).optional(),
  siretJustifie: z.string().trim().max(20).optional(),
  message: z.string().trim().max(1500).optional(),
  engagement: z.literal("on", { message: "Vous devez confirmer être habilité à représenter l’entreprise." }),
});

export async function revendiquerEntreprise(
  _precedent: EtatDemande,
  donnees: FormData,
): Promise<EtatDemande> {
  const analyse = schemaRevendication.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Certains champs doivent être corrigés." };
  }
  const d = analyse.data;

  const entreprise = await prisma.entreprise.findUnique({ where: { slug: d.slug } });
  if (!entreprise) return { erreur: "Entreprise inconnue." };

  const enCours = await prisma.revendication.findFirst({
    where: { entrepriseId: entreprise.id, emailPro: d.emailPro, etat: { in: ["EN_ATTENTE", "EN_COURS"] } },
  });
  if (enCours) return { erreur: "Une demande est déjà en cours d’examen pour cette adresse." };

  await prisma.revendication.create({
    data: {
      entrepriseId: entreprise.id,
      nomContact: d.nomContact,
      fonction: d.fonction,
      emailPro: d.emailPro,
      telephone: d.telephone || null,
      siretJustifie: d.siretJustifie || null,
      message: d.message || null,
    },
  });

  await envoyerAccuseDemande(
    d.emailPro,
    "Demande de revendication enregistrée",
    `Votre demande de revendication de la fiche ${entreprise.denomination} a bien été enregistrée. Elle sera examinée sous 15 jours ouvrés. À ce stade, la revendication permet de corriger les données publiques et les coordonnées de service consommateurs : le droit de réponse public aux signalements n’est pas encore ouvert.`,
  ).catch(() => undefined);

  return {
    succes: true,
    message:
      "Demande enregistrée. Nous vous répondons sous 15 jours ouvrés après vérification de votre qualité à représenter l’entreprise.",
  };
}

// ── Suivre une fiche ────────────────────────────────────────────────────────

const schemaSuivi = z.object({
  slug: z.string().min(1),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse email valide."),
});

export async function suivreEntreprise(_precedent: EtatDemande, donnees: FormData): Promise<EtatDemande> {
  const analyse = schemaSuivi.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) return { erreur: "Indiquez une adresse email valide." };
  const d = analyse.data;

  const entreprise = await prisma.entreprise.findUnique({ where: { slug: d.slug } });
  if (!entreprise) return { erreur: "Entreprise inconnue." };

  await prisma.suiviEntreprise.upsert({
    where: { entrepriseId_email: { entrepriseId: entreprise.id, email: d.email } },
    create: { entrepriseId: entreprise.id, email: d.email },
    update: {},
  });

  return {
    succes: true,
    message: `Suivi enregistré. Vous serez alerté lorsqu’un événement légal est publié sur ${entreprise.denomination} ou lorsque son indice de transparence évolue.`,
  };
}


// ── Contester un signalement ───────────────────────────────────────────────

const schemaContestation = z.object({
  slug: z.string().min(1),
  reference: z.string().trim().min(4, "Indiquez la référence du dossier contesté."),
  nom: z.string().trim().min(2, "Indiquez votre nom.").max(120),
  qualite: z.string().trim().min(2, "Indiquez votre fonction dans l’entreprise.").max(120),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse email valide."),
  motif: z.string().trim().max(4000),
});

/**
 * Fonctionnalité gratuite de contestation, imposée par l'article L111-7-2.
 *
 * Elle ne retire rien immédiatement : elle sollicite le consommateur et fait
 * courir un délai. Passé ce délai sans réponse, une tâche planifiée retire le
 * signalement — aucun humain n'arbitre ce cas-là.
 */
export async function contesterSignalement(
  _precedent: EtatDemande,
  donnees: FormData,
): Promise<EtatDemande> {
  const analyse = schemaContestation.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Certains champs doivent être corrigés." };
  }
  const d = analyse.data;

  const refus = motifRecevable(d.motif);
  if (refus) return { erreur: refus };

  const entreprise = await prisma.entreprise.findUnique({ where: { slug: d.slug } });
  if (!entreprise) return { erreur: "Entreprise inconnue." };

  const signalement = await prisma.signalement.findUnique({
    where: { reference: d.reference.trim().toUpperCase() },
  });
  // Réponse volontairement identique quand la référence est inconnue ou porte
  // sur une autre entreprise : sans cela, le formulaire deviendrait un moyen de
  // tester l'existence de dossiers.
  if (!signalement || signalement.entrepriseId !== entreprise.id) {
    return { erreur: "Aucun dossier publié ne correspond à cette référence pour cette entreprise." };
  }
  if (signalement.moderation !== "PUBLIE") {
    return { erreur: "Ce dossier n’est plus publié." };
  }

  const enCours = await prisma.contestation.findFirst({
    where: { signalementId: signalement.id, etat: { in: ["OUVERTE", "PIECE_DEMANDEE", "PIECE_FOURNIE"] } },
  });
  if (enCours) {
    return { erreur: "Une contestation est déjà en cours sur ce dossier. Elle suit son délai." };
  }

  const maintenant = new Date();
  const contestation = await prisma.contestation.create({
    data: {
      signalementId: signalement.id,
      email: d.email,
      nom: d.nom ?? "",
      qualite: d.qualite,
      motif: d.motif,
      etat: "PIECE_DEMANDEE",
      pieceDemandeeLe: maintenant,
      echeanceReponse: echeanceDepuis(maintenant),
    },
  });

  // Le consommateur est sollicité tout de suite : le délai court à partir de
  // l'envoi, pas de la prochaine exécution d'une tâche planifiée.
  try {
    const jeton = await creerJetonSuivi(signalement.id, signalement.email);
    await envoyerDemandeDePiece({
      email: signalement.email,
      prenom: signalement.prenom ?? "",
      reference: signalement.reference,
      entreprise: entreprise.denomination,
      jeton,
      echeance: contestation.echeanceReponse!,
    });
  } catch {
    // L'échec d'envoi ne doit pas faire échouer la contestation : la tâche
    // planifiée relancera la sollicitation tant que l'échéance n'est pas passée.
  }

  await prisma.evenementSignalement.create({
    data: {
      signalementId: signalement.id,
      titre: "Contestation reçue",
      detail: `L’entreprise conteste ce signalement. Une pièce vous est demandée sous ${DELAI_REPONSE_JOURS} jours.`,
      auteur: "RECOURS_FRANCE",
      etiquette: "CONTESTATION",
    },
  });

  await envoyerAccuseDemande(
    d.email,
    "Contestation enregistrée",
    `Votre contestation du dossier ${signalement.reference} est enregistrée. Le consommateur dispose de ${DELAI_REPONSE_JOURS} jours pour produire sa pièce justificative. Sans réponse de sa part dans ce délai, le signalement est retiré automatiquement. S’il répond, sa pièce est examinée et le signalement retiré si elle ne l’étaye pas.`,
  ).catch(() => undefined);

  revalidatePath(`/entreprises/${d.slug}`);
  return {
    succes: true,
    message: `Contestation enregistrée. Le consommateur a ${DELAI_REPONSE_JOURS} jours pour produire sa pièce. Sans réponse, le signalement est retiré automatiquement. Vous serez informé de l’issue par email.`,
  };
}
