import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Quels justificatifs fournir",
  description:
    "Les pièces qui font passer un signalement en signalement vérifié, ce qu’elles démontrent, et ce qu’il ne faut jamais transmettre.",
};

export default function Justificatifs() {
  return (
    <PageEditoriale
      titre="Quels justificatifs fournir"
      fil="Quels justificatifs fournir"
      chapo={
        <>
          Une seule pièce contrôlée suffit à faire passer votre signalement en <strong>signalement vérifié</strong>.
          Vos pièces ne sont jamais publiées : elles servent uniquement à établir la réalité du signalement.
        </>
      }
      sections={[
        {
          id: "s1",
          titre: "La pièce la plus utile : la preuve d’achat",
          contenu: (
            <>
              <p>
                Facture, bon de commande, confirmation de paiement ou contrat signé. Elle établit d’un coup la
                relation commerciale, la date et le montant : c’est la pièce qui permet la vérification dans la
                quasi-totalité des cas.
              </p>
              <p className="rf-mt-12">
                Nous contrôlons la cohérence entre le nom de l’entreprise, la date et le montant que vous avez
                déclarés. Nous ne portons aucune appréciation sur le bien-fondé de votre réclamation.
              </p>
            </>
          ),
        },
        {
          id: "s2",
          titre: "Les pièces qui renforcent votre position",
          contenu: (
            <ListePuces
              items={[
                "Échanges écrits avec le service client : ils prouvent vos démarches et leurs dates. Un appel téléphonique ne se prouve pas.",
                "Preuve d’envoi d’une réclamation écrite : accusé de réception postal ou courriel horodaté. C’est la condition de recevabilité devant un médiateur.",
                "Preuve de retour du produit : bordereau du transporteur ou accusé de réception du colis.",
                "Photographies du produit ou du défaut, datées, pour un litige de garantie ou de conformité.",
                "Relevé bancaire ou preuve de prélèvement, utile si le professionnel affirme avoir remboursé ou cessé les prélèvements.",
                "Conditions générales applicables au moment de l’achat, notamment pour un litige de résiliation.",
              ]}
            />
          ),
        },
        {
          id: "s3",
          titre: "Ce qu’il ne faut pas transmettre",
          contenu: (
            <>
              <p>
                Masquez ou n’envoyez pas les éléments qui ne servent pas à la vérification : numéro de carte
                bancaire complet, RIB, pièce d’identité, numéro de sécurité sociale, données de santé. Une facture
                suffit ; il n’est jamais nécessaire de transmettre un moyen de paiement.
              </p>
              <p className="rf-mt-12">
                N’incluez pas non plus les données personnelles d’un tiers : nom d’un salarié, coordonnées d’un
                autre client, éléments d’un dossier qui ne vous concerne pas.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Format et limites",
          contenu: (
            <p>
              PDF, JPG ou PNG, 10 Mo maximum par pièce et 5 pièces par signalement. Une photo lisible d’un
              document papier convient parfaitement. Le contrôle est réalisé sous 48 heures ouvrées et vous êtes
              informé par email du résultat, accepté ou refusé, avec son motif.
            </p>
          ),
        },
        {
          id: "s5",
          titre: "Et si je n’ai aucune pièce ?",
          contenu: (
            <p>
              Votre signalement reste enregistré et vous recevez le même guide des démarches. Il figure dans le
              volume agrégé de la fiche de l’entreprise, mais n’entre dans aucune statistique de comportement.
              Vous pouvez ajouter une pièce plus tard, à tout moment, depuis{" "}
              <Link href="/mon-espace">votre espace</Link>.
            </p>
          ),
        },
      ]}
      aside={
        <div className="rf-carte" style={{ padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ajouter une pièce maintenant</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
            Votre lien de suivi permet de déposer une pièce en quelques secondes.
          </p>
          <Link href="/mon-espace" className="rf-btn rf-btn--secondaire rf-btn--sm rf-btn--bloc rf-mt-12">
            Accéder à mon espace
          </Link>
        </div>
      }
    />
  );
}
