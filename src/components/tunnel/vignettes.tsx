import type { ReactElement } from "react";

/**
 * Vignettes du parcours de réclamation.
 *
 * La charte proscrit les illustrations décoratives, et cette rigueur sert
 * partout où la plateforme doit inspirer le sérieux — la fiche, les
 * statistiques, les informations légales. Elle dessert le tunnel : quelqu'un
 * qui vient de se faire avoir arrive en colère, et une page tout en filets
 * gris lui parle comme un formulaire d'administration.
 *
 * SignalConso, qui est pourtant une administration, fait l'inverse : quatre
 * grandes illustrations racontent le parcours sur sa page d'accueil. C'est ce
 * qui la rend abordable.
 *
 * D'où ces vignettes, et les limites qu'elles s'imposent : des objets et non
 * des personnages, un seul trait, la couleur institutionnelle, aucun aplat,
 * aucune ombre. Elles racontent sans amuser. Purement décoratives, elles sont
 * masquées aux lecteurs d'écran — le texte à côté dit déjà tout.
 */

const COMMUN = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
  focusable: "false" as const,
};

/** Votre situation : un formulaire que l'on remplit. */
export function VignetteSituation({ taille = 64 }: { taille?: number }): ReactElement {
  return (
    <svg {...COMMUN} width={taille} height={taille}>
      <path d="M14 8h26l10 10v38H14z" />
      <path d="M40 8v10h10" />
      <path d="M21 30h22M21 38h22M21 46h13" />
    </svg>
  );
}

/** Votre courrier : une lettre qui cite un texte. */
export function VignetteCourrier({ taille = 64 }: { taille?: number }): ReactElement {
  return (
    <svg {...COMMUN} width={taille} height={taille}>
      <path d="M10 14h44v36H10z" />
      <path d="M10 14l22 16 22-16" />
      {/* La marque de l'article cité : ce qui distingue ce courrier d'un mot. */}
      <path d="M20 44h10" strokeWidth={3} />
    </svg>
  );
}

/** L'envoi : c'est le consommateur qui poste, jamais la plateforme. */
export function VignetteEnvoi({ taille = 64 }: { taille?: number }): ReactElement {
  return (
    <svg {...COMMUN} width={taille} height={taille}>
      <path d="M12 34l40-20-8 40-12-12z" />
      <path d="M32 42l-8 8v-8" />
      <path d="M52 14L32 42" />
    </svg>
  );
}

/** Les échéances : le délai que le professionnel doit tenir. */
export function VignetteEcheance({ taille = 64 }: { taille?: number }): ReactElement {
  return (
    <svg {...COMMUN} width={taille} height={taille}>
      <path d="M10 16h44v38H10z" />
      <path d="M10 26h44M22 10v10M42 10v10" />
      <path d="M23 40l6 6 12-12" />
    </svg>
  );
}

export const PARCOURS = [
  {
    Vignette: VignetteSituation,
    titre: "Vous décrivez votre situation",
    desc: "Quelques choix fermés et vos dates. Une minute environ.",
  },
  {
    Vignette: VignetteCourrier,
    titre: "Nous rédigeons votre courrier",
    desc: "Avec le délai applicable et l’article qui le fonde.",
  },
  {
    Vignette: VignetteEnvoi,
    titre: "Vous l’envoyez au professionnel",
    desc: "C’est vous qui postez : Recours France ne le fait pas à votre place.",
  },
  {
    Vignette: VignetteEcheance,
    titre: "Vous suivez vos échéances",
    desc: "Et vous seul déclarez si votre problème a été résolu.",
  },
] as const;
