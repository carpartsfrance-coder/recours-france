import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { nomEditeur } from "@/lib/editeur";
import { Info } from "@/components/refonte/icones";
import { GUIDES } from "@/lib/observatoire";

/**
 * Logotype fourni. Le verrou complet (pictogramme + nom + signature) sert là où
 * il y a de la place ; en en-tête, seul le pictogramme est repris, le nom
 * restant du texte — sinon la signature devient illisible à cette hauteur.
 */
const LOGO = {
  verrou: "/recours-france.png",
  verrouBlanc: "/recours-france-blanc.png",
  picto: "/pictogramme-rf.png",
  pictoBlanc: "/pictogramme-rf-blanc.png",
  ratioVerrou: 1205 / 325,
  // Pictogramme + filet tricolore : le filet fait partie de la marque.
  ratioPicto: 352 / 309,
};

// Comparaison insensible a la casse et aux espaces. Le reglage se saisit a la
// main dans le tableau de bord de l'hebergeur, ou « False » se tape aussi
// naturellement que « false » — et ne correspondait a rien, laissant le
// bandeau « donnees fictives » sur un site de production.
//
// Le sens du test ne change pas : le bandeau s'affiche par defaut. Se tromper
// doit donner un site trop prudent, jamais un site qui se pretend reel a tort.
const DEMO = (process.env.DEMO_BANNER ?? "").trim().toLowerCase() !== "false";

/**
 * Deux habillages coexistent :
 *  — « standard » : charte cobalt du handoff initial (accueil, annuaire, formulaires) ;
 *  — « institutionnel » : charte bleu #2563EB du handoff dédié à la fiche
 *    entreprise (conteneur 1180 px, logotype 38 px, blocs encadrés, onglets).
 */
export type Habillage = "standard" | "institutionnel";

function conteneur(habillage: Habillage): string {
  return habillage === "institutionnel" ? "rfi-conteneur" : "rf-conteneur";
}

/**
 * Bandeau d'indépendance — doit rester visible sur TOUTES les pages
 * (contrainte juridique du handoff, non contournable).
 */
export function BandeauIndependance({ habillage = "standard" }: { habillage?: Habillage }) {
  return (
    <div className="rf-bandeau-independance">
      <div className={conteneur(habillage)}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {/* Formulation imposée par le handoff, au mot près. */}
          <Info taille={16} style={{ flex: "none", color: "var(--rf-sur-marine-attenue)" }} />
          Plateforme privée et indépendante d’aide aux litiges de consommation — sans lien avec
          l’État.
        </span>
        {DEMO ? (
          <span style={{ color: "var(--rf-sur-nuit-attenue)" }}>Démonstration — données fictives</span>
        ) : null}
      </div>
    </div>
  );
}

export function Logo({
  baseline = "Signalement des litiges de consommation",
  habillage = "standard",
}: {
  baseline?: string;
  habillage?: Habillage;
}) {
  const institutionnel = habillage === "institutionnel";
  const hauteur = institutionnel ? 38 : 42;
  return (
    <Link href="/" className={`rf-logo${institutionnel ? " rf-logo--institutionnel" : ""}`}>
      <Image
        src={LOGO.picto}
        alt=""
        aria-hidden="true"
        width={Math.round(hauteur * LOGO.ratioPicto)}
        height={hauteur}
        className="rf-logo__picto"
        priority
      />
      <span>
        <span className="rf-logo__nom">Recours France</span>
        <span className="rf-logo__baseline">{baseline}</span>
      </span>
    </Link>
  );
}

type EnteteProps = {
  baseline?: string;
  /** Affiche le champ de recherche central (annuaire). */
  recherche?: boolean;
  valeurRecherche?: string;
  /** Masque le bouton d'appel à l'action (page de signalement). */
  sansCta?: boolean;
  navActive?: "annuaire" | "boutiques" | "espace" | "methodologie" | "aide";
  habillage?: Habillage;
};

