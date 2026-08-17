import Link from "next/link";
import type { ReactNode } from "react";

const DEMO = process.env.DEMO_BANNER !== "false";

/**
 * Deux habillages coexistent :
 *  — « standard » : charte cobalt du handoff initial (accueil, annuaire, formulaires) ;
 *  — « institutionnel » : charte bleu marine du handoff dédié à la fiche entreprise
 *    (conteneur 1180 px, logotype 38 px, action principale marine).
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
        <span>
          Recours France est un service privé indépendant. Il n’est ni un service de l’État, ni une
          autorité administrative.
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
  return (
    <Link href="/" className="rf-logo" style={institutionnel ? { gap: 14 } : undefined}>
      <span
        className="rf-logo__marque"
        aria-hidden="true"
        style={institutionnel ? { width: 38, height: 38, fontSize: 14 } : undefined}
      >
        RF
      </span>
      <span>
        <span
          className="rf-logo__nom"
          style={institutionnel ? { display: "block", fontSize: 19, color: "var(--rfi-marine)" } : { display: "block" }}
        >
          Recours France
        </span>
        <span
          className="rf-logo__baseline"
          style={institutionnel ? { display: "block", fontSize: 11.5, marginTop: 1 } : { display: "block" }}
        >
          {baseline}
        </span>
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
  navActive?: "annuaire" | "espace" | "methodologie" | "aide";
  habillage?: Habillage;
};

export function Entete({ baseline, recherche, valeurRecherche, sansCta, navActive, habillage = "standard" }: EnteteProps) {
  const institutionnel = habillage === "institutionnel";
  return (
    <header className="rf-entete">
      <div className={conteneur(habillage)} style={institutionnel ? { paddingTop: 16, paddingBottom: 16 } : undefined}>
        <Logo baseline={baseline} habillage={habillage} />

        {recherche ? (
          <form className="rf-entete__recherche" action="/entreprises" role="search">
            <label className="rf-vh" htmlFor="recherche-entete">
              Rechercher une entreprise
            </label>
            <input
              id="recherche-entete"
              className="rf-input"
              type="search"
              name="q"
              defaultValue={valeurRecherche}
              placeholder="Nom, raison sociale ou SIREN"
            />
            <button type="submit" className={`rf-btn ${institutionnel ? "rf-btn--marine" : "rf-btn--primaire"}`}>
              Rechercher
            </button>
          </form>
        ) : null}

        <nav className="rf-nav" aria-label="Navigation principale" style={institutionnel ? { gap: 22 } : undefined}>
          {recherche && !institutionnel ? null : navActive === "annuaire" ? (
            <span className="rf-nav__actif">Annuaire des entreprises</span>
          ) : (
            <Link href="/entreprises">Annuaire des entreprises</Link>
          )}
          {institutionnel ? null : navActive === "espace" ? (
            <span className="rf-nav__actif">Mon espace</span>
          ) : (
            <Link href="/mon-espace">Mon espace</Link>
          )}
          {recherche && !institutionnel ? null : navActive === "aide" ? (
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
    <nav className="rf-fil" aria-label="Fil d’Ariane">
      <div className={conteneur(habillage)} style={institutionnel ? { paddingTop: 9, paddingBottom: 9 } : undefined}>
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
              <div style={{ display: "flex", alignItems: "center", gap: institutionnel ? 13 : 14, marginBottom: 14 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: institutionnel ? 34 : 38,
                    height: institutionnel ? 34 : 38,
                    background: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--rf-cobalt-fonce)",
                    fontSize: institutionnel ? 13 : 14,
                    fontWeight: 700,
                    letterSpacing: ".04em",
                  }}
                >
                  RF
                </span>
                <span
                  style={{ fontSize: institutionnel ? 17 : 18, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.015em" }}
                >
                  Recours France
                </span>
              </div>
              <p className="rf-pied__texte">
                Plateforme privée indépendante de signalement des litiges de consommation, éditée par
                Recours France SAS. Sans lien avec l’État, une administration ou une autorité publique.
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
                <Link href="/aide/justificatifs">Quels justificatifs fournir</Link>
                <Link href="/mon-espace">Retrouver mon signalement</Link>
              </div>
            </div>
            <div>
              <div className="rf-pied__titre">Comprendre</div>
              <div className="rf-pied__liens">
                <Link href="/methodologie">Méthodologie</Link>
                <Link href="/methodologie#m2">Dossier déclaré ou vérifié</Link>
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
          <span>Recours France SAS — service privé indépendant, sans mission de service public.</span>
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
