import type { ReactElement } from "react";

/**
 * Scènes du parcours de réclamation.
 *
 * La charte proscrit l'illustration, et cette rigueur sert la fiche
 * entreprise — qui publie des reproches contre des sociétés nommées, et où
 * l'austérité vaut caution. Elle dessert le tunnel : quelqu'un qui vient de se
 * faire avoir arrive en colère, et une page tout en filets gris lui parle
 * comme un guichet.
 *
 * SignalConso, pourtant administration, tranche dans l'autre sens : quatre
 * illustrations de 226 × 224 pixels, de front, immédiatement sous le titre.
 * C'est ce qui rend sa page abordable. Son design même reste hors d'atteinte —
 * police Marianne, classes fr-*, bloc-marque de la République : le Système de
 * Design de l'État est réservé à l'État, et l'emprunter ferait passer Recours
 * France pour un service public, ce que son bandeau dément à chaque page.
 *
 * Ces scènes reprennent donc l'échelle et la chaleur, jamais les éléments. Un
 * aplat, pas de contour, une palette tirée de la charte augmentée d'un ton
 * chaud pour les carnations. Elles sont décoratives : le texte à côté dit tout,
 * et les lecteurs d'écran les ignorent.
 */

/** Palette : les bleus de la charte, plus un sable qui réchauffe sans jurer. */
const BLEU = "#0956B9";
const PROFOND = "#063777";
const CLAIR = "#EDF2F9";
const SABLE = "#E8D5BC";
const PALE = "#C6D6F5";

const CADRE = {
  viewBox: "0 0 200 200",
  "aria-hidden": true as const,
  focusable: "false" as const,
};

/** 1 — Le consommateur devant sa commande qui pose problème. */
export function SceneSituation({ taille = 200 }: { taille?: number }): ReactElement {
  return (
    <svg {...CADRE} width={taille} height={taille}>
      <circle cx="100" cy="100" r="88" fill={CLAIR} />
      {/* Le colis, en bas à droite, laissé au sol */}
      <rect x="104" y="104" width="64" height="52" rx="3" fill={BLEU} />
      <rect x="104" y="104" width="64" height="14" rx="3" fill={PROFOND} />
      <rect x="130" y="104" width="12" height="52" fill={PALE} />
      {/* Le point d'interrogation, au-dessus et lisible */}
      <path
        d="M118 66c0-11 9-19 20-19s20 8 20 19c0 12-14 13-16 22"
        fill="none"
        stroke={PROFOND}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="121" cy="96" r="6" fill={PROFOND} />
      {/* La personne, à gauche, un peu en retrait */}
      <circle cx="60" cy="78" r="21" fill={SABLE} />
      <path d="M60 57a21 21 0 0 1 21 19 36 36 0 0 0-42 0 21 21 0 0 1 21-19z" fill={PROFOND} />
      <path d="M32 156c0-19 13-34 28-34s28 15 28 34z" fill={BLEU} />
      <rect x="28" y="156" width="144" height="7" rx="3.5" fill={PALE} />
    </svg>
  );
}

