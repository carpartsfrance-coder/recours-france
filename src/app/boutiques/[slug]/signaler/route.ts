import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { nomAffiche } from "@/lib/boutiques";
import { ecrireBrouillon } from "@/lib/brouillon";
import { CIBLE_LIBRE } from "@/lib/tunnel";
import { DEPUIS_MOTIF } from "@/lib/tunnel-refonte";

/**
 * Le point d'entrée du tunnel depuis une fiche boutique.
 *
 * Une boutique n'est pas une cible de signalement : `resoudreCible` ne connaît
 * que les entreprises répertoriées et la saisie libre. Les liens de la fiche
 * pointaient jusqu'ici vers `/signaler?site=…`, un paramètre que personne ne
 * lit — cent quatre-vingt mille boutons déposaient le visiteur sur un champ de
 * recherche vide, en lui demandant de retrouver lui-même le site dont il
 * venait de lire la fiche.
 *
 * Ce passage fait les deux aiguillages :
 *
 * — exploitant établi : le tunnel de la société, qui porte sa raison sociale,
 *   son SIREN et les familles de litige de son activité ;
 * — exploitant inconnu : le tunnel libre, avec le domaine posé d'avance dans
 *   le brouillon. C'est le cas le plus fréquent, et le plus utile : la
 *   personne connaît le site, pas la société.
 *
 * Un passage plutôt qu'un lien direct, parce que le brouillon vit dans un
 * témoin de connexion : seul un gestionnaire de route peut l'écrire.
 */
export async function GET(
  requete: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const motif = new URL(requete.url).searchParams.get("motif");
  // Un motif inconnu est ignoré plutôt que transmis : le tunnel le résoudrait
  // en `null`, mais le laisser passer dans l'URL invite à en inventer.
  const suffixe = motif && DEPUIS_MOTIF[motif] ? `?motif=${motif}` : "";

  const boutique = await prisma.boutique.findUnique({
    where: { slug },
    select: { domaine: true, entreprise: { select: { slug: true } } },
  });
  if (!boutique) redirect("/signaler");

  if (boutique.entreprise) redirect(`/signaler/${boutique.entreprise.slug}${suffixe}`);

  // Le tunnel reprend le nom tel qu'il figure sur la fiche d'où l'on vient :
  // changer de désignation entre les deux écrans fait douter d'avoir cliqué juste.
  await ecrireBrouillon({ libreNom: nomAffiche(boutique.domaine), libreSite: boutique.domaine });
  redirect(`/signaler/${CIBLE_LIBRE}${suffixe}`);
}
