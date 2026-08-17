import type { Metadata } from "next";
import Link from "next/link";
import { PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Recours France n’utilise aucun cookie de mesure d’audience ni de publicité.",
};

export default function Cookies() {
  return (
    <PageEditoriale
      titre="Cookies"
      fil="Cookies"
      maj="17 août 2026"
      chapo="Recours France n’utilise aucun cookie publicitaire, aucun traceur tiers et aucun outil de mesure d’audience. Aucune bannière de consentement n’est donc nécessaire."
      sections={[
        {
          id: "s1",
          titre: "Cookies utilisés",
          contenu: (
            <>
              <p>
                Un seul cookie est déposé, et uniquement pour les administrateurs de la plateforme :{" "}
                <code className="rf-mono">rf_admin</code>, cookie de session strictement nécessaire au
                fonctionnement de l’interface d’administration. Il est chiffré, inaccessible au JavaScript,
                limité au domaine du site et expire au bout de 8 heures.
              </p>
              <p className="rf-mt-12">
                Aucun cookie n’est déposé lors d’une visite ordinaire, d’un signalement ou d’une consultation de
                fiche.
              </p>
            </>
          ),
        },
        {
          id: "s2",
          titre: "Absence de traceurs tiers",
          contenu: (
            <p>
              Aucun service tiers de mesure d’audience, de régie publicitaire, de réseau social ou de carte
              interactive n’est chargé. Les polices de caractères sont hébergées sur nos propres serveurs :
              aucune requête n’est adressée à un service externe lors de l’affichage d’une page.
            </p>
          ),
        },
        {
          id: "s3",
          titre: "Journaux techniques",
          contenu: (
            <p>
              Les journaux du serveur conservent temporairement les données techniques nécessaires à la sécurité
              et au bon fonctionnement du service. L’adresse IP associée à un signalement n’est jamais stockée en
              clair : seule une empreinte irréversible est conservée, pour prévenir les dépôts automatisés. Voir
              la page <Link href="/donnees-personnelles">données personnelles</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
