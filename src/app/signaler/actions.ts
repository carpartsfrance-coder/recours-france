"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { genererReference } from "@/lib/refs";
import { creerJetonSuivi, empreinteIp } from "@/lib/auth";
import { enregistrerPiece, NOMBRE_MAX, validerPiece } from "@/lib/upload";
import { synchroniserEntreprise } from "@/lib/sources";
import { envoyerRecapitulatif } from "@/lib/emails";
import { recalculerIndices } from "@/lib/stats";
import { adressePostale } from "@/lib/format";

export type EtatFormulaire = {
  erreurs?: Record<string, string>;
  message?: string;
};

const schema = z.object({
  mode: z.enum(["annuaire", "libre"]),
  siren: z.string().optional(),
  entrepriseNom: z.string().optional(),
  entrepriseSite: z.string().optional(),
  categorie: z.enum(["REMBOURSEMENT", "LIVRAISON", "GARANTIE", "SAV", "RESILIATION", "AUTRE"], {
    message: "Choisissez la catégorie du litige.",
  }),
  montant: z.string().optional(),
  dateFaits: z.string().min(1, "Indiquez la date des faits."),
  contactPrealable: z.enum(["ECRIT", "TELEPHONE", "AUCUN"], {
    message: "Indiquez si vous avez déjà contacté l’entreprise.",
  }),
  resume: z
    .string()
    .trim()
    .min(30, "Décrivez les faits en quelques lignes (30 caractères minimum).")
    .max(600, "Le résumé est limité à 600 caractères."),
  prenom: z.string().trim().min(2, "Indiquez votre prénom."),
  nom: z.string().trim().min(2, "Indiquez votre nom."),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse email valide."),
  certifie: z.literal("on", { message: "Vous devez certifier l’exactitude des faits déclarés." }),
  consentement: z.literal("on", {
    message: "Votre accord est nécessaire pour publier les données structurées anonymisées.",
  }),
});

