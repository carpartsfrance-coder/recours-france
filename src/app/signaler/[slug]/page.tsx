import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BandeauIndependance, PiedDePage } from "@/components/chrome";
import { resoudreCible } from "@/lib/cible";
import { Tunnel } from "@/components/refonte/tunnel";
import { DEPUIS_MOTIF, famillesPour } from "@/lib/tunnel-refonte";
import { formatSiren } from "@/lib/format";

/**
 * Le tunnel de signalement — écran unique, deux étapes.
 *
 * Il y avait ici trois pages successives précédées d'un argumentaire. Le
 * handoff en impose deux, sans page d'introduction : le visiteur arrive d'une
 * fiche qui a déjà tout expliqué, et on lui servait un second argumentaire
 * avant de l'écouter.
 *
 * Pas d'en-tête ni de navigation habituels : à partir du clic sur le bouton,
 * l'écran ne propose plus qu'une chose. Le bandeau d'indépendance reste, lui,
 * sur toutes les pages sans exception.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cible = await resoudreCible(slug);
  if (!cible) return {};
  return {
    title: `Signaler un problème avec ${cible.nom}`,
    description: `Publiez gratuitement votre litige avec ${cible.nom}, préparez votre réclamation écrite et suivez les démarches adaptées.`,
    alternates: { canonical: `/signaler/${cible.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function PageTunnel({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const cible = await resoudreCible(slug);
  if (!cible) notFound();

  const motif = typeof query.motif === "string" ? query.motif : null;
  const preselection = motif ? (DEPUIS_MOTIF[motif] ?? null) : null;

  return (
    <>
      <BandeauIndependance />
      <main id="contenu">
        <Tunnel
          slug={cible.slug}
          nom={cible.nom}
          lieu={cible.commune ?? null}
          siren={cible.siren ? formatSiren(cible.siren) : null}
          familles={famillesPour(cible.naf ?? null, cible.secteur ?? null)}
          preselection={preselection}
        />
      </main>
      <PiedDePage />
    </>
  );
}
