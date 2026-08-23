/**
 * Typographie française : les espaces insécables que le HTML n'insère pas.
 *
 * Le handoff l'exige explicitement — « prévoir un utilitaire de typographie
 * française appliqué à toute chaîne rendue ». Sans lui, une fin de ligne tombe
 * entre le mot et son point d'interrogation, et « Que faire\n? » signe l'amateur
 * sur une page qui vend précisément du sérieux.
 *
 * La règle appliquée est celle du handoff : U+00A0 avant « : ; ! ? » » et après
 * « « ». L'usage de l'Imprimerie nationale voudrait une espace fine (U+202F)
 * devant « ; ! ? » ; on suit le handoff, dont la copie est validée.
 *
 * Deux pièges évités, parce qu'ils défigurent le texte au lieu de l'améliorer :
 * le deux-points d'une URL (« https://… ») et celui d'une heure (« 10:30 ») ne
 * sont pas de la ponctuation. On ne traite donc que le deux-points suivi d'une
 * espace ou d'une fin de chaîne, ce qui est la définition même de son emploi
 * ponctuant.
 *
 * À n'appliquer qu'à des chaînes éditoriales. Une URL, un domaine ou une
 * adresse électronique passent tels quels.
 */

const INSECABLE = " ";

/** Espaces déjà présentes, quelle que soit leur nature, avant remplacement. */
const ESPACES = "[ \\t\\u00A0\\u202F]*";

export function typo(texte: string): string {
  return (
    texte
      // Après le guillemet ouvrant.
      .replace(new RegExp(`«${ESPACES}`, "g"), `«${INSECABLE}`)
      // Avant les ponctuations hautes et le guillemet fermant. Le caractère
      // précédent doit exister : une chaîne ouverte par « ? » n'est pas une
      // ponctuation à espacer.
      .replace(new RegExp(`(\\S)${ESPACES}([;!?»])`, "g"), `$1${INSECABLE}$2`)
      // Avant le deux-points, seulement lorsqu'il ponctue.
      .replace(new RegExp(`(\\S)${ESPACES}:(?=[ \\t\\u00A0\\u202F]|$)`, "g"), `$1${INSECABLE}:`)
  );
}

/**
 * Version litérale, pour la copie interpolée : fr`Avis sur ${domaine} : litiges`.
 *
 * Les valeurs interpolées sont insérées avant traitement — un domaine ne
 * contient ni ponctuation haute ni guillemet, et la ponctuation qui l'entoure
 * doit être espacée comme le reste.
 */
export function fr(fragments: TemplateStringsArray, ...valeurs: unknown[]): string {
  return typo(fragments.reduce((acc, f, i) => acc + String(valeurs[i - 1] ?? "") + f));
}
