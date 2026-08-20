import { redirect } from "next/navigation";

/**
 * Ancienne adresse de l'étape 1.
 *
 * Le choix de la situation a rejoint l'entrée du tunnel : la page
 * d'argumentaire qui les séparait faisait doublon avec la fiche entreprise,
 * déjà lue par celui qui arrive ici. Les liens existants — fiche, annuaire,
 * signets — continuent de fonctionner.
 */
export default async function AncienneEtape({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const s = typeof query.s === "string" ? `?s=${encodeURIComponent(query.s)}` : "";
  redirect(`/signaler/${slug}${s}`);
}
