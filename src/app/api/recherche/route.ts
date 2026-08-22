import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rechercherEntreprises } from "@/lib/sources";
import { versEntreprise } from "@/lib/sources/recherche-entreprises";
import { adressePostale, slugEntreprise } from "@/lib/format";

export const dynamic = "force-dynamic";

export type Suggestion = {
  siren: string;
  denomination: string;
  adresse: string;
  activite: string;
  slug: string;
  connue: boolean;
};

/** Recherche d'entreprise utilisée par le formulaire de signalement. */
export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ resultats: [] });

  const suggestions = new Map<string, Suggestion>();

  // Les chiffres de la saisie, isolés une fois : un SIREN fait neuf chiffres,
  // un SIRET quatorze. Toute autre longueur n'est pas un numéro.
  const chiffres = q.replace(/\D/g, "");

  const locales = await prisma.entreprise.findMany({
    where: {
      OR: [
        { denomination: { contains: q, mode: "insensitive" } },
        { enseigne: { contains: q, mode: "insensitive" } },
        // Le SIREN se cherche par égalité, jamais par fragment.
        //
        // La branche précédente retirait les non-chiffres de la saisie et
        // cherchait ce reste n'importe où dans le numéro. « 7night » donnait
        // donc « 7 », soit siren LIKE '%7%' : presque toutes les entreprises de
        // France, et l'autocomplétion proposait ENGIE, EDF et FNAC DARTY à
        // quelqu'un qui tapait le nom de sa boutique. Aucun index ne sert un
        // LIKE '%…%' sur un numéro, de surcroît.
        ...(/^\d{9}$/.test(chiffres) ? [{ siren: chiffres }] : []),
        ...(/^\d{14}$/.test(chiffres) ? [{ siretSiege: chiffres }] : []),
      ],
    },
    take: 5,
  });

  for (const e of locales) {
    suggestions.set(e.siren, {
      siren: e.siren,
      denomination: e.denomination,
      adresse: adressePostale(e) ?? "",
      activite: e.nafLibelle ?? "",
      slug: e.slug,
      connue: true,
    });
  }

  try {
    const api = await rechercherEntreprises(q, { parPage: 8 });
    for (const r of api.resultats) {
      if (suggestions.has(r.siren)) continue;
      const champs = versEntreprise(r);
      suggestions.set(r.siren, {
        siren: r.siren,
        denomination: champs.denomination,
        adresse: adressePostale(champs) ?? "",
        activite: champs.nafLibelle ?? "",
        slug: slugEntreprise(champs.denomination, r.siren),
        connue: false,
      });
    }
  } catch {
    // Le registre public peut être momentanément indisponible : on renvoie ce qu'on a.
    return NextResponse.json({ resultats: [...suggestions.values()], sourceIndisponible: true });
  }

  return NextResponse.json({ resultats: [...suggestions.values()].slice(0, 8) });
}
