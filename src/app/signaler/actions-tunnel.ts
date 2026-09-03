"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { genererReference } from "@/lib/refs";
import { creerJetonSuivi, empreinteIp } from "@/lib/auth";
import { resoudreCible } from "@/lib/cible";
import { boutiquePour } from "@/lib/boutiques";
import { lireBrouillon } from "@/lib/brouillon";
import { situationParCle } from "@/lib/tunnel";
import { recalculerIndices } from "@/lib/stats";
import type { CategorieLitige, DemandeConsommateur, EtatModeration, EtatProfessionnel } from "@prisma/client";

/**
 * Dépôt d'un signalement à partir du brouillon du tunnel.
 *
 * Le récit est enregistré dans `resume`, qui n'est jamais publié : il alimente
 * le courrier de réclamation, le récapitulatif et le traitement d'une
 * éventuelle contestation. Ce qui paraît sur la fiche est composé des champs
 * structurés — situation, demande, état du professionnel, relances — que
 * l'étape 2 recueille sous forme de choix fermés, donc publiables sans
 * relecture.
 *
 * Rien n'est écrit en base avant cet instant : quelqu'un qui abandonne à
 * l'étape deux ne laisse aucune ligne derrière lui.
 */
export async function deposerDepuisBrouillon(
  slug: string,
  email: string,
): Promise<string | null> {
  const brouillon = await lireBrouillon();
  const situation = situationParCle(brouillon.situation);
  if (!situation || (!brouillon.demande && !brouillon.etatPro)) return null;

  const cible = await resoudreCible(slug);
  if (!cible) return null;

  // Une boutique déjà connue accueille le signalement : c'est l'objet que le
  // consommateur désigne, indépendamment de toute personne morale.
  const boutique = await boutiqueRattachee(cible);

  const montantBrut = brouillon.montant ? Number(brouillon.montant.replace(",", ".")) : NaN;
  const montant = Number.isFinite(montantBrut) && montantBrut > 0 ? montantBrut : null;

  const reference = await genererReference();
  const enTetes = await headers();

  try {
    const signalement = await prisma.signalement.create({
      data: {
        reference,
        entrepriseId: cible.entrepriseId,
        boutiqueId: boutique?.id ?? null,
        entrepriseLibreNom: cible.entrepriseId === null ? cible.nom : null,
        entrepriseLibreSite: cible.entrepriseId === null ? cible.site : null,
        moderation: etatPublication(cible.entrepriseId, boutique),
        categorie: situation.categorie as CategorieLitige,
        sousCategorie: brouillon.sous ?? null,
        montant,
        // Le montant reste compté dans les statistiques même lorsqu'il n'est
        // pas affiché : c'est l'affichage que l'auteur choisit, pas la mesure.
        montantPublic: brouillon.montantPublic !== false,
        dateFaits: brouillon.dateFaits ? new Date(brouillon.dateFaits) : new Date(),
        contactPrealable: brouillon.relances ? "ECRIT" : "AUCUN",
        demande: (brouillon.demande as DemandeConsommateur | undefined) ?? null,
        etatProfessionnel: (brouillon.etatPro as EtatProfessionnel | undefined) ?? null,
        relances: brouillon.relances ?? null,
        // Une chaîne vide n'est pas un récit : la distinguer de l'absence
        // évite d'avoir à tester les deux partout où on l'affiche.
        resume: brouillon.recit?.trim() || null,
        email,
        certifie: true,
        consentement: true,
        ipHash: empreinteIp(enTetes.get("x-forwarded-for") ?? ""),
        userAgent: enTetes.get("user-agent")?.slice(0, 300) ?? null,
      },
    });

    await creerJetonSuivi(signalement.id, email);
    if (cible.entrepriseId) await recalculerIndices(cible.entrepriseId).catch(() => undefined);
    await viderLeCacheDeLaFiche(cible.entrepriseId, boutique?.slug ?? null);

    return reference;
  } catch (e) {
    console.error("[tunnel] dépôt impossible", e);
    return null;
  }
}

/**
 * Dépôt depuis le tunnel en deux étapes de la refonte.
 *
 * Rien n'est écrit avant cet appel : quelqu'un qui abandonne à l'étape deux ne
 * laisse aucune ligne derrière lui, et l'adresse électronique n'est demandée
 * qu'au dernier écran.
 *
 * Le récit va dans `resume`, qui n'est jamais publié — il alimente le courrier
 * de réclamation et le traitement d'une éventuelle contestation. Ce qui paraît
 * sur la fiche est composé des seuls champs fermés : catégorie, date, solution
 * demandée, statut.
 */
/**
 * La boutique à laquelle rattacher la déclaration.
 *
 * Deux chemins y mènent. Ou bien la fiche boutique a servi de point de départ,
 * et la cible la connaît déjà — c'est le cas y compris quand l'exploitant est
 * établi, et c'est celui qui manquait : la déclaration partait alors sur la
 * société seule et n'apparaissait jamais sur la fiche d'où elle venait. Ou
 * bien la cible est libre et ne porte qu'un domaine, qu'on résout ici, en
 * créant la boutique au besoin.
 */
