"use client";

import { useEffect, useState } from "react";
import { typo } from "@/lib/typographie";

/**
 * Nav de sections collante, dont l'onglet actif suit la section visible.
 *
 * L'observateur retient la dernière section entrée dans la bande haute de la
 * fenêtre plutôt que la plus visible : en descendant, l'onglet doit basculer
 * quand le titre atteint le haut, pas quand la section occupe la moitié de
 * l'écran. La marge basse de −65 % réduit la zone d'observation à cette bande.
 *
 * Sans JavaScript, le premier onglet reste marqué et les ancres fonctionnent :
 * c'est une aide à la lecture, pas une navigation.
 */
export function NavSections({ liens }: { liens: { href: string; libelle: string }[] }) {
  const [actif, setActif] = useState(liens[0]?.href ?? "");

  /**
   * L'en-tête du site est collant, et il mesure quatre-vingt-dix pixels au
   * large, davantage à l'étroit où la baseline passe à la ligne. Une nav posée
   * à `top: 0` glisse dessous et disparaît. Sa hauteur n'est écrite nulle part
   * en dur : on la mesure, et la même valeur sert de marge d'ancrage aux
   * sections, pour qu'un titre visé ne se retrouve pas caché derrière.
   */
  useEffect(() => {
    const racine = document.querySelector<HTMLElement>(".rfb");
    const entete = document.querySelector<HTMLElement>(".rf-entete");
    if (!racine || !entete) return;
    const poser = () => racine.style.setProperty("--rfb-collant", `${Math.round(entete.offsetHeight)}px`);
    poser();
    const observateur = new ResizeObserver(poser);
    observateur.observe(entete);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    const cibles = liens
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((e): e is HTMLElement => e !== null);
    if (cibles.length === 0) return;

    const nav = document.querySelector<HTMLElement>(".rfb-nav");
    const marge = Math.round((nav?.getBoundingClientRect().bottom ?? 72) + 4);

    const observateur = new IntersectionObserver(
      (entrees) => {
        const visibles = entrees.filter((e) => e.isIntersecting);
        if (visibles.length === 0) return;
        // La plus haute des sections présentes dans la bande : en remontant,
        // deux peuvent s'y trouver ensemble, et c'est la première qui compte.
        const haut = visibles.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActif(`#${haut.target.id}`);
      },
      { rootMargin: `-${marge}px 0px -65% 0px`, threshold: 0 },
    );
    cibles.forEach((c) => observateur.observe(c));
    return () => observateur.disconnect();
  }, [liens]);

  return (
    <nav className="rfb-nav" aria-label="Sections de la page">
      <div className="rfb-conteneur rfb-nav__piste">
        {liens.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rfb-nav__lien"
            aria-current={l.href === actif ? "true" : undefined}
          >
            {typo(l.libelle)}
          </a>
        ))}
      </div>
    </nav>
  );
}
