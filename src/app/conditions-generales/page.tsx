import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { CE_QUE_LA_PLATEFORME_NE_FAIT_PAS } from "@/lib/contenus";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation",
  description: "Règles d’utilisation de Recours France, périmètre du service et responsabilités.",
};

export default function ConditionsGenerales() {
  return (
    <PageEditoriale
      titre="Conditions générales d’utilisation"
      fil="Conditions générales"
      maj="17 août 2026"
      chapo="L’utilisation de Recours France est gratuite et n’exige aucun compte. Ces conditions décrivent ce que le service fait, ce qu’il ne fait pas, et les règles applicables aux contenus déposés."
      sections={[
        {
          id: "s1",
          titre: "Objet et périmètre du service",
          contenu: (
            <>
              <p>
                Recours France permet à un consommateur de signaler gratuitement un litige avec une entreprise,
                de le documenter et d’obtenir un guide des démarches disponibles, dans l’ordre applicable. Le
                service est fourni en l’état, sans obligation de résultat.
              </p>
              <p className="rf-mt-12">À ce stade, la plateforme ne fait pas les choses suivantes :</p>
              <ListePuces items={CE_QUE_LA_PLATEFORME_NE_FAIT_PAS} />
            </>
          ),
        },
        {
          id: "s2",
          titre: "Accès et absence de compte",
          contenu: (
            <p>
              Aucun compte n’est créé. L’accès au suivi d’un signalement se fait par un lien personnel envoyé à
              l’adresse email indiquée lors du dépôt. Ce lien est strictement personnel : sa communication à un
              tiers donne accès au signalement. Il reste valable 90 jours et se prolonge à chaque consultation.
            </p>
          ),
        },
        {
          id: "s3",
          titre: "Engagements de l’utilisateur",
          contenu: (
            <>
              <p>En déposant un signalement ou un avis, vous vous engagez à :</p>
              <ListePuces
                items={[
                  "déclarer des faits exacts, dont vous êtes personnellement le consommateur concerné ;",
                  "ne déposer qu’un seul signalement par litige, et un seul avis par entreprise ;",
                  "vous abstenir de tout propos injurieux, diffamatoire, discriminatoire ou manifestement disproportionné ;",
                  "ne pas publier de données personnelles de tiers (salariés, autres consommateurs) ;",
                  "ne transmettre que des pièces dont vous êtes légitimement détenteur.",
                ]}
              />
              <p className="rf-mt-14">
                Un signalement manifestement abusif, frauduleux ou déposé au nom d’un tiers est retiré et son
                auteur peut être exclu du service.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Vérification et publication",
          contenu: (
            <>
              <p>
                Un signalement accompagné d’un justificatif est publié comme tel, la pièce étant horodatée et scellée sans examen systématique. La
                vérification porte sur la <strong>réalité du signalement</strong>, jamais sur le bien-fondé de la
                réclamation : Recours France ne se prononce pas sur le fond du litige.
              </p>
              <p className="rf-mt-12">
                Seules les données structurées sont publiées. Les règles complètes de publication et de calcul
                figurent dans la <Link href="/methodologie">méthodologie</Link>, qui fait partie intégrante des
                présentes conditions.
              </p>
            </>
          ),
        },
        {
          id: "s5",
          titre: "Modération et retrait",
          contenu: (
            <>
              <p>
                Les avis sont modérés avant publication selon la{" "}
                <Link href="/charte-de-moderation">charte de modération</Link>. Un signalement accompagné d’un justificatif n’est pas
                retiré à la demande d’une entreprise, ni contre paiement : seule une erreur établie, pièces à
                l’appui, justifie un déclassement ou un retrait.
              </p>
              <p className="rf-mt-12">
                Le consommateur peut en revanche supprimer son propre signalement à tout moment, sans
                justification, depuis son espace.
              </p>
            </>
          ),
        },
        {
          id: "s6",
          titre: "Responsabilité",
          contenu: (
            <>
              <p>
                Les informations de démarches sont des informations générales et des parcours prédéfinis établis
                à partir des textes applicables. Elles ne constituent pas une consultation juridique
                personnalisée et ne se substituent ni au médiateur de la consommation, ni aux autorités
                publiques, ni au juge.
              </p>
              <p className="rf-mt-12">
                Les données publiques sont reprises telles que publiées par les registres officiels : Recours
                France ne garantit ni leur exactitude à la source, ni leur exhaustivité. Les statuts, réponses et
                délais affichés sur les fiches sont déclarés par les consommateurs et ne sont pas vérifiés auprès
                des professionnels.
              </p>
            </>
          ),
        },
        {
          id: "s7",
          titre: "Évolution du service et du périmètre",
          contenu: (
            <p>
              Le périmètre décrit ici correspond à la version actuelle de la plateforme. Toute extension —
              notamment la transmission des réclamations aux professionnels ou l’ouverture d’un droit de réponse
              — fera l’objet d’une mise à jour de ces conditions et de la méthodologie, avec la date d’entrée en
              vigueur.
            </p>
          ),
        },
        {
          id: "s8",
          titre: "Droit applicable",
          contenu: (
            <p>
              Les présentes conditions sont soumises au droit français. En cas de litige avec Recours France,
              une réclamation peut être adressée depuis la <Link href="/contact">page de contact</Link>. À défaut
              de solution amiable, les tribunaux français sont compétents.
            </p>
          ),
        },
      ]}
    />
  );
}
