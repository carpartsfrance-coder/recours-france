"use client";

import { useEffect, useState } from "react";
import { Chevron } from "@/components/refonte/icones";
import { typo } from "@/lib/typographie";

/**
 * Sommaire collant, dans ses deux formes.
 *
 * En large, une barre d'onglets à défilement horizontal, dont l'entrée active
 * suit la section visible. Le handoff laisse ce dernier point ouvert — le
 * prototype ne marque aucune entrée — mais sans lui, neuf libellés identiques
 * défilent sans jamais dire où l'on est.
 *
 * En étroit, un bandeau de 48 px replié — tiret rouge, « SOMMAIRE », le compte
 * de sections — qui déplie une grille de liens sur deux colonnes. Le handoff en
 * donne la raison : sur trois cent quatre-vingt-dix pixels, une barre
 * horizontale à faire glisser cache la moitié des sections et coûte un geste
 * imprécis. Cliquer un lien la referme.
 *
 * Les deux formes coexistent dans le document, la requête de conteneur en
 * masque une : le nombre de sections varie d'une fiche à l'autre, et rien ici
 * ne dépend du visiteur.
 *
 * L'observateur retient la section la plus haute présente sous les deux barres
 * collantes : en descendant, l'onglet doit basculer quand le titre les
 * atteint, pas quand la section occupe la moitié de l'écran.
 */
export function Sommaire({ entrees }: { entrees: { href: string; n: string; libelle: string }[] }) {
  const [actif, setActif] = useState(entrees[0]?.href ?? "");
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    const cibles = entrees
      .map((e) => document.getElementById(e.href.slice(1)))
      .filter((e): e is HTMLElement => e !== null);
    if (cibles.length === 0) return;

    const observateur = new IntersectionObserver(
      (entrs) => {
        const visibles = entrs.filter((e) => e.isIntersecting);
        if (visibles.length === 0) return;
        const haut = visibles.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActif(`#${haut.target.id}`);
      },
      { rootMargin: "-124px 0px -60% 0px", threshold: 0 },
    );
    cibles.forEach((c) => observateur.observe(c));
    return () => observateur.disconnect();
  }, [entrees]);

  return (
    <nav className="rfe-sommaire" aria-label="Sommaire de la fiche">
      <div className="rfe-conteneur rfe-sommaire__piste rfe-scroll">
        {entrees.map((e) => (
          <a key={e.href} href={e.href} aria-current={e.href === actif ? "true" : undefined}>
            <span className="rfe-sommaire__n">{e.n}</span>
            {typo(e.libelle)}
          </a>
        ))}
      </div>

      <button
        type="button"
        className="rfe-sommaire__bascule"
        aria-expanded={ouvert}
        aria-controls="rfe-sommaire-liste"
        onClick={() => setOuvert((v) => !v)}
      >
        <span className="rfe-sommaire__amorce">
          <span className="rfe-sommaire__tiret" aria-hidden="true" />
          <span className="rfe-sommaire__mot">Sommaire</span>
          <span className="rfe-sommaire__compte">
            {typo(`${entrees.length} sections`)}
          </span>
        </span>
        <Chevron taille={16} className="rfe-sommaire__chev" />
      </button>

      <ul id="rfe-sommaire-liste" className="rfe-sommaire__grille" hidden={!ouvert}>
        {entrees.map((e) => (
          <li key={e.href}>
            <a href={e.href} onClick={() => setOuvert(false)}>
              <span className="rfe-sommaire__n">{e.n}</span>
              {typo(e.libelle)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
