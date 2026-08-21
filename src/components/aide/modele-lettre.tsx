import type { ReactNode } from "react";
import { CopierTexte } from "@/app/signaler/confirmation/[jeton]/copier-texte";

/**
 * Un modèle de courrier, prêt à recopier.
 *
 * C'est l'angle qui distingue ces guides des sites publics. Service-public.fr
 * et l'INC expliquent très bien le droit ; personne ne donne la phrase exacte à
 * écrire, ni ne dit quoi conserver. Un consommateur qui sait qu'il a deux ans
 * de garantie mais ne sait pas comment le formuler n'est pas plus avancé.
 *
 * Les passages à remplacer sont entre crochets, pour qu'on voie d'un coup d'œil
 * ce qui reste à faire — et le texte est en clair plutôt que dans une image,
 * pour rester copiable, lisible par un lecteur d'écran et indexable.
 */
export function ModeleLettre({
  intitule,
  texte,
  note,
}: {
  intitule: string;
  texte: string;
  note?: ReactNode;
}) {
  return (
    <figure className="rf-modele">
      <figcaption className="rf-modele__tete">
        <span>{intitule}</span>
        <CopierTexte texte={texte} />
      </figcaption>
      <pre className="rf-modele__corps">{texte}</pre>
      {note ? <p className="rf-modele__note">{note}</p> : null}
    </figure>
  );
}
