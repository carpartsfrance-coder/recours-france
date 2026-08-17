import Link from "next/link";
import type { Metadata } from "next";
import { PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergement, propriété intellectuelle et sources de données de Recours France.",
};

export default function MentionsLegales() {
  return (
    <PageEditoriale
      titre="Mentions légales"
      fil="Mentions légales"
      maj="17 août 2026"
      chapo={
        <>
          Recours France est une plateforme privée indépendante éditée par Recours France SAS. Elle n’est ni un
          service de l’État, ni une autorité administrative, et ne dispose d’aucune mission de service public,
          d’aucun agrément ni d’aucune délégation publique.
        </>
      }
      sections={[
        {
          id: "s1",
          titre: "Éditeur du site",
          contenu: (
            <>
              <p>
                <strong>Recours France SAS</strong>, société par actions simplifiée au capital de 10 000 €.
                <br />
                Siège social : [adresse du siège] — [code postal] [ville].
                <br />
                SIREN : [à compléter] — RCS de [ville] — TVA intracommunautaire : [à compléter].
                <br />
                Directeur de la publication : [nom du représentant légal].
                <br />
                Contact : <Link href="/contact">formulaire de contact</Link>.
              </p>
              <p className="rf-mt-12">
                Ces mentions doivent être complétées avant toute mise en ligne publique : elles sont
                obligatoires au titre de l’article 6 III de la loi pour la confiance dans l’économie numérique.
              </p>
            </>
          ),
        },
        {
          id: "s2",
          titre: "Hébergement",
          contenu: (
            <p>
              Le site est hébergé au sein de l’Union européenne. L’identité, la raison sociale, l’adresse et le
              numéro de téléphone de l’hébergeur doivent figurer ici avant la mise en ligne publique.
            </p>
          ),
        },
        {
          id: "s3",
          titre: "Nature du service",
          contenu: (
            <>
              <p>
                Recours France permet à un consommateur de signaler gratuitement un litige avec une entreprise
                et lui restitue un guide des démarches disponibles. La plateforme ne transmet pas les
                réclamations aux professionnels, n’envoie aucun courrier, ne négocie aucun litige, ne recueille
                pas les réponses des professionnels et ne délivre pas de conseil juridique personnalisé.
              </p>
              <p className="rf-mt-12">
                Aucune formulation du site ne doit être comprise comme un agrément public, une prise en charge,
                une pression exercée sur une entreprise ou une garantie de résultat.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Sources de données et réutilisation",
          contenu: (
            <>
              <p>
                Les fiches d’entreprise sont constituées à partir de données publiques : répertoire Sirene
                (Insee), Registre national des entreprises (INPI), BODACC (DILA) et annuaire public des
                médiateurs de la consommation. Ces données sont réutilisées telles que publiées, avec leur date
                de synchronisation.
              </p>
              <p className="rf-mt-12">
                Les données de signalement sont déclarées par les consommateurs et publiées uniquement sous
                forme structurée et agrégée, avec leur niveau de vérification. Voir la{" "}
                <Link href="/methodologie">méthodologie</Link>.
              </p>
            </>
          ),
        },
        {
          id: "s5",
          titre: "Propriété intellectuelle et marque",
          contenu: (
            <>
              <p>
                La charte graphique, les textes éditoriaux et l’architecture du service sont la propriété de
                Recours France SAS. Le service n’utilise aucun élément du Système de design de l’État, ni la
                police Marianne, ni le bloc-marque « République Française », dont l’usage est réservé aux
                entités de l’État.
              </p>
              <p className="rf-mt-12">
                Les dénominations sociales et marques citées appartiennent à leurs titulaires respectifs. Leur
                mention relève de l’information du public sur des données publiques et sur des signalements de
                consommateurs.
              </p>
            </>
          ),
        },
        {
          id: "s6",
          titre: "Signaler un contenu ou une donnée inexacte",
          contenu: (
            <p>
              Toute personne peut signaler une erreur sur une fiche depuis le bouton « Signaler une erreur »
              présent sur chaque fiche entreprise, ou demander la rectification d’une donnée. Une donnée
              inexacte relevant de Recours France est corrigée sous 15 jours. Une donnée publique erronée doit
              être rectifiée à la source auprès du registre concerné.
            </p>
          ),
        },
      ]}
    />
  );
}
