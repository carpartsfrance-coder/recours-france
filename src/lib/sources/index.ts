/**
 * Orchestrateur des sources publiques.
 * Point d'entrée unique pour créer ou rafraîchir une fiche entreprise à partir
 * des registres officiels, en conservant pour chaque donnée sa source et sa
 * date de vérification.
 */
import { prisma } from "../db";
import { slugEntreprise } from "../format";
import { libelleNaf, secteurDepuisNaf } from "../referentiels/naf";
import { familleJuridique } from "../referentiels/natures-juridiques";
import * as recherche from "./recherche-entreprises";
import * as bodacc from "./bodacc";
import * as inpi from "./inpi";
import * as sirene from "./sirene";
import * as mediateurs from "./mediateurs";
import * as siteOfficiel from "./site-officiel";
import { detecterSite } from "./detection-site";
import { ADHESION_DECLAREE } from "../mediation";
import type { Prisma, Source } from "@prisma/client";

export type ResultatSync = {
  siren: string;
  entrepriseId: string;
  cree: boolean;
  sources: { source: string; statut: "ok" | "inactif" | "erreur" | "ignore"; message?: string }[];
  evenements: number;
  etablissements: number;
};

/** Journalise la provenance d'un champ (règle métier n° 6). */
async function enregistrerDonnees(
  entrepriseId: string,
  source: Source,
  champs: Record<string, unknown>,
  urlSource?: string | null,
) {
  const maintenant = new Date();
  const entrees = Object.entries(champs).filter(([, v]) => v !== null && v !== undefined && v !== "");
  for (const [champ, valeur] of entrees) {
    const texte =
      valeur instanceof Date
        ? valeur.toISOString().slice(0, 10)
        : typeof valeur === "object"
          ? JSON.stringify(valeur)
          : String(valeur);
    await prisma.donneeSource.upsert({
      where: { entrepriseId_champ: { entrepriseId, champ } },
      create: { entrepriseId, champ, valeur: texte, source, urlSource: urlSource ?? null, verifieLe: maintenant },
      update: { valeur: texte, source, urlSource: urlSource ?? null, verifieLe: maintenant, collecteLe: maintenant },
    });
  }
}

/**
 * Crée ou met à jour la fiche d'une entreprise à partir de son SIREN.
 * Une source indisponible n'interrompt pas la synchronisation : la fiche est
 * construite avec ce qui est effectivement disponible.
 */
