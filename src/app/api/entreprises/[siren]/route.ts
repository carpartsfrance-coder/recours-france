import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { statistiquesEntreprise, indicesEntreprise } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * API publique en lecture : données brutes d'une fiche, avec la source et la
 * date de vérification de chaque donnée. Aucune donnée personnelle, aucun texte
 * libre de consommateur n'est exposé.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ siren: string }> }) {
  const { siren: brut } = await params;
  const siren = brut.replace(/\D/g, "");

  const entreprise = await prisma.entreprise.findUnique({
    where: { siren },
    include: {
      etablissements: true,
      evenements: { orderBy: { date: "desc" }, take: 50 },
      comptes: { orderBy: { exercice: "desc" } },
      donnees: true,
      mediateur: true,
    },
  });

  if (!entreprise) {
    return NextResponse.json({ erreur: "Fiche inconnue" }, { status: 404 });
  }

  const [stats, indices] = await Promise.all([
    statistiquesEntreprise(entreprise.id),
    indicesEntreprise(entreprise.id),
  ]);

  return NextResponse.json(
    {
      entreprise: {
        siren: entreprise.siren,
        siretSiege: entreprise.siretSiege,
        denomination: entreprise.denomination,
        enseigne: entreprise.enseigne,
        formeJuridique: entreprise.formeJuridique,
        naf: entreprise.naf,
        nafLibelle: entreprise.nafLibelle,
        secteur: entreprise.secteur,
        dateImmatriculation: entreprise.dateImmatriculation,
        capital: entreprise.capital,
        trancheEffectif: entreprise.trancheEffectif,
        representantLegal: entreprise.representantLegal,
        greffe: entreprise.greffe,
        adresseSiege: entreprise.adresseSiege,
        codePostal: entreprise.codePostal,
        commune: entreprise.commune,
        departement: entreprise.departement,
        etatAdministratif: entreprise.etatAdministratif,
        siteWeb: entreprise.siteWeb,
        emailReclamation: entreprise.emailReclamation,
        telephoneReclamation: entreprise.telephoneReclamation,
      },
      indices: {
        transparence: indices?.transparence.score ?? null,
        experience: indices?.experience.publie ? indices.experience.score : null,
        experiencePubliee: indices?.experience.publie ?? false,
        calculeLe: entreprise.indicesCalculeLe,
      },
      statistiques: {
        fenetre: "12 mois glissants",
        total: stats.total12Mois,
        verifies: stats.verifies,
        nonVerifies: stats.nonVerifies,
        tauxReponseDeclare: stats.tauxReponse,
        tauxResolutionConfirmee: stats.tauxResolution,
        delaiMedianJours: stats.delaiMedian,
        motifs: stats.motifs,
        avertissement:
          "Statistiques calculées sur les seuls signalements vérifiés, à partir de déclarations de consommateurs. Recours France ne transmet pas les réclamations aux professionnels et ne recueille pas leurs réponses.",
      },
      etablissements: entreprise.etablissements.map((e) => ({
        siret: e.siret,
        estSiege: e.estSiege,
        commune: e.commune,
        codePostal: e.codePostal,
        actif: e.actif,
        source: e.source,
        verifieLe: e.verifieLe,
      })),
      evenements: entreprise.evenements.map((e) => ({
        date: e.date,
        source: e.source,
        titre: e.titre,
        detail: e.detail,
        reference: e.reference,
        urlSource: e.urlSource,
        procedureCollective: e.procedureCollective,
      })),
      comptesAnnuels: entreprise.comptes.map((c) => ({
        exercice: c.exercice,
        dateDepot: c.dateDepot,
        confidentiel: c.confidentiel,
        chiffreAffaires: c.chiffreAffaires,
        source: c.source,
      })),
      mediateur: entreprise.mediateur
        ? {
            nom: entreprise.mediateur.nom,
            siteWeb: entreprise.mediateur.siteWeb,
            rattachement: entreprise.mediateurAdhesionDepuis ?? "Présumé d’après le secteur d’activité",
            verifieLe: entreprise.mediateur.verifieLe,
          }
        : null,
      provenance: entreprise.donnees.map((d) => ({
        champ: d.champ,
        source: d.source,
        urlSource: d.urlSource,
        verifieLe: d.verifieLe,
      })),
      synchronisation: {
        sirene: entreprise.syncSirene,
        rne: entreprise.syncRne,
        bodacc: entreprise.syncBodacc,
        mediateurs: entreprise.syncMediateurs,
        siteOfficiel: entreprise.syncSiteOfficiel,
      },
      licence:
        "Données publiques réutilisées depuis Sirene (Insee), le RNE (INPI) et le BODACC (DILA). Recours France est un service privé indépendant, sans mission de service public.",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
