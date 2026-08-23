"use client";

import { useEffect, useState } from "react";
import { CercleCoche, Document, Epingle, Etiquette, Graphique, Liste, Question } from "@/components/refonte/icones";
import { typo } from "@/lib/typographie";

/**
 * Les icônes sont résolues ici, à partir d'une clé.
 *
 * Un composant React est une fonction : la passer en propriété depuis un
 * composant serveur échoue à la sérialisation — « Functions cannot be passed
 * directly to Client Components ». La compilation ne le voit pas, seule
 * l'exécution le dit. La frontière ne transporte donc qu'une chaîne.
 */
const ICONES = {
  liste: Liste,
  etiquette: Etiquette,
  graphique: Graphique,
  coche: CercleCoche,
  epingle: Epingle,
  question: Question,
  document: Document,
} as const;

export type CleIcone = keyof typeof ICONES;

/**
 * Onglets d'ancrage, dont l'actif suit la section visible.
 *
 * L'observateur retient la dernière section entrée dans la bande haute plutôt
 * que la plus visible : en descendant, l'onglet doit basculer quand le titre
 * atteint le haut, pas quand la section occupe la moitié de l'écran.
 *
 * Sans JavaScript, le premier onglet reste marqué et les ancres fonctionnent :
 * c'est une aide à la lecture, pas une navigation.
 */
export function Onglets({ liens }: { liens: { href: string; libelle: string; icone: CleIcone }[] }) {
  const [actif, setActif] = useState(liens[0]?.href ?? "");

  useEffect(() => {
    const cibles = liens
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((e): e is HTMLElement => e !== null);
    if (cibles.length === 0) return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        const visibles = entrees.filter((e) => e.isIntersecting);
        if (visibles.length === 0) return;
        const haut = visibles.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActif(`#${haut.target.id}`);
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0 },
    );
    cibles.forEach((c) => observateur.observe(c));
    return () => observateur.disconnect();
  }, [liens]);

  return (
    <nav className="rfe-onglets" aria-label="Sections de la fiche">
      <div className="rfe-conteneur rfe-onglets__piste">
        {liens.map((l) => {
          const Icone = ICONES[l.icone];
          return (
            <a
              key={l.href}
              href={l.href}
              className="rfe-onglet"
              aria-current={l.href === actif ? "true" : undefined}
            >
              <Icone taille={17} />
              {typo(l.libelle)}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
