/**
 * La navigation principale, telle que l'en-tête institutionnel la dessine.
 *
 * Trois liens, pas quatre : c'est le handoff qui fixe ce nombre. « Mon
 * espace » et « Boutiques en ligne » quittent la barre du haut et restent
 * atteignables depuis le pied de page.
 *
 * Elle vit ici, et non dans le composant d'en-tête, pour que le menu des
 * écrans étroits — un composant client — puisse la lire sans entraîner tout
 * l'en-tête dans le paquet du navigateur.
 */
export const NAV_SITE = [
  { href: "/methodologie", libelle: "Comment ça marche" },
  { href: "/annuaire", libelle: "Entreprises" },
  { href: "/aide", libelle: "Guides" },
] as const;
