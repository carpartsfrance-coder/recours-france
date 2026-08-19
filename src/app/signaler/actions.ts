"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { genererReference } from "@/lib/refs";
import { creerJetonSuivi, empreinteIp } from "@/lib/auth";
import { enregistrerPiece, NOMBRE_MAX, validerPiece } from "@/lib/upload";
import { controlerOctets } from "@/lib/controle-pieces";
import { analyserCoherence } from "@/lib/coherence";
import { boutiquePour } from "@/lib/boutiques";
import { mediateurPublie } from "@/lib/mediation";
import { synchroniserEntreprise } from "@/lib/sources";
import { envoyerRecapitulatif } from "@/lib/emails";
import { recalculerIndices } from "@/lib/stats";
import { adressePostale } from "@/lib/format";

export type EtatFormulaire = {
  erreurs?: Record<string, string>;
  message?: string;
  /**
   * Valeurs renvoyées telles que soumises.
   *
   * React 19 réinitialise le formulaire une fois l'action serveur terminée,
   * y compris quand elle renvoie une erreur : sans cela, l'utilisateur voit
   * tout son travail effacé au premier champ oublié. Le formulaire s'en sert
   * pour se repeupler.
   */
  valeurs?: Record<string, string>;
};

/** Ce qu'on renvoie au formulaire pour qu'il puisse se reconstituer. */
function valeursSoumises(brut: Record<string, unknown>): Record<string, string> {
  const valeurs: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(brut)) {
    if (typeof valeur === "string") valeurs[cle] = valeur;
  }
  return valeurs;
}

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
  demande: z.enum(
    ["REMBOURSEMENT_INTEGRAL", "REMBOURSEMENT_PARTIEL", "LIVRAISON", "REPARATION", "REMPLACEMENT", "RESILIATION", "AUTRE"],
    { message: "Indiquez ce que vous demandez au professionnel." },
  ),
  etatProfessionnel: z
    .enum(["AUCUNE_REPONSE", "REPONSE_SANS_SOLUTION", "PROMESSE_NON_TENUE", "REFUS_MOTIVE", "SOLUTION_PARTIELLE"])
    .optional(),
  relances: z.coerce.number().int().min(1).max(3).optional(),
  // Facultatif : jamais publié, il ne nourrit que le récapitulatif et le
  // contexte d'administration. L'exiger revenait à imposer une rédaction pour
  // un contenu invisible.
  resume: z.string().trim().max(600, "Le résumé est limité à 600 caractères.").optional(),
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
    return { erreurs, message: "Certains champs doivent être corrigés avant l’envoi.", valeurs: valeursSoumises(brut) };
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
        valeurs: valeursSoumises(brut),
      };
    }
    let entreprise = await prisma.entreprise.findUnique({ where: { siren }, include: { mediateur: true } });
    if (!entreprise) {
      const resultat = await synchroniserEntreprise(siren);
      if (!resultat) {
        return {
          erreurs: { siren: "Cette entreprise est introuvable dans les registres publics." },
          message: "L’entreprise n’a pas pu être identifiée.",
          valeurs: valeursSoumises(brut),
        };
      }
      entreprise = await prisma.entreprise.findUnique({
        where: { id: resultat.entrepriseId },
        include: { mediateur: true },
      });
    }
    if (!entreprise) return { message: "L’entreprise n’a pas pu être identifiée.", valeurs: valeursSoumises(brut) };

    entrepriseId = entreprise.id;
    entrepriseNom = entreprise.denomination;
    adresseEntreprise = adressePostale(entreprise);
    emailReclamation = entreprise.emailReclamation;
    telephoneReclamation = entreprise.telephoneReclamation;
    // Seul un médiateur relevé dans les CGV de l'entreprise est communiqué :
    // orienter vers un organisme déduit du secteur ferait perdre au
    // consommateur son délai de saisine sur une saisine irrecevable.
    mediateur = mediateurPublie(entreprise);
  } else if (!entrepriseNom || entrepriseNom.length < 2) {
    return {
      erreurs: { entrepriseNom: "Indiquez le nom commercial de l’entreprise." },
      message: "L’entreprise concernée doit être renseignée.",
      valeurs: valeursSoumises(brut),
    };
  }

  // Boutique en ligne : le consommateur a acheté sur un site, pas chez une
  // personne morale dont il ignore le nom. Rattacher la déclaration au domaine
  // évite de l'imputer à une société homonyme, et donne à la déclaration une
  // fiche publique même quand l'exploitant reste inconnu.
  let boutiqueId: string | null = null;
  if (d.mode === "libre" && d.entrepriseSite) {
    const boutique = await boutiquePour(d.entrepriseSite).catch(() => null);
    boutiqueId = boutique?.id ?? null;
  }

  // ── Justificatifs (facultatifs) ────────────────────────────────────────────
  const fichiers = donnees.getAll("justificatifs").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length > NOMBRE_MAX) {
    return {
      erreurs: { justificatifs: `Cinq pièces au maximum par signalement.` },
      message: "Trop de pièces jointes.",
      valeurs: valeursSoumises(brut),
    };
  }
  // Les contrôles ont lieu AVANT la création du signalement : un refus après
  // coup laisserait un dossier créé derrière un message d'erreur.
  const controlesParFichier = new Map<File, { anomalies: string[]; octets: Buffer }>();
  for (const f of fichiers) {
    const erreur = validerPiece(f);
    if (erreur) return { erreurs: { justificatifs: erreur }, message: erreur, valeurs: valeursSoumises(brut) };
    const octets = Buffer.from(await f.arrayBuffer());
    const controle = controlerOctets(octets, f.type);
    if (controle.refus) {
      return { erreurs: { justificatifs: controle.refus }, message: controle.refus, valeurs: valeursSoumises(brut) };
    }
    controlesParFichier.set(f, { anomalies: controle.anomalies, octets });
  }

  const dateFaits = new Date(d.dateFaits);
  if (Number.isNaN(dateFaits.getTime()) || dateFaits.getTime() > Date.now() + 86_400_000) {
    return {
      erreurs: { dateFaits: "La date des faits doit être passée." },
      message: "Date invalide.",
      valeurs: valeursSoumises(brut),
    };
  }

  const montant = d.montant ? Number(d.montant.replace(/[^\d.,]/g, "").replace(",", ".")) : null;
  const enTetes = await headers();

  // ── Création du signalement ────────────────────────────────────────────────
  const reference = await genererReference();
  const signalement = await prisma.signalement.create({
    data: {
      reference,
      entrepriseId,
      boutiqueId,
      entrepriseLibreNom: d.mode === "libre" ? entrepriseNom : null,
      entrepriseLibreSite: d.mode === "libre" ? (d.entrepriseSite?.trim() || null) : null,
      categorie: d.categorie,
      montant: montant && Number.isFinite(montant) && montant > 0 ? montant : null,
      dateFaits,
      contactPrealable: d.contactPrealable,
      demande: d.demande,
      // Ces deux-là n'ont de sens que si le professionnel a déjà été contacté.
      etatProfessionnel: d.contactPrealable === "AUCUN" ? null : (d.etatProfessionnel ?? null),
      relances: d.contactPrealable === "AUCUN" ? null : (d.relances ?? null),
      resume: d.resume || null,
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
    const controle = controlesParFichier.get(fichier);
    const anomalies = [...(controle?.anomalies ?? [])];
    // Étage 2 : purement consultatif. Le résultat n'empêche rien, n'est jamais
    // publié, et sert à conseiller le déposant puis à prioriser un examen.
    const coherence = controle
      ? analyserCoherence({
          octets: controle.octets,
          typeMime: fichier.type,
          entreprise: entrepriseNom,
          dateFaits,
          montant: montant && Number.isFinite(montant) ? montant : null,
        })
      : null;
    // L'empreinte du fichier était calculée sans jamais être interrogée. Un même
    // document redéposé sous une autre identité est le motif de fraude le plus
    // courant — on le signale sans bloquer, un foyer pouvant légitimement
    // partager une facture.
    const dejaVu = await prisma.justificatif.findFirst({
      where: { sommeControle: piece.sommeControle, signalement: { email: { not: d.email } } },
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

  if (fichiers.length) {
    // Constat automatique, immédiat : une pièce est déposée, horodatée, scellée.
    // Aucun examen n'est promis — il n'aura lieu qu'en cas de contestation.
    await prisma.signalement.update({
      where: { id: signalement.id },
      data: { niveauVerification: "PIECE_DEPOSEE" },
    });
    await prisma.evenementSignalement.create({
      data: {
        signalementId: signalement.id,
        titre: "Pièces déposées",
        detail: `${fichiers.length} pièce${fichiers.length > 1 ? "s" : ""} déposée${fichiers.length > 1 ? "s" : ""}, horodatée${fichiers.length > 1 ? "s" : ""} et scellée${fichiers.length > 1 ? "s" : ""}. Les pièces ne sont jamais publiées.`,
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