export async function synchroniserEntreprise(
  sirenBrut: string,
  options: { avecSite?: boolean } = {},
): Promise<ResultatSync | null> {
  const siren = sirenBrut.replace(/\D/g, "");
  if (siren.length !== 9) return null;

  const journal: ResultatSync["sources"] = [];
  const maintenant = new Date();

  // ── 1. Socle d'identité : API Recherche d'entreprises (Insee/DINUM) ───────
  let base: recherche.ResultatRecherche | null = null;
  try {
    base = await recherche.parSirenMemeMasque(siren);
    journal.push({ source: "recherche-entreprises", statut: base ? "ok" : "erreur", message: base ? undefined : "SIREN introuvable" });
  } catch (e) {
    journal.push({ source: "recherche-entreprises", statut: "erreur", message: String(e) });
  }
  if (!base) return null;

  // Opposition à la diffusion : la fiche ne doit pas exister. Si elle a été
  // créée avant que l'entreprise n'exerce son droit, on la retire ici. Les
  // signalements survivent (relation en SetNull) : c'est la fiche publique
  // qu'on supprime, pas les dossiers des consommateurs.
  if (!recherche.estDiffusible(base)) {
    const retiree = await prisma.entreprise.deleteMany({ where: { siren } });
    journal.push({
      source: "recherche-entreprises",
      statut: "ignore",
      message: retiree.count
        ? "Opposition à la diffusion : fiche retirée."
        : "Opposition à la diffusion : aucune fiche créée.",
    });
    return null;
  }

  const champs = recherche.versEntreprise(base);
  // Une dénomination vide signe un entrepreneur individuel : l'identité est
  // celle d'une personne physique, et elle n'a rien à faire sur une fiche
  // publique intitulée « avis, problèmes, litiges ». Le garde-fou est posé ici,
  // au point de création, pour qu'aucune source future ne le contourne.
  if (!champs.denomination) return null;
  if (!champs.formeJuridique) champs.formeJuridique = familleJuridique(champs.categorieJuridique);

  const existante = await prisma.entreprise.findUnique({ where: { siren } });
  const slug = existante?.slug ?? slugEntreprise(champs.denomination, siren);

  const donnees: Prisma.EntrepriseUncheckedCreateInput = {
    ...champs,
    slug,
    syncSirene: maintenant,
  };

  const entreprise = await prisma.entreprise.upsert({
    where: { siren },
    create: donnees,
    update: { ...champs, syncSirene: maintenant },
  });

  await enregistrerDonnees(entreprise.id, "SIRENE", {
    denomination: champs.denomination,
    enseigne: champs.enseigne,
    siretSiege: champs.siretSiege,
    formeJuridique: champs.formeJuridique,
    naf: champs.naf,
    dateImmatriculation: champs.dateImmatriculation,
    trancheEffectif: champs.trancheEffectif,
    adresseSiege: champs.adresseSiege,
    etatAdministratif: champs.etatAdministratif,
    numeroTva: champs.numeroTva,
    representantLegal: champs.representantLegal,
  });

  // ── 2. Établissements ────────────────────────────────────────────────────
  let etablissements = recherche.versEtablissements(base);
  if (sirene.sireneConfigure()) {
    try {
      const complets = await sirene.etablissementsParSiren(siren);
      if (complets.length) etablissements = complets;
      journal.push({ source: "sirene", statut: "ok" });
    } catch (e) {
      journal.push({ source: "sirene", statut: "erreur", message: String(e) });
    }
  } else {
    journal.push({ source: "sirene", statut: "inactif", message: "SIRENE_API_KEY absente" });
  }

  for (const e of etablissements) {
    await prisma.etablissement.upsert({
      where: { siret: e.siret },
      create: { ...e, entrepriseId: entreprise.id, source: "SIRENE", verifieLe: maintenant },
      update: { ...e, entrepriseId: entreprise.id, verifieLe: maintenant },
    });
  }

  // ── 3. BODACC : événements, dépôts de comptes, procédures collectives ────
  let nbEvenements = 0;
  let procedureCollective = false;
  try {
    const annonces = await bodacc.annoncesParSiren(siren);
    const evenements = bodacc.versEvenements(annonces);
    procedureCollective = bodacc.aProcedureCollective(evenements);

    for (const ev of evenements) {
      await prisma.evenement.upsert({
        where: {
          entrepriseId_source_reference: {
            entrepriseId: entreprise.id,
            source: "BODACC",
            reference: ev.reference,
          },
        },
        create: { ...ev, entrepriseId: entreprise.id, source: "BODACC" },
        update: { titre: ev.titre, detail: ev.detail, date: ev.date, urlSource: ev.urlSource },
      });
      nbEvenements++;
    }

    for (const d of bodacc.versDepotsComptes(annonces)) {
      await prisma.compteAnnuel.upsert({
        where: { entrepriseId_exercice: { entrepriseId: entreprise.id, exercice: d.exercice } },
        create: { ...d, entrepriseId: entreprise.id, source: "BODACC", verifieLe: maintenant },
        update: { ...d, verifieLe: maintenant },
      });
    }

    await prisma.entreprise.update({ where: { id: entreprise.id }, data: { syncBodacc: maintenant } });
    journal.push({ source: "bodacc", statut: "ok" });
  } catch (e) {
    journal.push({ source: "bodacc", statut: "erreur", message: String(e) });
  }

  /**
   * Chiffres agrégés publiés par l'API (issus des dépôts).
   *
   * Le dépôt confidentiel l'emporte sur le chiffre. Quand le BODACC annonce
   * une déclaration de confidentialité au titre de l'article L. 232-25, la
   * société a expressément demandé que ses comptes ne soient pas communiqués :
   * qu'une autre source en laisse filtrer un poste ne rouvre pas ce droit, et
   * le publier irait contre la volonté qu'elle a fait enregistrer.
   */
  const confidentiels = new Set(
    (await prisma.compteAnnuel.findMany({
      where: { entrepriseId: entreprise.id, confidentiel: true },
      select: { exercice: true },
    })).map((c) => c.exercice),
  );

  for (const c of recherche.versComptes(base)) {
    if (confidentiels.has(c.exercice)) continue;
    await prisma.compteAnnuel.upsert({
      where: { entrepriseId_exercice: { entrepriseId: entreprise.id, exercice: c.exercice } },
      create: {
        entrepriseId: entreprise.id,
        exercice: c.exercice,
        chiffreAffaires: c.chiffreAffaires ?? undefined,
        resultatNet: c.resultatNet ?? undefined,
        source: "RNE",
        verifieLe: maintenant,
      },
      update: {
        chiffreAffaires: c.chiffreAffaires ?? undefined,
        resultatNet: c.resultatNet ?? undefined,
        verifieLe: maintenant,
      },
    });
  }

  // ── 4. RNE / INPI : capital, dirigeants, greffe, actes ───────────────────
  if (inpi.inpiConfigure()) {
    try {
      const rne = await inpi.parSiren(siren);
      if (rne) {
        const misAJour = {
          capital: rne.capital ?? undefined,
          devise: rne.devise ?? undefined,
          greffe: rne.greffe ?? undefined,
          representantLegal: rne.representantLegal ?? undefined,
          formeJuridique: rne.formeJuridique ?? undefined,
          enseigne: rne.nomCommercial ?? undefined,
          syncRne: maintenant,
        };
        await prisma.entreprise.update({ where: { id: entreprise.id }, data: misAJour });
        await enregistrerDonnees(entreprise.id, "RNE", {
          capital: rne.capital,
          greffe: rne.greffe,
          representantLegal: rne.representantLegal,
          formeJuridique: rne.formeJuridique,
          objetSocial: rne.objetSocial,
        });
      }

      for (const acte of await inpi.actesParSiren(siren)) {
        await prisma.evenement.upsert({
          where: {
            entrepriseId_source_reference: {
              entrepriseId: entreprise.id,
              source: "RNE",
              reference: acte.reference,
            },
          },
          create: { ...acte, entrepriseId: entreprise.id, source: "RNE", categorie: "depot" },
          update: { titre: acte.titre, detail: acte.detail, date: acte.date },
        });
        nbEvenements++;
      }
      journal.push({ source: "inpi", statut: "ok" });
    } catch (e) {
      journal.push({ source: "inpi", statut: "erreur", message: String(e) });
    }
  } else {
    journal.push({ source: "inpi", statut: "inactif", message: "identifiants INPI absents" });
  }

  // ── 5. Médiateur de la consommation ──────────────────────────────────────
  try {
    await rattacherMediateur(entreprise.id, champs.secteur);
    journal.push({ source: "mediateurs", statut: "ok" });
  } catch (e) {
    journal.push({ source: "mediateurs", statut: "erreur", message: String(e) });
  }

  // ── 6. Site officiel de l'entreprise ─────────────────────────────────────
  // Aucun registre public ne publie l'adresse d'un site : sans détection, ce
  // champ reste vide pour toujours, et avec lui les coordonnées du service
  // consommateurs, les CGV et le médiateur déclaré.
  let site = existante?.siteWeb;
  const JOURS_AVANT_NOUVELLE_TENTATIVE = 30;
  const tenteRecemment =
    existante?.siteWebTenteLe != null &&
    Date.now() - existante.siteWebTenteLe.getTime() < JOURS_AVANT_NOUVELLE_TENTATIVE * 86_400_000;

  if (!site && !tenteRecemment && options.avecSite !== false) {
    try {
      const indique = await prisma.signalement.findFirst({
        where: { entrepriseId: entreprise.id, entrepriseLibreSite: { not: null } },
        select: { entrepriseLibreSite: true },
        orderBy: { creeLe: "desc" },
      });
      const detecte = await detecterSite({
        siren,
        denomination: champs.denomination,
        siteIndiqueParConsommateur: indique?.entrepriseLibreSite ?? null,
      });
      await prisma.entreprise.update({
        where: { id: entreprise.id },
        data: detecte
          ? {
              siteWeb: detecte.url,
              siteWebSource: detecte.provenance,
              siteWebPreuve: detecte.preuve,
              siteWebVerifieLe: maintenant,
              siteWebTenteLe: maintenant,
            }
          : { siteWebTenteLe: maintenant },
      });
      if (detecte) site = detecte.url;
      journal.push({
        source: "detection-site",
        statut: detecte ? "ok" : "ignore",
        message: detecte ? `${detecte.url} (${detecte.provenance})` : "aucun domaine ne porte le SIREN",
      });
    } catch (e) {
      journal.push({ source: "detection-site", statut: "erreur", message: String(e).slice(0, 140) });
    }
  }

  if (options.avecSite !== false && site && siteOfficiel.enrichissementActif()) {
    try {
      const enrichi = await siteOfficiel.enrichir(site);
      if (enrichi) {
        await prisma.entreprise.update({
          where: { id: entreprise.id },
          data: {
            siteWeb: enrichi.siteWeb ?? undefined,
            emailReclamation: enrichi.email ?? undefined,
            telephoneReclamation: enrichi.telephone ?? undefined,
            urlCgv: enrichi.urlCgv ?? undefined,
            urlContactSav: enrichi.urlContactSav ?? undefined,
            urlMentionsLegales: enrichi.urlMentionsLegales ?? undefined,
            mediationDeclaree: enrichi.mediationDeclaree ?? undefined,
            syncSiteOfficiel: maintenant,
          },
        });
        await enregistrerDonnees(
          entreprise.id,
          "SITE_OFFICIEL",
          {
            siteWeb: enrichi.siteWeb,
            emailReclamation: enrichi.email,
            telephoneReclamation: enrichi.telephone,
            urlCgv: enrichi.urlCgv,
            urlContactSav: enrichi.urlContactSav,
            mediationDeclaree: enrichi.mediationDeclaree,
          },
          enrichi.siteWeb,
        );
        // Une médiation déclarée sur le site est confrontée à la liste publique.
        if (enrichi.mediationDeclaree) await confirmerMediateurDeclare(entreprise.id, enrichi.mediationDeclaree);
      }
      journal.push({ source: "site-officiel", statut: "ok" });
    } catch (e) {
      journal.push({ source: "site-officiel", statut: "erreur", message: String(e) });
    }
  } else {
    journal.push({
      source: "site-officiel",
      statut: "inactif",
      message: site ? "enrichissement désactivé" : "site officiel inconnu",
    });
  }

  // ── 7. Marqueur de procédure collective (impacte l'indice de transparence) ─
  if (procedureCollective) {
    await prisma.evenement.updateMany({
      where: { entrepriseId: entreprise.id, categorie: "collective" },
      data: { procedureCollective: true },
    });
  }

  return {
    siren,
    entrepriseId: entreprise.id,
    cree: !existante,
    sources: journal,
    evenements: nbEvenements,
    etablissements: etablissements.length,
  };
}

