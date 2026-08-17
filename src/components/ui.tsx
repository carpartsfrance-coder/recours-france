import type { ReactNode } from "react";
import { libelleSource, formatDate, type SourceCode } from "@/lib/format";

export function Puce({ variante = "cobalt" }: { variante?: "cobalt" | "succes" | "alerte" | "doux" | "vide" }) {
  if (variante === "succes") return <span className="rf-puce rf-puce--succes" aria-hidden="true">✓</span>;
  if (variante === "alerte") return <span className="rf-puce rf-puce--alerte" aria-hidden="true">!</span>;
  if (variante === "doux") return <span className="rf-puce rf-puce--sm rf-puce--doux" aria-hidden="true">✓</span>;
  if (variante === "vide") return <span className="rf-puce rf-puce--vide" aria-hidden="true">—</span>;
  return <span className="rf-puce" aria-hidden="true">✓</span>;
}

export function ItemCoche({
  children,
  variante = "cobalt",
}: {
  children: ReactNode;
  variante?: "cobalt" | "succes" | "alerte" | "doux" | "vide";
}) {
  return (
    <li className="rf-item">
      <Puce variante={variante} />
      <span className="rf-item__texte">{children}</span>
    </li>
  );
}

/**
 * Infobulle accessible : visible au survol ET au focus clavier,
 * rattachée au libellé par aria-describedby.
 */
export function InfoBulle({ id, texte }: { id: string; texte: string }) {
  return (
    <span className="rf-info">
      <button type="button" className="rf-info__declencheur" aria-describedby={id}>
        <span aria-hidden="true">i</span>
        <span className="rf-vh">Aide sur cet indicateur</span>
      </button>
      <span role="tooltip" id={id} className="rf-info__bulle">
        {texte}
      </span>
    </span>
  );
}

/** Tuile chiffrée avec sa base de calcul et son infobulle explicative. */
export function Tuile({
  valeur,
  libelle,
  base,
  aide,
  id,
}: {
  valeur: ReactNode;
  libelle: string;
  base?: string;
  aide?: string;
  id: string;
}) {
  return (
    <div className="rf-tuile">
      <div className="rf-tuile__valeur">{valeur}</div>
      <div className="rf-tuile__libelle">
        <span>{libelle}</span>
        {aide ? <InfoBulle id={`aide-${id}`} texte={aide} /> : null}
      </div>
      {base ? <div className="rf-tuile__base">{base}</div> : null}
    </div>
  );
}

/**
 * Mention de provenance. Règle métier n° 6 : chaque donnée affichée porte sa
 * source et sa date de synchronisation.
 */
export function Provenance({
  sources,
  date,
  prefixe = "Source",
}: {
  sources: SourceCode | SourceCode[];
  date?: Date | string | null;
  prefixe?: string;
}) {
  const liste = Array.isArray(sources) ? sources : [sources];
  return (
    <span className="rf-micro">
      {prefixe} : {liste.map(libelleSource).join(" · ")}
      {date ? ` — vérifié le ${formatDate(date)}` : ""}
    </span>
  );
}

export function BadgeVerification({ verifie, fort = false }: { verifie: boolean; fort?: boolean }) {
  if (!verifie) {
    return <span className="rf-badge rf-badge--sm rf-badge--non-verifie">Signalement non vérifié</span>;
  }
  return (
    <span className={`rf-badge rf-badge--sm ${fort ? "rf-badge--verifie" : "rf-badge--verifie-doux"}`}>
      ✓ Signalement vérifié
    </span>
  );
}

export function BadgeEtatEntreprise({ active }: { active: boolean }) {
  return active ? (
    <span className="rf-badge rf-badge--succes">
      <span className="rf-point" aria-hidden="true" style={{ background: "var(--rf-succes)" }} />
      Entreprise active
    </span>
  ) : (
    <span className="rf-badge rf-badge--erreur">Entreprise cessée</span>
  );
}

export function EnTeteSection({
  titre,
  chapo,
  aside,
  niveau = 2,
  variante,
}: {
  titre: string;
  chapo?: ReactNode;
  aside?: ReactNode;
  niveau?: 1 | 2;
  variante?: "secondaire";
}) {
  const Titre = niveau === 1 ? "h1" : "h2";
  return (
    <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
      <div className="rf-min0">
        <Titre className={variante === "secondaire" ? "rf-h2 rf-h2--secondaire" : "rf-h2"}>{titre}</Titre>
        {chapo ? (
          <div className="rf-texte rf-mesure rf-mt-8" style={{ fontSize: 14.5 }}>
            {chapo}
          </div>
        ) : null}
      </div>
      {aside ? <div className="rf-flexnone">{aside}</div> : null}
    </div>
  );
}

export function Alerte({
  type = "info",
  titre,
  children,
}: {
  type?: "info" | "succes" | "erreur" | "alerte";
  titre?: string;
  children: ReactNode;
}) {
  const classe =
    type === "succes"
      ? "rf-encart rf-encart--succes"
      : type === "erreur"
        ? "rf-encart rf-encart--erreur"
        : type === "alerte"
          ? "rf-encart rf-encart--alerte"
          : "rf-encart";
  return (
    <div className={classe} role={type === "erreur" ? "alert" : undefined}>
      {titre ? <strong style={{ display: "block", marginBottom: 4 }}>{titre}</strong> : null}
      {children}
    </div>
  );
}

/** Étoiles : rendu visuel + équivalent textuel pour les lecteurs d'écran. */
export function Etoiles({ note, gris = false }: { note: number; gris?: boolean }) {
  const pleines = Math.round(note);
  return (
    <span className={gris ? "rf-etoiles rf-etoiles--gris" : "rf-etoiles"}>
      <span aria-hidden="true">{"★".repeat(pleines) + "☆".repeat(Math.max(0, 5 - pleines))}</span>
      <span className="rf-vh">{note.toLocaleString("fr-FR")} sur 5</span>
    </span>
  );
}

export function ChampErreur({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <span className="rf-erreur-champ" role="alert">
      {message}
    </span>
  );
}
