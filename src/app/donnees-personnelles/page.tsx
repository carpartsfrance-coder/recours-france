import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Données personnelles",
  description:
    "Quelles données Recours France collecte, pourquoi, combien de temps, et comment exercer vos droits d’accès, de rectification et de suppression.",
};

export default function DonneesPersonnelles() {
  return (
    <PageEditoriale
      titre="Données personnelles"
      fil="Données personnelles"
      maj="17 août 2026"
      chapo={
        <>
          Recours France traite le minimum de données nécessaires au signalement d’un litige. Vos pièces
          justificatives ne sont jamais publiées, et votre nom n’apparaît jamais sur une fiche d’entreprise.
        </>
      }
      sections={[
        {
          id: "s1",
          titre: "Responsable de traitement",
          contenu: (
            <p>
              Recours France SAS, éditeur de la plateforme, est responsable du traitement. Toute demande relative
              à vos données peut être adressée par simple email depuis la{" "}
              <Link href="/contact">page de contact</Link>, sans justification et sans formalisme.
            </p>
          ),
        },
        {
          id: "s2",
          titre: "Données collectées et finalités",
          contenu: (
            <>
              <p>Trois catégories de données sont collectées, chacune pour une finalité précise :</p>
              <ListePuces
                items={[
                  <>
                    <strong>Identification du consommateur</strong> (prénom, nom, email) : envoi du récapitulatif
                    et du lien de suivi, vérification du signalement, prévention des dépôts multiples. Base
                    légale : exécution du service demandé.
                  </>,
                  <>
                    <strong>Contenu du signalement</strong> (entreprise, catégorie, montant, date des faits,
                    résumé, statut) : constitution du signalement et production des statistiques publiques
                    agrégées. Base légale : intérêt légitime à informer le public, et consentement explicite pour
                    la publication des données structurées anonymisées.
                  </>,
                  <>
                    <strong>Justificatifs</strong> (facture, commande, échanges) : contrôle de la réalité du
                    signalement. Base légale : exécution du service demandé.
                  </>,
                ]}
              />
              <p className="rf-mt-14">
                Une empreinte technique irréversible de l’adresse IP est conservée pour prévenir les dépôts
                massifs automatisés. L’adresse IP elle-même n’est jamais stockée en clair.
              </p>
            </>
          ),
        },
        {
          id: "s3",
          titre: "Ce qui est publié, ce qui ne l’est jamais",
          contenu: (
            <>
              <p>
                Sur une fiche d’entreprise, seules sont publiées la catégorie du litige, le montant déclaré, la
                date, le statut déclaré et le niveau de vérification. Les résumés visibles sont rédigés par la
                plateforme à partir de ces seules données structurées.
              </p>
              <p className="rf-mt-12">
                <strong>Ne sont jamais publiés :</strong> votre nom, votre adresse email, le texte libre que vous
                avez rédigé, vos justificatifs, votre adresse postale et toute donnée permettant de vous
                identifier. Un avis publié n’affiche que votre prénom et l’initiale de votre nom.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Durées de conservation",
          contenu: (
            <ListePuces
              items={[
                "Signalement et données structurées : 5 ans à compter du dépôt, durée alignée sur la prescription de l’action en matière de consommation.",
                "Justificatifs : 24 mois après le contrôle, puis suppression automatique. Ils ne sont conservés que le temps utile à la vérification et à une éventuelle contestation.",
                "Lien de suivi : 90 jours, prolongé à chaque consultation.",
                "Journal de modération : 5 ans, pour permettre la traçabilité des décisions.",
              ]}
            />
          ),
        },
        {
          id: "s5",
          titre: "Vos droits",
          contenu: (
            <>
              <p>
                Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et
                de portabilité. Deux voies, toutes deux gratuites :
              </p>
              <ListePuces
                items={[
                  <>
                    Depuis votre espace : le lien de suivi reçu par email permet de consulter, corriger,
                    compléter et <strong>supprimer définitivement</strong> votre signalement et vos pièces, en
                    une action, sans justification. <Link href="/mon-espace">Retrouver mon signalement</Link>.
                  </>,
                  <>
                    Par email : une demande adressée depuis la <Link href="/contact">page de contact</Link> est
                    traitée sous un mois. Aucune pièce d’identité n’est exigée lorsque la demande provient de
                    l’adresse email utilisée lors du signalement.
                  </>,
                ]}
              />
              <p className="rf-mt-14">
                Vous pouvez également introduire une réclamation auprès de la Commission nationale de
                l’informatique et des libertés (CNIL).
              </p>
            </>
          ),
        },
        {
          id: "s6",
          titre: "Destinataires et sous-traitants",
          contenu: (
            <>
              <p>
                Vos données ne sont ni vendues, ni cédées, ni transmises à des fins commerciales. Elles ne sont
                jamais transmises à l’entreprise concernée par votre signalement : la plateforme ne transmet pas
                les réclamations aux professionnels.
              </p>
              <p className="rf-mt-12">
                Seuls interviennent l’hébergeur de la plateforme et le prestataire d’envoi d’emails, tous deux
                situés dans l’Union européenne et liés par un contrat de sous-traitance. Aucun transfert hors de
                l’Union européenne n’est réalisé.
              </p>
            </>
          ),
        },
        {
          id: "s7",
          titre: "Sécurité",
          contenu: (
            <p>
              Les justificatifs sont stockés hors du répertoire public du site, avec des droits d’accès
              restreints, et ne sont consultables que par les personnes habilitées à la vérification. Les accès
              d’administration sont individuels, tracés dans un journal d’audit, et les mots de passe sont
              stockés sous forme de condensats salés.
            </p>
          ),
        },
      ]}
      aside={
        <div className="rf-carte rf-carte--teintee" style={{ padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Supprimer mon signalement</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
            La suppression est immédiate et sans justification depuis votre espace.
          </p>
          <Link href="/mon-espace" className="rf-btn rf-btn--secondaire rf-btn--sm rf-btn--bloc rf-mt-12">
            Accéder à mon espace
          </Link>
        </div>
      }
    />
  );
}
