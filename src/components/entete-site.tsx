import Link from "next/link";
import { Logo } from "@/components/fiche-entreprise/logo";
import { MenuSite } from "@/components/menu-site";
import { Loupe } from "@/components/refonte/icones";
import { typo } from "@/lib/typographie";
import { NAV_SITE } from "@/lib/navigation";

/**
 * L'en-tête du site, le même sur toutes les pages.
 *
 * Il vient de la fiche entreprise, où le handoff institutionnel l'a dessiné :
 * logotype, champ de recherche, trois liens en capitales espacées, appel à
 * l'action navy. Il en est sorti tel quel — trois en-têtes différents pour un
 * même site, c'était trois marques.
 *
 * La recherche vise `/entreprises`, seule page qui traite le paramètre `q`.
 * Sur la fiche, ce formulaire pointait vers `/annuaire`, qui l'ignore : toute
 * recherche lancée depuis une fiche retombait sur la liste des secteurs.
 *
 * Deux paramètres, pas plus. `cta` est retiré là où le bouton renverrait à la
 * page en cours — la page de dépôt, l'espace de suivi. `quitter` le remplace
 * dans le parcours de dépôt, où il est la seule sortie assumée.
 */
export function EnteteSite({
  cta = "/signaler",
  ctaLibelle = "Commencer mes démarches",
  quitter,
  valeurRecherche,
}: {
  cta?: string | null;
  ctaLibelle?: string;
  quitter?: string;
  valeurRecherche?: string;
}) {
  return (
    <header className="rfh">
      <div className="rfh__piste">
        <Logo taille={38} />

        <form action="/entreprises" className="rfh-recherche" role="search">
          <Loupe taille={17} />
          <input
            type="search"
            name="q"
            defaultValue={valeurRecherche}
            placeholder="Rechercher une entreprise ou un SIREN"
            aria-label="Rechercher une entreprise ou un SIREN"
          />
        </form>

        <nav className="rfh-nav" aria-label="Navigation principale">
          {NAV_SITE.map((l) => (
            <Link key={l.href} href={l.href}>
              {typo(l.libelle)}
            </Link>
          ))}
        </nav>

        {quitter ? (
          <Link href={quitter} className="rfh-quitter">
            Quitter
          </Link>
        ) : null}

        {cta ? (
          <Link href={cta} className="rfh-cta">
            {typo(ctaLibelle)}
          </Link>
        ) : null}

        {/* Sous neuf cents pixels, la recherche, la navigation et l'appel à
            l'action cèdent la place à ce seul bouton. */}
        <MenuSite />
      </div>
    </header>
  );
}
