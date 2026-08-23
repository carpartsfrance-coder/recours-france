import Link from "next/link";
import type { Metadata } from "next";
import { PageEditoriale } from "@/components/page-editoriale";
import { EDITEUR, HEBERGEUR, mentionsManquantes, siegeSocial } from "@/lib/editeur";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergement, propriété intellectuelle et sources de données de Recours France.",
};

/**
 * Les mentions légales sont lues à chaque requête, jamais figées au build.
 *
 * Sans cela, corriger une adresse de siège demanderait un redéploiement, et le
 * jour où l'on renseigne enfin les variables d'environnement la page continuerait
 * d'afficher l'avertissement, gravé dans le HTML compilé.
 */
export const dynamic = "force-dynamic";

export default function MentionsLegales() {
  const manquantes = mentionsManquantes();
  const siege = siegeSocial();

  return (
    <PageEditoriale
      titre="Mentions légales"
      fil="Mentions légales"
      maj="17 août 2026"
      chapo={
        <>
          Recours France est une plateforme privée indépendante. Elle n’est ni un service de l’État, ni une
          autorité administrative, et ne dispose d’aucune mission de service public, d’aucun agrément ni
          d’aucune délégation publique.
        </>
      }
      sections={[
        {
          id: "s1",
          titre: "Éditeur du site",
          contenu: (
            <>
              {/* L'avertissement passe avant le reste, et seulement s'il a lieu
                  d'être : une page de mentions légales incomplète expose son
                  éditeur, et rien ne doit permettre de l'oublier. */}
              {manquantes.length > 0 ? (
                <p className="rf-alerte-legale">
                  <strong>Mentions légales incomplètes.</strong> Ce site ne doit pas être ouvert au public en
                  l’état : l’article 6 III de la loi pour la confiance dans l’économie numérique impose
                  l’identité de l’éditeur et celle de l’hébergeur.
                  {/* Les noms de variables restent hors de la page publique : ce
                      sont des détails d’exploitation, et les afficher à un
                      visiteur venu régler un litige n’inspire pas confiance.
                      « npm run verifier:mise-en-ligne » les nomme, lui. */}
                  {process.env.NODE_ENV === "production" ? null : (
                    <>
                      {" "}
                      Variables à renseigner : {manquantes.join(", ")}.
                    </>
                  )}
                </p>
              ) : null}
              <p>
                <strong>{EDITEUR.raisonSociale || "Éditeur non renseigné"}</strong>
                {EDITEUR.raisonSociale ? (
                  <>
                    , {EDITEUR.formeJuridique.toLowerCase()}
                    {EDITEUR.capital ? ` au capital de ${EDITEUR.capital}` : ""}.
                  </>
                ) : (
                  "."
                )}
                {siege ? (
                  <>
                    <br />
                    Siège social : {siege}.
                  </>
                ) : null}
                {EDITEUR.siren ? (
                  <>
                    <br />
                    SIREN : {EDITEUR.siren}
                    {EDITEUR.rcsVille ? ` — RCS de ${EDITEUR.rcsVille}` : ""}
                    {EDITEUR.tva ? ` — TVA intracommunautaire : ${EDITEUR.tva}` : ""}.
                  </>
                ) : null}
                {EDITEUR.directeurPublication ? (
                  <>
                    <br />
                    Directeur de la publication : {EDITEUR.directeurPublication}.
                  </>
                ) : null}
                <br />
                Contact : <Link href="/contact">formulaire de contact</Link>.
              </p>
            </>
          ),
        },
        {
          id: "s2",
          titre: "Hébergement",
          contenu: (
            <>
              <p>
                {HEBERGEUR.nom ? (
                  <>
                    <strong>{HEBERGEUR.nom}</strong>
                    {HEBERGEUR.adresse ? (
                      <>
                        <br />
                        {HEBERGEUR.adresse}
                      </>
                    ) : null}
                    {HEBERGEUR.telephone ? (
                      <>
                        <br />
                        Téléphone : {HEBERGEUR.telephone}
                      </>
                    ) : null}
                  </>
                ) : (
                  "Hébergeur non renseigné."
                )}
              </p>
              <p className="rf-mt-12">
                Les données du site sont stockées à {HEBERGEUR.localisationDonnees}.
              </p>
            </>
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
              {/* L'alerte n'est pas une transmission de réclamation : elle
                  signale au professionnel qu'un litige le concernant a été
                  publié, et rien d'autre. La distinction est celle que fait
                  déjà le parcours de dépôt, et il faut qu'elle figure ici. */}
              <p className="rf-mt-12">
                Lorsqu’une adresse professionnelle vérifiée est disponible, Recours France peut informer
                l’entreprise qu’un litige la concernant a été publié, en lui communiquant le lien de la page
                publique. Aucune coordonnée personnelle du consommateur n’est jointe, et aucune réponse ni
                résolution ne peut être garantie.
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
                leur éditeur. Le service n’utilise aucun élément du Système de design de l’État, ni la
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