export async function deposerSignalement(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const brut = Object.fromEntries(donnees.entries()) as Record<string, string>;
  const analyse = schema.safeParse(brut);

  if (!analyse.success) {
    const erreurs: Record<string, string> = {};
    for (const issue of analyse.error.issues) {
      const champ = String(issue.path[0] ?? "global");
      if (!erreurs[champ]) erreurs[champ] = issue.message;
    }
    return { erreurs, message: "Certains champs doivent être corrigés avant l’envoi." };
  }

  const d = analyse.data;

  // ── Entreprise concernée ───────────────────────────────────────────────────
  let entrepriseId: string | null = null;
  let entrepriseNom = d.entrepriseNom?.trim() ?? "";
  let adresseEntreprise: string | null = null;
  let emailReclamation: string | null = null;
  let telephoneReclamation: string | null = null;
  let mediateur: { nom: string; delaiInstruction: string | null; siteWeb: string | null } | null = null;

  if (d.mode === "annuaire") {
    const siren = (d.siren ?? "").replace(/\D/g, "");
    if (siren.length !== 9) {
      return {
        erreurs: { siren: "Sélectionnez une entreprise dans l’annuaire, ou saisissez-la vous-même." },
        message: "L’entreprise concernée n’a pas été sélectionnée.",
      };
    }
    let entreprise = await prisma.entreprise.findUnique({ where: { siren }, include: { mediateur: true } });
    if (!entreprise) {
      const resultat = await synchroniserEntreprise(siren);
      if (!resultat) {
        return {
          erreurs: { siren: "Cette entreprise est introuvable dans les registres publics." },
          message: "L’entreprise n’a pas pu être identifiée.",
        };
      }
      entreprise = await prisma.entreprise.findUnique({
        where: { id: resultat.entrepriseId },
        include: { mediateur: true },
      });
    }
    if (!entreprise) return { message: "L’entreprise n’a pas pu être identifiée." };

    entrepriseId = entreprise.id;
    entrepriseNom = entreprise.denomination;
    adresseEntreprise = adressePostale(entreprise);
    emailReclamation = entreprise.emailReclamation;
    telephoneReclamation = entreprise.telephoneReclamation;
    mediateur = entreprise.mediateur
      ? {
          nom: entreprise.mediateur.nom,
          delaiInstruction: entreprise.mediateur.delaiInstruction,
          siteWeb: entreprise.mediateur.siteWeb,
        }
      : null;
  } else if (!entrepriseNom || entrepriseNom.length < 2) {
    return {
      erreurs: { entrepriseNom: "Indiquez le nom commercial de l’entreprise." },
      message: "L’entreprise concernée doit être renseignée.",
    };
  }

  // ── Justificatifs (facultatifs) ────────────────────────────────────────────
  const fichiers = donnees.getAll("justificatifs").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length > NOMBRE_MAX) {
    return {
      erreurs: { justificatifs: `Cinq pièces au maximum par signalement.` },
      message: "Trop de pièces jointes.",
    };
  }
  for (const f of fichiers) {
    const erreur = validerPiece(f);
    if (erreur) return { erreurs: { justificatifs: erreur }, message: erreur };
  }

  const dateFaits = new Date(d.dateFaits);
  if (Number.isNaN(dateFaits.getTime()) || dateFaits.getTime() > Date.now() + 86_400_000) {
    return { erreurs: { dateFaits: "La date des faits doit être passée." }, message: "Date invalide." };
  }

  const montant = d.montant ? Number(d.montant.replace(/[^\d.,]/g, "").replace(",", ".")) : null;
  const enTetes = await headers();

  // ── Création du signalement ────────────────────────────────────────────────
  const reference = await genererReference();
  const signalement = await prisma.signalement.create({
    data: {
      reference,
      entrepriseId,
      entrepriseLibreNom: d.mode === "libre" ? entrepriseNom : null,
      entrepriseLibreSite: d.mode === "libre" ? (d.entrepriseSite?.trim() || null) : null,
      categorie: d.categorie,
      montant: montant && Number.isFinite(montant) && montant > 0 ? montant : null,
      dateFaits,
      contactPrealable: d.contactPrealable,
      resume: d.resume,
      prenom: d.prenom,
      nom: d.nom,
      email: d.email,
      certifie: true,
      consentement: true,
      niveauVerification: "DECLARE",
      statut: "EN_COURS",
      ipHash: empreinteIp(enTetes.get("x-forwarded-for")?.split(",")[0] ?? null),
      userAgent: enTetes.get("user-agent")?.slice(0, 250) ?? null,
    },
  });

  await prisma.evenementSignalement.create({
    data: {
      signalementId: signalement.id,
      titre: "Signalement créé",
      detail: `Catégorie ${d.categorie.toLowerCase()}, faits du ${dateFaits.toLocaleDateString("fr-FR")}.`,
      auteur: "CONSOMMATEUR",
      etiquette: "CONSOMMATEUR",
    },
  });

  for (const fichier of fichiers) {
    const piece = await enregistrerPiece(fichier, reference);
    await prisma.justificatif.create({ data: { ...piece, signalementId: signalement.id } });
  }

  if (fichiers.length) {
    await prisma.evenementSignalement.create({
      data: {
        signalementId: signalement.id,
        titre: "Pièces déposées",
        detail: `${fichiers.length} pièce${fichiers.length > 1 ? "s" : ""} en attente de contrôle. Les pièces ne sont jamais publiées.`,
        auteur: "CONSOMMATEUR",
        etiquette: "CONSOMMATEUR",
      },
    });
  }

  const jeton = await creerJetonSuivi(signalement.id, d.email);

  if (entrepriseId) await recalculerIndices(entrepriseId).catch(() => undefined);

  await envoyerRecapitulatif({
    reference,
    email: d.email,
    prenom: d.prenom,
    nom: d.nom,
    entreprise: entrepriseNom,
    adresseEntreprise,
    emailReclamation,
    telephoneReclamation,
    categorie: d.categorie,
    montant: montant && Number.isFinite(montant) ? montant : null,
    dateFaits,
    contactPrealable: d.contactPrealable,
    verifie: false,
    jeton,
    mediateur,
  }).catch((e) => console.error("[mail] récapitulatif non envoyé", e));

  redirect(`/signaler/confirmation/${jeton}`);
}
