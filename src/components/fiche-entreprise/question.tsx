"use client";

import { useId, useState } from "react";
import { typo } from "@/lib/typographie";

/**
 * Une question dépliable.
 *
 * L'indicateur est un carré bordé portant « + » ou « − », jamais un chevron :
 * la géométrie carrée est le parti pris de toute la page, et un chevron y
 * ferait tache. La réponse reste dans le document sous `hidden` — elle est
 * balisée en FAQPage, et déclarer un contenu absent du HTML est une
 * déclaration fausse.
 */
export function Question({ q, r }: { q: string; r: string[] }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();

  return (
    <div className="rfe-faq__l">
      <h3 style={{ margin: 0, font: "inherit" }}>
        <button
          type="button"
          className="rfe-faq__b"
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((v) => !v)}
        >
          {typo(q)}
          <span className="rfe-faq__signe" aria-hidden="true">
            {ouvert ? "−" : "+"}
          </span>
        </button>
      </h3>
      <div id={id} hidden={!ouvert}>
        {r.map((p, i) => (
          <p key={i} className="rfe-faq__r">
            {typo(p)}
          </p>
        ))}
      </div>
    </div>
  );
}
