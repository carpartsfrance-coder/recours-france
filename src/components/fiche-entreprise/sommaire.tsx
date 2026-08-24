"use client";

import { useEffect, useState } from "react";
import { typo } from "@/lib/typographie";

/**
 * Sommaire collant, dont l'entrée active suit la section visible.
 *
 * Le handoff laisse ce point ouvert — le prototype ne marque aucune entrée.
 * Sans lui, neuf libellés identiques défilent sans jamais dire où l'on est.
 *
 * L'observateur retient la section la plus haute présente sous les deux barres
 * collantes : en descendant, l'onglet doit basculer quand le titre les
 * atteint, pas quand la section occupe la moitié de l'écran.
 */
export function Sommaire({ entrees }: { entrees: { href: string; n: string; libelle: string }[] }) {
  const [actif, setActif] = useState(entrees[0]?.href ?? "");

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
    </nav>
  );
}
