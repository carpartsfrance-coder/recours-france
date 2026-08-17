import { prisma } from "@/lib/db";
import { indicesEntreprise } from "@/lib/stats";
import { genererPdf } from "@/lib/pdf";
import { formatDate, formatMontant, formatSiren, formatSiret, libelleEffectif } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Fiche entreprise au format PDF : données publiques et indicateurs, avec leurs sources. */
export async function GET(_requete: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({
    where: { slug },
    include: {
      comptes: { orderBy: { exercice: "desc" } },
      evenements: { orderBy: { date: "desc" }, take: 15 },
      mediateur: true,
    },
  });
  if (!entreprise) return new Response("Fiche inconnue", { status: 404 });

  const calcul = await indicesEntreprise(entreprise.id);
  const stats = calcul?.stats;

  const pdf = genererPdf({
    titre: entreprise.denomination,
    sousTitre: `Fiche Recours France — SIREN ${formatSiren(entreprise.siren)} — editee le ${formatDate(new Date())}`,
    piedDePage: "Recours France — donnees publiques Sirene, RNE/INPI et BODACC",
    blocs: [
      { type: "filet" },
      { type: "titre", texte: "Identite legale" },
      { type: "cle-valeur", cle: "Denomination", valeur: entreprise.denomination },
      ...(entreprise.enseigne ? [{ type: "cle-valeur" as const, cle: "Enseigne", valeur: entreprise.enseigne }] : []),
      { type: "cle-valeur", cle: "SIREN", valeur: formatSiren(entreprise.siren) },
      { type: "cle-valeur", cle: "SIRET du siege", valeur: formatSiret(entreprise.siretSiege) },
      { type: "cle-valeur", cle: "Forme juridique", valeur: entreprise.formeJuridique ?? "non renseignee" },
      {
        type: "cle-valeur",
        cle: "Activite (NAF)",
        valeur: entreprise.naf ? `${entreprise.naf} ${entreprise.nafLibelle ?? ""}`.trim() : "non renseignee",
      },
      { type: "cle-valeur", cle: "Immatriculation", valeur: formatDate(entreprise.dateImmatriculation) },
      {
        type: "cle-valeur",
        cle: "Capital social",
        valeur: entreprise.capital ? formatMontant(Number(entreprise.capital)) : "non publie",
      },
      { type: "cle-valeur", cle: "Effectif declare", valeur: libelleEffectif(entreprise.trancheEffectif) },
      { type: "cle-valeur", cle: "Representant legal", valeur: entreprise.representantLegal ?? "non publie" },
      { type: "cle-valeur", cle: "Adresse du siege", valeur: entreprise.adresseSiege ?? "non renseignee" },
      {
        type: "cle-valeur",
        cle: "Etat administratif",
        valeur: entreprise.etatAdministratif === "ACTIVE" ? "en activite" : "cessee",
      },
      { type: "petit", texte: `Source : Sirene (Insee), RNE (INPI). Synchronise le ${formatDate(entreprise.syncSirene)}.` },

      { type: "filet" },
      { type: "titre", texte: "Indice de transparence" },
      {
        type: "cle-valeur",
        cle: "Indice de transparence",
        valeur: `${calcul?.transparence.score ?? "—"} / 100`,
      },
      ...(calcul?.transparence.criteres ?? []).map((c) => ({
        type: "cle-valeur" as const,
        cle: c.libelle,
        valeur: c.valeur,
      })),
      {
        type: "petit",
        texte:
          "Calcule uniquement a partir des registres publics. Aucune donnee declarative n'entre dans cet indice.",
      },

      { type: "filet" },
      { type: "titre", texte: "Signalements consommateurs (12 mois glissants)" },
      { type: "cle-valeur", cle: "Signalements", valeur: String(stats?.total12Mois ?? 0) },
      { type: "cle-valeur", cle: "dont verifies", valeur: String(stats?.verifies ?? 0) },
      {
        type: "cle-valeur",
        cle: "Reponse declaree",
        valeur: stats?.tauxReponse === null || stats === undefined ? "—" : `${Math.round(stats.tauxReponse)} %`,
      },
      {
        type: "cle-valeur",
        cle: "Resolution confirmee",
        valeur: stats?.tauxResolution === null || stats === undefined ? "—" : `${Math.round(stats.tauxResolution)} %`,
      },
      {
        type: "cle-valeur",
        cle: "Delai median declare",
        valeur: stats?.delaiMedian === null || stats === undefined ? "—" : `${stats.delaiMedian} jours`,
      },
      {
        type: "cle-valeur",
        cle: "Score d'experience",
        valeur: calcul?.experience.publie ? `${calcul.experience.score} / 100` : "non publie (donnees insuffisantes)",
      },
      {
        type: "petit",
        texte:
          "Statistiques calculees sur les seuls signalements verifies, a partir de declarations de consommateurs. Une resolution n'est comptee qu'apres confirmation du consommateur. Recours France ne transmet pas les reclamations aux professionnels et ne recueille pas leurs reponses.",
      },

      ...(entreprise.comptes.length
        ? [
            { type: "filet" as const },
            { type: "titre" as const, texte: "Comptes annuels" },
            ...entreprise.comptes.slice(0, 6).map((c) => ({
              type: "cle-valeur" as const,
              cle: `Exercice ${c.exercice}`,
              valeur: `${c.dateDepot ? `depose le ${formatDate(c.dateDepot)}` : "depot non trouve"}${
                c.confidentiel ? " (confidentiel)" : ""
              }${c.chiffreAffaires ? ` — CA ${formatMontant(Number(c.chiffreAffaires))}` : ""}`,
            })),
          ]
        : []),

      ...(entreprise.evenements.length
        ? [
            { type: "filet" as const },
            { type: "titre" as const, texte: "Evenements enregistres" },
            ...entreprise.evenements.map((e) => ({
              type: "puce" as const,
              texte: `${formatDate(e.date)} — ${e.titre} (${e.source})${e.detail ? ` : ${e.detail}` : ""}`,
            })),
          ]
        : []),

      ...(entreprise.mediateur
        ? [
            { type: "filet" as const },
            { type: "titre" as const, texte: "Mediateur de la consommation" },
            { type: "cle-valeur" as const, cle: "Mediateur", valeur: entreprise.mediateur.nom },
            {
              type: "cle-valeur" as const,
              cle: "Rattachement",
              valeur: entreprise.mediateurAdhesionDepuis ?? "presume d'apres le secteur d'activite",
            },
          ]
        : []),

      { type: "filet" },
      {
        type: "petit",
        texte:
          "Recours France est un service prive independant. Il n'est ni un service de l'Etat, ni une autorite administrative. Les donnees publiques sont reutilisees telles que publiees par les registres.",
      },
    ],
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recours-france-${entreprise.siren}.pdf"`,
    },
  });
}
