import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Vos droits de consommateur",
  description:
    "Rétractation, livraison, garantie légale de conformité, service après-vente, résiliation : les délais et principes applicables en droit français de la consommation.",
};

export default function Droits() {
  return (
    <PageEditoriale
      titre="Vos droits de consommateur"
      fil="Vos droits de consommateur"
      chapo={
        <>
          Information générale sur les principaux droits applicables en France. Ces éléments ne constituent pas
          une consultation juridique personnalisée : ils vous aident à situer votre situation et à choisir la
          bonne démarche.
        </>
      }
      sections={[
        {
          id: "s1",
          titre: "Rétractation et remboursement (achat à distance)",
          contenu: (
            <>
              <p>
                Pour un achat à distance ou hors établissement, vous disposez de <strong>14 jours</strong> pour
                vous rétracter, sans motif et sans pénalité. Le délai court à compter de la réception du bien.
              </p>
              <p className="rf-mt-12">
                Le professionnel doit rembourser <strong>sous 14 jours</strong> après avoir récupéré le bien ou
                reçu la preuve de son expédition. Passé ce délai, les sommes dues sont majorées de plein droit.
              </p>
              <p className="rf-mt-12">
                Certaines exceptions existent : biens personnalisés, produits scellés descellés, contenu
                numérique dont l’exécution a commencé avec votre accord exprès.
              </p>
            </>
          ),
        },
        {
          id: "s2",
          titre: "Livraison",
          contenu: (
            <>
              <p>
                Le professionnel doit livrer à la date annoncée ou, à défaut d’indication, dans un délai maximal
                de <strong>30 jours</strong>. En cas de manquement, mettez-le en demeure de livrer dans un délai
                raisonnable : sans exécution, vous pouvez résoudre le contrat et obtenir le remboursement
                intégral sous 14 jours.
              </p>
              <p className="rf-mt-12">
                Le professionnel reste responsable du bien jusqu’à sa remise effective, y compris en cas de perte
                ou de dommage pendant le transport.
              </p>
            </>
          ),
        },
        {
          id: "s3",
          titre: "Garantie légale de conformité",
          contenu: (
            <>
              <p>
                Elle s’applique <strong>2 ans</strong> à compter de la délivrance pour un bien neuf, et 12 mois
                pour un bien d’occasion. Pendant 24 mois, le défaut est présumé exister au moment de la
                délivrance : <strong>vous n’avez pas à prouver</strong> qu’il préexistait.
              </p>
              <p className="rf-mt-12">
                Vous choisissez entre réparation et remplacement, sans frais. Si aucune des deux n’est possible
                dans un délai raisonnable, vous pouvez obtenir une réduction de prix ou la résolution de la
                vente. Cette garantie est due par le <strong>vendeur</strong>, pas par le fabricant, et elle
                s’ajoute à toute garantie commerciale.
              </p>
              <p className="rf-mt-12">
                La garantie des vices cachés reste ouverte séparément, pendant 2 ans à compter de la découverte
                du défaut.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Résiliation et abonnements",
          contenu: (
            <>
              <p>
                Pour de nombreux contrats à tacite reconduction, la résiliation est possible{" "}
                <strong>à tout moment après un an</strong> d’engagement. Un contrat souscrit en ligne doit pouvoir
                être résilié en ligne, par une fonctionnalité aussi accessible que la souscription.
              </p>
              <p className="rf-mt-12">
                Le professionnel doit vous informer de la date limite de non-reconduction. À défaut, vous pouvez
                résilier gratuitement à tout moment après la reconduction. Les prélèvements doivent cesser à la
                date d’effet de la résiliation ; les sommes prélevées ensuite sont indûment perçues.
              </p>
            </>
          ),
        },
        {
          id: "s5",
          titre: "Service après-vente et pratiques commerciales",
          contenu: (
            <>
              <p>
                Une garantie commerciale ne peut jamais réduire vos droits légaux. Un service après-vente doit
                s’exécuter dans le délai annoncé ou, à défaut, dans un délai raisonnable.
              </p>
              <p className="rf-mt-12">
                Les pratiques commerciales trompeuses ou agressives sont interdites : information mensongère sur
                le prix, la disponibilité ou les caractéristiques, faux avis, pression à la souscription. Ces
                pratiques relèvent aussi de{" "}
                <a href="https://signal.conso.gouv.fr" target="_blank" rel="noreferrer noopener">
                  SignalConso
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: "s6",
          titre: "Faire valoir vos droits, dans l’ordre",
          contenu: (
            <>
              <ListePuces
                items={[
                  "Réclamation écrite au professionnel, avec une demande chiffrée et vos justificatifs.",
                  "Relance écrite après 30 jours sans réponse satisfaisante.",
                  "Saisine gratuite du médiateur de la consommation, deux mois après la réclamation écrite.",
                  "Tribunal judiciaire en dernier recours, sans avocat en dessous de 5 000 €. Prescription : 5 ans.",
                ]}
              />
              <p className="rf-mt-14">
                <Link href="/signaler" style={{ fontWeight: 600 }}>
                  Signaler votre litige
                </Link>{" "}
                vous rend ce parcours personnalisé, avec les dates applicables à votre situation.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
