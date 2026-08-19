import Link from "next/link";
import { formatNombre } from "@/lib/format";
import {
  cheminCommune,
  cheminDepartement,
  cheminSecteur,
  libelleSecteur,
  nomDepartement,
  type Voisine,
} from "@/lib/maillage";

/**
 * Liens d'une fiche vers ses semblables.
 *
 * Sans eux, chaque fiche est un cul-de-sac : un robot qui y entre en ressort
 * sans avoir rien découvert d'autre. Les annuaires installés doivent leur
 * exploration à cette densité de liens — une fiche de societe.com en compte
 * près de cent vers d'autres sociétés — et non à un plan de site, qu'aucun des
 * deux grands ne publie.
 *
 * Ces liens servent d'abord le lecteur : quand on cherche un recours contre un
 * garage, connaître les autres garages de la commune a une valeur propre.
 */
export function Voisines({
  secteur,
  departement,
  commune,
  memeVille,
  memeDepartement,
  memeSecteur,
}: {
  secteur: string | null;
  departement: string | null;
  commune: string | null;
  memeVille: Voisine[];
  memeDepartement: Voisine[];
  memeSecteur: Voisine[];
}) {
  if (!secteur) return null;
  const libelle = libelleSecteur(secteur);
  const nomDept = departement ? nomDepartement(departement) : null;

  const hrefSecteur = cheminSecteur(secteur);
  const hrefDept = departement ? cheminDepartement(secteur, departement) : null;
  const hrefCommune = departement && commune ? cheminCommune(secteur, departement, commune) : null;

  const groupes = [
    commune ? { titre: `${libelle} à ${commune}`, href: hrefCommune, lignes: memeVille } : null,
    nomDept ? { titre: `${libelle} dans ${nomDept}`, href: hrefDept, lignes: memeDepartement } : null,
    { titre: `Autres entreprises du secteur ${libelle.toLowerCase()}`, href: hrefSecteur, lignes: memeSecteur },
  ].filter((g): g is { titre: string; href: string | null; lignes: Voisine[] } => !!g && g.lignes.length > 0);

  if (groupes.length === 0) return null;

  return (
    <div className="rfi-conteneur" style={{ padding: "6px 32px 8px" }}>
      <section className="rfi-bloc">
        <div className="rfi-bloc__tete">
          <h2 className="rfi-pastille-titre">Entreprises comparables</h2>
        </div>

        <div className="rfi-grille" style={{ display: "grid", marginTop: 18, gap: 26 }}>
          {groupes.map((g) => (
            <div key={g.titre}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
                {g.href ? <Link href={g.href}>{g.titre}</Link> : g.titre}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 7 }}>
                {g.lignes.map((v) => (
                  <li key={v.slug} style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    <Link href={`/entreprises/${v.slug}`}>{v.denomination}</Link>
                    {v.signalements > 0 ? (
                      <span style={{ color: "var(--rf-texte-3)" }}>
                        {" "}
                        · {formatNombre(v.signalements)} litige{v.signalements > 1 ? "s" : ""}
                      </span>
                    ) : v.commune ? (
                      <span style={{ color: "var(--rf-texte-3)" }}> · {v.commune}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12.5, color: "var(--rf-texte-3)", marginTop: 18, lineHeight: 1.6 }}>
          Ce rapprochement repose sur l’activité déclarée au répertoire Sirene et sur le lieu
          d’immatriculation. Il ne constitue ni un classement ni une comparaison de qualité.
        </p>
      </section>
    </div>
  );
}
