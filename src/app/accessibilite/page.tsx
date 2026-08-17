import type { Metadata } from "next";
import Link from "next/link";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Accessibilité",
  description: "Déclaration d’accessibilité de Recours France : conformité RGAA, points connus et contact.",
};

export default function Accessibilite() {
  return (
    <PageEditoriale
      titre="Accessibilité"
      fil="Accessibilité"
      maj="17 août 2026"
      chapo="Recours France vise la conformité au référentiel général d’amélioration de l’accessibilité (RGAA). L’interface est entièrement typographique, sans image porteuse d’information, et utilisable au clavier."
      sections={[
        {
          id: "s1",
          titre: "État de conformité",
          contenu: (
            <p>
              La plateforme est <strong>partiellement conforme</strong> au RGAA en l’absence d’audit externe
              complet. Un audit d’accessibilité doit être réalisé avant toute déclaration de conformité totale ;
              cette page sera alors mise à jour avec le taux de conformité et la date de l’audit.
            </p>
          ),
        },
        {
          id: "s2",
          titre: "Dispositions déjà en place",
          contenu: (
            <ListePuces
              items={[
                "Contrastes de texte conformes au niveau AA sur l’ensemble de la charte, y compris sur fond marine et nuit.",
                "Navigation clavier complète, avec un lien d’évitement vers le contenu principal et un indicateur de focus visible.",
                "Accordéons et infobulles pilotés par aria-expanded, aria-controls et aria-describedby, activables au clavier comme à la souris.",
                "Étoiles de notation doublées d’un équivalent textuel lu par les lecteurs d’écran.",
                "Champs de formulaire tous associés à une étiquette, messages d’erreur annoncés par role=\"alert\" et rattachés au champ concerné.",
                "Cibles tactiles d’au moins 44 pixels de côté, y compris sur mobile.",
                "Aucune information transmise par la seule couleur : chaque état porte un libellé texte.",
                "Contenus des accordéons présents dans le document, donc trouvables par la recherche du navigateur.",
              ]}
            />
          ),
        },
        {
          id: "s3",
          titre: "Points d’amélioration connus",
          contenu: (
            <ListePuces
              items={[
                "Les graphiques de tendance (histogramme mensuel, barres de motifs) doivent être doublés d’un tableau de données équivalent.",
                "Le parcours complet doit être testé avec NVDA, JAWS et VoiceOver, puis documenté ici.",
                "Les documents PDF générés (récapitulatif, fiche entreprise) ne sont pas encore balisés au sens PDF/UA.",
              ]}
            />
          ),
        },
        {
          id: "s4",
          titre: "Signaler une difficulté d’accès",
          contenu: (
            <p>
              Si vous rencontrez un obstacle pour accéder à un contenu ou à une fonctionnalité, écrivez-nous
              depuis la <Link href="/contact">page de contact</Link> : nous vous répondons et vous transmettons
              l’information sous une forme accessible. Vous pouvez également saisir le Défenseur des droits si
              vous estimez que le refus d’accès n’est pas corrigé.
            </p>
          ),
        },
      ]}
    />
  );
}
