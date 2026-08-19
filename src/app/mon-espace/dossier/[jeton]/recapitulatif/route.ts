import { prisma } from "@/lib/db";
import { resoudreJetonSuivi } from "@/lib/auth";
import { genererPdf } from "@/lib/pdf";
import { construireGuide, type Categorie, type ContactPrealable } from "@/lib/demarches";
import { adressePostale, formatDateLongue, formatMontant, LIBELLES_CATEGORIE, LIBELLES_STATUT, avecJustificatif} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Récapitulatif du signalement au format PDF, réutilisable en médiation. */
export async function GET(_requete: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) return new Response("Lien invalide ou expiré", { status: 404 });

  const signalement = await prisma.signalement.findUnique({
    where: { id: acces.signalement.id },
    include: {
      entreprise: { include: { mediateur: true } },
      justificatifs: true,
      evenements: { orderBy: { date: "asc" } },
    },
  });
  if (!signalement) return new Response("Signalement introuvable", { status: 404 });

  const entreprise = signalement.entreprise;
  const nomEntreprise = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "Entreprise non identifiée";
  const verifie = avecJustificatif(signalement.niveauVerification);

  const guide = construireGuide({
    categorie: signalement.categorie as Categorie,
    contactPrealable: signalement.contactPrealable as ContactPrealable,
    dateSignalement: signalement.creeLe,
    reference: signalement.reference,
    verifie,
    mediateur: entreprise?.mediateur ?? null,
  });

  const pdf = genererPdf({
    titre: `Signalement ${signalement.reference}`,
    sousTitre: `${LIBELLES_CATEGORIE[signalement.categorie]} — ${nomEntreprise}`,
    piedDePage: "Recours France — service prive independant, sans mission de service public",
    blocs: [
      { type: "filet" },
      { type: "titre", texte: "Identification du signalement" },
      { type: "cle-valeur", cle: "Reference", valeur: signalement.reference },
      { type: "cle-valeur", cle: "Entreprise", valeur: nomEntreprise },
      ...(entreprise?.siren ? [{ type: "cle-valeur" as const, cle: "SIREN", valeur: entreprise.siren }] : []),
      ...(entreprise?.adresseSiege
        ? [
            {
              type: "cle-valeur" as const,
              cle: "Siege social",
              valeur: adressePostale(entreprise) ?? "",
            },
          ]
        : []),
      ...(entreprise?.emailReclamation
        ? [{ type: "cle-valeur" as const, cle: "Service consommateurs", valeur: entreprise.emailReclamation }]
        : []),
      { type: "cle-valeur", cle: "Categorie", valeur: LIBELLES_CATEGORIE[signalement.categorie] },
      {
        type: "cle-valeur",
        cle: "Montant declare",
        valeur: signalement.montant ? formatMontant(Number(signalement.montant)) : "non declare",
      },
      { type: "cle-valeur", cle: "Date des faits", valeur: formatDateLongue(signalement.dateFaits) },
      { type: "cle-valeur", cle: "Depose le", valeur: formatDateLongue(signalement.creeLe) },
      { type: "cle-valeur", cle: "Niveau de verification", valeur: verifie ? "Verifie (justificatif controle)" : "Declare" },
      { type: "cle-valeur", cle: "Statut declare", valeur: LIBELLES_STATUT[signalement.statut] },
      {
        type: "cle-valeur",
        cle: "Reponse declaree",
        valeur: signalement.reponseDeclaree ? "oui, selon le consommateur" : "non renseignee",
      },
      {
        type: "cle-valeur",
        cle: "Resolution",
        valeur: signalement.resolutionConfirmee ? "confirmee par le consommateur" : "non confirmee",
      },
      { type: "cle-valeur", cle: "Consommateur", valeur: `${signalement.prenom} ${signalement.nom}` },
      { type: "cle-valeur", cle: "Contact", valeur: signalement.email },
      { type: "cle-valeur", cle: "Pieces deposees", valeur: String(signalement.justificatifs.length) },

      { type: "filet" },
      { type: "titre", texte: "Faits declares" },
      {
        type: "paragraphe",
        texte:
          signalement.resume ??
          "Aucun recit libre n'a ete saisi. Les elements structures ci-dessus decrivent le litige.",
      },
      {
        type: "petit",
        texte:
          "Ce resume est declare par le consommateur. Il n'est pas publie sur la fiche de l'entreprise : seules les donnees structurees le sont.",
      },

      { type: "filet" },
      { type: "titre", texte: "Demarches, dans l'ordre" },
      ...guide.etapes.flatMap((e) => [
        { type: "soustitre" as const, texte: `${e.numero}. ${e.titre} (${e.delai})` },
        { type: "paragraphe" as const, texte: e.description },
      ]),

      { type: "filet" },
      { type: "titre", texte: "Preuves a conserver" },
      ...guide.preuves.map((p) => ({ type: "puce" as const, texte: `${p.intitule} — ${p.utilite}` })),

      { type: "filet" },
      { type: "titre", texte: "Delais utiles" },
      ...guide.delaisUtiles.map((d) => ({ type: "cle-valeur" as const, cle: d.libelle, valeur: d.valeur })),

      ...(entreprise?.mediateur
        ? [
            { type: "filet" as const },
            { type: "titre" as const, texte: "Mediateur de la consommation" },
            { type: "cle-valeur" as const, cle: "Mediateur", valeur: entreprise.mediateur.nom },
            {
              type: "cle-valeur" as const,
              cle: "Delai d'instruction",
              valeur: entreprise.mediateur.delaiInstruction ?? "90 jours",
            },
            { type: "cle-valeur" as const, cle: "Cout", valeur: entreprise.mediateur.coutConsommateur ?? "Gratuit" },
            ...(entreprise.mediateur.siteWeb
              ? [{ type: "cle-valeur" as const, cle: "Site", valeur: entreprise.mediateur.siteWeb }]
              : []),
          ]
        : []),

      { type: "filet" },
      { type: "titre", texte: "Historique" },
      ...signalement.evenements.map((e) => ({
        type: "puce" as const,
        texte: `${formatDateLongue(e.date)} — ${e.titre}${e.detail ? ` : ${e.detail}` : ""}`,
      })),

      { type: "filet" },
      {
        type: "petit",
        texte:
          "Recours France structure le signalement et indique les demarches disponibles. La plateforme ne transmet pas la reclamation au professionnel, n'envoie aucun courrier, ne negocie pas le litige, ne recueille pas la reponse du professionnel et ne delivre pas de conseil juridique personnalise. Les statuts et delais indiques sont declares par le consommateur.",
      },
    ],
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recours-france-${signalement.reference}.pdf"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
