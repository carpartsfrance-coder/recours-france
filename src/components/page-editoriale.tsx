import type { ReactNode } from "react";
import { Page } from "@/components/chrome";

export type SectionEditoriale = {
  id?: string;
  titre: string;
  contenu: ReactNode;
};

/** Gabarit des pages de contenu : légales, aide, à propos. */
export function PageEditoriale({
  titre,
  chapo,
  fil,
  sections,
  aside,
  maj,
}: {
  titre: string;
  chapo?: ReactNode;
  fil: string;
  sections: SectionEditoriale[];
  aside?: ReactNode;
  maj?: string;
}) {
  return (
    <Page fil={[{ libelle: fil }]}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 24px" }}>
        <div style={{ maxWidth: 820 }}>
          <h1 className="rf-h1" style={{ fontSize: 38 }}>
            {titre}
          </h1>
          {chapo ? (
            <div className="rf-chapo rf-mt-16" style={{ fontSize: 17, lineHeight: 1.65 }}>
              {chapo}
            </div>
          ) : null}
          {maj ? <p className="rf-legende rf-mt-14">Dernière mise à jour : {maj}</p> : null}
        </div>
      </div>

      <div className="rf-conteneur rf-deux-colonnes--etroite" style={{ padding: "0 32px 56px" }}>
        <div className="rf-pile" style={{ gap: 20 }}>
          {sections.map((s, i) => (
            <section key={s.titre} className="rf-carte" id={s.id}>
              <div className="rf-carte__tete" style={{ display: "block" }}>
                <h2 className="rf-h2 rf-h2--secondaire" style={{ fontSize: 20 }}>
                  {i + 1}. {s.titre}
                </h2>
              </div>
              <div className="rf-carte__corps rf-texte" style={{ fontSize: 14.5, lineHeight: 1.7 }}>
                {s.contenu}
              </div>
            </section>
          ))}
        </div>

        <aside className="rf-rail" style={{ position: "sticky", top: 24 }}>
          <nav className="rf-carte" aria-label="Sommaire">
            <div className="rf-carte__tete rf-carte__tete--simple">
              <span className="rf-etiquette">Sur cette page</span>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
              {sections.map((s, i) => (
                <a
                  key={s.titre}
                  href={`#${s.id ?? `s${i + 1}`}`}
                  style={{ fontSize: 13.5, color: "var(--rf-encre)", textDecoration: "none" }}
                >
                  {i + 1}. {s.titre}
                </a>
              ))}
            </div>
          </nav>
          {aside}
        </aside>
      </div>
    </Page>
  );
}

/** Liste à puces cobalt, réutilisée dans les pages de contenu. */
export function ListePuces({ items }: { items: ReactNode[] }) {
  return (
    <ul className="rf-pile rf-pile--serree rf-mt-10" style={{ gap: 9 }}>
      {items.map((item, i) => (
        <li key={i} className="rf-item">
          <span className="rf-puce rf-puce--sm rf-puce--doux" aria-hidden="true">
            ✓
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