/** Rattache un médiateur présumé compétent d'après le secteur d'activité. */
async function rattacherMediateur(entrepriseId: string, secteur: string | null) {
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise || entreprise.mediateurId) return;

  const annuaire = await chargerAnnuaire();
  const candidats = mediateurs.candidatsPourSecteur(annuaire, secteur);
  if (!candidats.length) return;

  const choisi = candidats[0];
  const enregistre = await enregistrerMediateur(choisi);
  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { mediateurId: enregistre.id, syncMediateurs: new Date() },
  });
}

async function confirmerMediateurDeclare(entrepriseId: string, extrait: string) {
  const annuaire = await chargerAnnuaire();
  const normalise = extrait
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const trouve = annuaire.find((m) => {
    const nom = m.nom
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return nom.length > 6 && normalise.includes(nom);
  });
  if (!trouve) return;

  const enregistre = await enregistrerMediateur(trouve);
  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { mediateurId: enregistre.id, mediateurAdhesionDepuis: ADHESION_DECLAREE, syncMediateurs: new Date() },
  });
}

async function enregistrerMediateur(m: mediateurs.MediateurPublic) {
  const slug = mediateurs.slugMediateur(m.nom);
  return prisma.mediateur.upsert({
    where: { slug },
    create: {
      slug,
      nom: m.nom,
      organisme: m.type,
      secteurs: [m.libelleSecteur, m.categorie].filter((s): s is string => Boolean(s)),
      siteWeb: m.url,
      verifieLe: new Date(),
    },
    update: { siteWeb: m.url ?? undefined, verifieLe: new Date() },
  });
}

// L'annuaire des médiateurs est mensuel : un cache en mémoire suffit.
let cacheAnnuaire: { valeur: mediateurs.MediateurPublic[]; expire: number } | null = null;

export async function chargerAnnuaire(): Promise<mediateurs.MediateurPublic[]> {
  if (cacheAnnuaire && cacheAnnuaire.expire > Date.now()) return cacheAnnuaire.valeur;
  try {
    const valeur = await mediateurs.annuaireComplet();
    cacheAnnuaire = { valeur, expire: Date.now() + 6 * 3_600_000 };
    return valeur;
  } catch {
    return cacheAnnuaire?.valeur ?? [];
  }
}

/** Recherche « à chaud » utilisée par l'annuaire et le formulaire de signalement. */
export async function rechercherEntreprises(
  requete: string,
  filtres: recherche.FiltresRecherche = {},
) {
  return recherche.rechercher(requete, filtres);
}

export { libelleNaf, secteurDepuisNaf };