async function boutiqueRattachee(
  cible: { boutiqueId: string | null; entrepriseId: string | null; site: string | null },
): Promise<{ id: string; slug: string } | null> {
  if (cible.boutiqueId) {
    return prisma.boutique.findUnique({ where: { id: cible.boutiqueId }, select: { id: true, slug: true } });
  }
  if (cible.entrepriseId === null && cible.site) return boutiquePour(cible.site);
  return null;
}

/**
 * Publier tout de suite, ou attendre un rapprochement ?
 *
 * La retenue vaut pour un nom tapé dans un champ : « Bergamotte » désigne
 * peut-être trois sociétés, et publier une mise en cause sur cette seule foi
 * reviendrait à l'attribuer au hasard. Ces déclarations-là attendent.
 *
 * Un domaine résolu en boutique n'est pas de cet ordre. La boutique existe
 * dans notre référentiel, elle a sa fiche, son adresse, et c'est elle que le
 * consommateur désigne — pas une personne morale, qui reste inconnue et qui
 * n'est nommée nulle part. Retenir ces déclarations rendait fausses les deux
 * promesses que le parcours affiche : « publication immédiate » sur la fiche,
 * « votre signalement est maintenant public » à l'arrivée. Elles ne
 * paraissaient jamais, et personne n'était prévenu.
 *
 * Reste donc en attente le seul cas qu'elle visait : ni société établie, ni
 * domaine connu.
 */
function etatPublication(entrepriseId: string | null, boutique: { id: string } | null): EtatModeration {
  if (entrepriseId !== null) return "PUBLIE";
  return boutique ? "PUBLIE" : "EN_ATTENTE";
}

export async function publierSignalement(entree: {
  slug: string;
  /** Slug de la boutique d'où part la déclaration, quand elle en vient. */
  via: string | null;
  famille: string;
  categorie: string;
  dateFaits: string;
  recit: string;
  solution: string;
  email: string;
}): Promise<{ reference: string; fiche: string | null } | { erreur: string }> {
  const { categorieEnum, demandeEnum } = await import("@/lib/tunnel-refonte");

  if (!entree.categorie || !entree.solution || !entree.recit.trim()) {
    return { erreur: "Il manque une réponse." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entree.email)) {
    return { erreur: "Cette adresse électronique ne semble pas valide." };
  }

  const cible = await resoudreCible(entree.slug, entree.via);
  if (!cible) return { erreur: "Entreprise introuvable." };

  const boutique = await boutiqueRattachee(cible);
  const reference = await genererReference();
  const enTetes = await headers();

  try {
    const signalement = await prisma.signalement.create({
      data: {
        reference,
        entrepriseId: cible.entrepriseId,
        boutiqueId: boutique?.id ?? null,
        entrepriseLibreNom: cible.entrepriseId === null ? cible.nom : null,
        entrepriseLibreSite: cible.entrepriseId === null ? cible.site : null,
        moderation: etatPublication(cible.entrepriseId, boutique),
        categorie: categorieEnum(entree.categorie),
        sousCategorie: entree.categorie,
        famille: entree.famille,
        solutionLibelle: entree.solution,
        demande: demandeEnum(entree.solution),
        dateFaits: new Date(entree.dateFaits),
        resume: entree.recit.trim(),
        email: entree.email.trim().toLowerCase(),
        certifie: true,
        consentement: true,
        ipHash: empreinteIp(enTetes.get("x-forwarded-for") ?? ""),
        userAgent: enTetes.get("user-agent")?.slice(0, 300) ?? null,
      },
    });

    await creerJetonSuivi(signalement.id, entree.email);
    if (cible.entrepriseId) await recalculerIndices(cible.entrepriseId).catch(() => undefined);
    await viderLeCacheDeLaFiche(cible.entrepriseId, boutique?.slug ?? null);

    // Où le signalement vient de paraître : la fiche de la société quand elle
    // est établie, celle de la boutique sinon. Le tunnel proposait jusqu'ici
    // « Voir mon signalement public » vers `/entreprises/autre`, qui n'existe
    // pas — le seul lien que l'auteur veut suivre à cet instant tombait en 404.
    const fiche = boutique
      ? `/boutiques/${boutique.slug}#litiges`
      : cible.entrepriseId
        ? `/entreprises/${cible.slug}#signalements`
        : null;

    return { reference, fiche };
  } catch (e) {
    console.error("[tunnel] dépôt impossible", e);
    return { erreur: "La publication a échoué. Réessayez dans un instant." };
  }
}

/**
 * Vide le cache de la page où le signalement vient de paraître.
 *
 * Les fiches sont désormais servies d'un cache d'une journée. Sans cette
 * invalidation, quelqu'un qui vient de publier son litige ne le verrait pas
 * sur la fiche avant vingt-quatre heures — et conclurait, à raison, que le
 * dépôt n'a pas fonctionné.
 */
async function viderLeCacheDeLaFiche(entrepriseId: string | null, boutiqueSlug: string | null) {
  try {
    if (entrepriseId) {
      const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { slug: true } });
      if (e) revalidatePath(`/entreprises/${e.slug}`);
    }
    if (boutiqueSlug) revalidatePath(`/boutiques/${boutiqueSlug}`);
  } catch {
    // Un cache non vidé se rattrape en vingt-quatre heures ; un dépôt perdu,
    // jamais. L'échec ne doit pas remonter.
  }
}
