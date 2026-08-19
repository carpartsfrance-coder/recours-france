/**
 * Interrupteurs de fonctionnalités, pilotables sans redéploiement.
 */

/**
 * Publication des avis de consommateurs.
 *
 * Fermée par défaut au MVP, pour deux raisons qui se renforcent :
 *
 *  — cohérence. La règle métier n° 7 interdit de publier le texte libre d'un
 *    signalement : le résumé visible est généré à partir de données
 *    structurées. Publier le texte libre d'un avis reviendrait à ouvrir par la
 *    fenêtre ce qu'on a fermé à la porte.
 *
 *  — capacité. Un avis est une opinion publiée sur une entreprise nommée. Sans
 *    modération réelle, la première injure ou accusation pénale reste en ligne.
 *    Contrairement aux signalements, rien ici ne peut être tranché
 *    mécaniquement : il n'existe pas d'équivalent de la règle du silence.
 *
 * Le code reste entier et testé. `AVIS_ACTIFS=true` rouvre la fonctionnalité le
 * jour où la modération existe.
 */
export const AVIS_ACTIFS = process.env.AVIS_ACTIFS === "true";