export function Entete({ baseline, recherche, valeurRecherche, sansCta, navActive, habillage = "standard" }: EnteteProps) {
  const institutionnel = habillage === "institutionnel";
  return (
    <header className={`rf-entete${institutionnel ? " rf-entete--institutionnel" : ""}`}>
      <div className={conteneur(habillage)}>
        <Logo baseline={baseline} habillage={habillage} />

        {recherche || institutionnel ? (
          <form
            className={`rf-entete__recherche${institutionnel ? " rf-entete__recherche--institutionnel" : ""}`}
            action="/entreprises"
            role="search"
          >
            <label className="rf-vh" htmlFor="recherche-entete">
              Rechercher une entreprise
            </label>
            <input
              id="recherche-entete"
              className="rf-input"
              type="search"
              name="q"
              defaultValue={valeurRecherche}
              placeholder={institutionnel ? "Nom, adresse, n° SIRET/SIREN…" : "Nom, raison sociale ou SIREN"}
            />
            <button type="submit" className={`rf-btn ${institutionnel ? "rf-btn--marine" : "rf-btn--primaire"}`}>
              Rechercher
            </button>
          </form>
        ) : null}

        <nav className="rf-nav" aria-label="Navigation principale">
          {recherche || institutionnel ? null : navActive === "annuaire" ? (
            <span className="rf-nav__actif">Annuaire des entreprises</span>
          ) : (
            <Link href="/entreprises">Annuaire des entreprises</Link>
          )}
          {recherche || institutionnel ? null : navActive === "boutiques" ? (
            <span className="rf-nav__actif">Boutiques en ligne</span>
          ) : (
            <Link href="/boutiques">Boutiques en ligne</Link>
          )}
          {institutionnel ? null : navActive === "espace" ? (
            <span className="rf-nav__actif">Mon espace</span>
          ) : (
            <Link href="/mon-espace">Mon espace</Link>
          )}
          {navActive === "aide" ? (
            <span className="rf-nav__actif">Aide</span>
          ) : (
            <Link href="/aide">Aide</Link>
          )}
          {sansCta ? null : (
            <Link href="/signaler" className={`rf-btn ${institutionnel ? "rf-btn--marine" : "rf-btn--primaire"}`}>
              Signaler un litige
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export type MailleFil = { libelle: string; href?: string };

export function FilAriane({ items, habillage = "standard" }: { items: MailleFil[]; habillage?: Habillage }) {
  const institutionnel = habillage === "institutionnel";
  const styleLien = institutionnel
    ? { color: "var(--rf-texte-3)", textDecoration: "none" as const }
    : undefined;
  return (
    <nav className={`rf-fil${institutionnel ? " rf-fil--institutionnel" : ""}`} aria-label="Fil d’Ariane">
      <div className={conteneur(habillage)}>
        <Link href="/" style={styleLien}>
          Accueil
        </Link>
        {items.map((item, i) => (
          <span key={`${item.libelle}-${i}`}>
            <span className="rf-fil__sep" aria-hidden="true">
              ›
            </span>
            {item.href ? (
              <Link href={item.href} style={styleLien}>
                {item.libelle}
              </Link>
            ) : (
              <span style={institutionnel ? { color: "var(--rf-encre)" } : undefined} className={institutionnel ? undefined : "rf-fil__actuel"}>
                {item.libelle}
              </span>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}

export function PiedDePage({
  complet = true,
  habillage = "standard",
}: {
  complet?: boolean;
  habillage?: Habillage;
}) {
  const institutionnel = habillage === "institutionnel";
  const classe = conteneur(habillage);
  return (
    <footer className="rf-pied">
      {complet ? (
        <div className={classe}>
          <div
            className="rf-pied__colonnes"
            style={institutionnel ? { paddingTop: 34, paddingBottom: 22 } : undefined}
          >
            <div>
              <Image
                src={LOGO.verrouBlanc}
                alt="Recours France — vos droits, notre engagement"
                width={Math.round(52 * LOGO.ratioVerrou)}
                height={52}
                className="rf-pied__logo"
              />
              <p className="rf-pied__texte">
                Plateforme privée indépendante de signalement des litiges de consommation, éditée par {nomEditeur()}. Sans lien avec l’État, une administration ou une autorité publique.
              </p>
              {institutionnel ? null : (
                <p className="rf-pied__texte rf-mt-12" style={{ color: "var(--rf-sur-nuit-attenue)" }}>
                  Les fiches d’entreprise combinent des données publiques ouvertes (Sirene, INPI/RNE,
                  BODACC) et des signalements de consommateurs, dont le niveau de vérification est affiché.
                </p>
              )}
            </div>
            <div>
              <div className="rf-pied__titre">Signaler</div>
              <div className="rf-pied__liens">
                <Link href="/signaler">Signaler un litige</Link>
                <Link href="/entreprises">Annuaire des entreprises</Link>
                <Link href="/boutiques">Boutiques en ligne</Link>
                <Link href="/aide/justificatifs">Quels justificatifs fournir</Link>
                <Link href="/mon-espace">Retrouver mon signalement</Link>
              </div>
            </div>
            <div>
              {/* Les guides de démarche, plutôt que trois liens vers la même
                  page de méthodologie. Ce sont les pages d'acquisition du
                  site — les seules qui ne dépendent d'aucune donnée, donc les
                  seules à pouvoir capter du trafic avant que les fiches
                  n'existent — et elles étaient orphelines. */}
              <div className="rf-pied__titre">Vos démarches</div>
              <div className="rf-pied__liens">
                {GUIDES.slice(0, 6).map((g) => (
                  <Link key={g.href} href={g.href}>
                    {g.libelle}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="rf-pied__titre">Comprendre</div>
              <div className="rf-pied__liens">
                <Link href="/methodologie">Méthodologie</Link>
                <Link href="/methodologie#m1">Origine des données</Link>
                <Link href="/charte-de-moderation">Charte de modération</Link>
              </div>
            </div>
            <div>
              <div className="rf-pied__titre">Le service</div>
              <div className="rf-pied__liens">
                <Link href="/a-propos">À propos et indépendance</Link>
                <Link href="/contact">Nous contacter</Link>
                <Link href="/aide">Aide</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="rf-pied__barre">
        <div className={classe}>
          <div className="rf-pied__legaux">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/conditions-generales">Conditions générales</Link>
            <Link href="/donnees-personnelles">Données personnelles</Link>
            <Link href="/accessibilite">Accessibilité</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
          <span>{nomEditeur()} — service privé indépendant, sans mission de service public.</span>
        </div>
      </div>
    </footer>
  );
}

/** Gabarit standard : bandeau + en-tête + fil d'Ariane + contenu + pied de page. */
export function Page({
  children,
  entete,
  fil,
  piedComplet = true,
  habillage = "standard",
}: {
  children: ReactNode;
  entete?: EnteteProps;
  fil?: MailleFil[];
  piedComplet?: boolean;
  habillage?: Habillage;
}) {
  return (
    <div className={habillage === "institutionnel" ? "rfi" : undefined}>
      <BandeauIndependance habillage={habillage} />
      <Entete {...entete} habillage={habillage} />
      {fil ? <FilAriane items={fil} habillage={habillage} /> : null}
      <main id="contenu">{children}</main>
      <PiedDePage complet={piedComplet} habillage={habillage} />
    </div>
  );
}