/** 2 — La lettre, avec le texte qu'elle cite. */
export function SceneCourrier({ taille = 200 }: { taille?: number }): ReactElement {
  return (
    <svg {...CADRE} width={taille} height={taille}>
      <circle cx="100" cy="100" r="88" fill={CLAIR} />
      {/* Le courrier, grand, tenu de face */}
      <rect x="56" y="40" width="94" height="116" rx="3" fill="#fff" />
      <rect x="56" y="40" width="94" height="116" rx="3" fill="none" stroke={PALE} strokeWidth="3" />
      <rect x="72" y="60" width="46" height="7" rx="3.5" fill={PROFOND} />
      <rect x="72" y="80" width="62" height="5" rx="2.5" fill={PALE} />
      <rect x="72" y="94" width="62" height="5" rx="2.5" fill={PALE} />
      <rect x="72" y="108" width="40" height="5" rx="2.5" fill={PALE} />
      {/* L'article cité : ce qui distingue ce courrier d'un simple mot */}
      <rect x="72" y="126" width="54" height="9" rx="4.5" fill={BLEU} />
      {/* Le sceau */}
      <circle cx="140" cy="136" r="18" fill={BLEU} />
      <path
        d="M132 136l6 6 11-12"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 3 — L'envoi : c'est le consommateur qui poste, jamais la plateforme. */
export function SceneEnvoi({ taille = 200 }: { taille?: number }): ReactElement {
  return (
    <svg {...CADRE} width={taille} height={taille}>
      <circle cx="100" cy="100" r="88" fill={CLAIR} />
      {/* L'enveloppe, penchée, sur le point d'être glissée */}
      <g transform="rotate(-14 100 66)">
        <rect x="68" y="38" width="64" height="44" rx="3" fill="#fff" />
        <rect x="68" y="38" width="64" height="44" rx="3" fill="none" stroke={PALE} strokeWidth="3" />
        <path d="M68 40l32 23 32-23" fill="none" stroke={BLEU} strokeWidth="4" strokeLinejoin="round" />
      </g>
      {/* La boîte aux lettres */}
      <rect x="62" y="96" width="76" height="58" rx="6" fill={BLEU} />
      <rect x="76" y="112" width="48" height="9" rx="4.5" fill={PROFOND} />
      <rect x="94" y="154" width="12" height="26" fill={PROFOND} />
      <rect x="76" y="178" width="48" height="8" rx="4" fill={PROFOND} />
    </svg>
  );
}

/** 4 — Le suivi : les délais, et la mise à jour que vous seul déclarez. */
export function SceneEcheance({ taille = 200 }: { taille?: number }): ReactElement {
  return (
    <svg {...CADRE} width={taille} height={taille}>
      <circle cx="100" cy="100" r="88" fill={CLAIR} />
      {/* Le calendrier */}
      <rect x="46" y="52" width="108" height="104" rx="6" fill="#fff" />
      <rect x="46" y="52" width="108" height="104" rx="6" fill="none" stroke={PALE} strokeWidth="3" />
      <path d="M46 58a6 6 0 0 1 6-6h96a6 6 0 0 1 6 6v20H46z" fill={BLEU} />
      <rect x="68" y="40" width="8" height="24" rx="4" fill={PROFOND} />
      <rect x="124" y="40" width="8" height="24" rx="4" fill={PROFOND} />
      {/* Les jours qui passent */}
      <g fill={PALE}>
        <circle cx="68" cy="96" r="6" />
        <circle cx="92" cy="96" r="6" />
        <circle cx="116" cy="96" r="6" />
        <circle cx="140" cy="96" r="6" />
        <circle cx="68" cy="122" r="6" />
      </g>
      {/* L'échéance */}
      <circle cx="112" cy="126" r="24" fill={BLEU} />
      <path
        d="M101 126l8 8 15-16"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Le parcours, raconté par ce qu'il apporte.
 *
 * Les légendes décrivaient des étapes, et deux d'entre elles étaient des
 * avertissements — « Recours France ne le fait pas à votre place », « vous seul
 * déclarez ». Au milieu de la section qui doit donner confiance, la page
 * s'excusait deux fois.
 *
 * Elles racontent maintenant ce que la personne obtient, dans l'ordre où elle
 * l'obtiendra : une minute, une lettre, une entreprise tenue de répondre, et
 * une suite si rien ne bouge. Aucune promesse de résultat — nous ne garantissons
 * aucune réponse — mais aucune excuse non plus.
 *
 * Ce que nous ne faisons pas reste expliqué en colonne d'appui, où c'est un
 * argument, et dans le bandeau de chaque page, où c'est une obligation.
 */
export const PARCOURS = [
  {
    Scene: SceneSituation,
    titre: "Vous dites ce qui s’est passé",
    desc: "Quelques clics. Une minute, pas plus.",
  },
  {
    Scene: SceneCourrier,
    titre: "Vous repartez avec la bonne lettre",
    desc: "Celle qui cite la loi et fixe une date limite à l’entreprise.",
  },
  {
    Scene: SceneEnvoi,
    titre: "L’entreprise reçoit une vraie réclamation",
    desc: "Datée, fondée en droit. C’est ce à quoi un service client doit répondre.",
  },
  {
    Scene: SceneEcheance,
    titre: "Et si rien ne bouge, vous avez la suite",
    desc: "Le médiateur, gratuit. Vous saurez quand et comment le saisir.",
  },
] as const;
