import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { resoudreJetonSuivi } from "@/lib/auth";
import { recalculerIndices } from "@/lib/stats";
import { RESULTATS, SITUATIONS_SUIVI } from "@/lib/tunnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Où en est votre problème ?",
  robots: { index: false, follow: false },
};

/**
 * Écran 10 — la mise à jour de situation.
 *
 * Une résolution n'est jamais déduite : ni du silence, ni d'une réponse de
 * l'entreprise, ni du temps écoulé. Seul l'auteur la déclare, et c'est cette
 * règle qui autorise la mention publique « Résolu selon le consommateur » —
 * elle dit qui parle, et n'engage que lui.
 */
export default async function MiseAJour({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jeton } = await params;
  const query = await searchParams;

  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) notFound();
  const signalement = acces.signalement;

  const entreprise = signalement.entrepriseId
    ? await prisma.entreprise.findUnique({
        where: { id: signalement.entrepriseId },
        select: { denomination: true, slug: true },
      })
    : null;
  const nom = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "l’entreprise";
  const erreur = query.erreur === "1";

  async function enregistrer(donnees: FormData) {
    "use server";
    const situation = String(donnees.get("situation") ?? "");
    if (!SITUATIONS_SUIVI.some((s) => s.cle === situation)) {
      redirect(`/mon-espace/dossier/${jeton}/mise-a-jour?erreur=1`);
    }

    const entree = await resoudreJetonSuivi(jeton);
    const ouvert = entree?.signalement;
    if (!ouvert) redirect(`/mon-espace/dossier/${jeton}/mise-a-jour?erreur=1`);

    const resolu = situation === "resolu";
    const partiel = situation === "partiel";
    const maintenant = new Date();

    await prisma.signalement.update({
      where: { id: ouvert.id },
      data: {
        resolutionConfirmee: resolu,
        resolutionConfirmeeLe: resolu ? maintenant : null,
        resultat: resolu || partiel ? String(donnees.get("resultat") ?? "") || null : null,
        statut: resolu ? "RESOLU_CONFIRME" : partiel ? "RESOLUTION_PARTIELLE" : "EN_COURS",
        closLe: resolu ? maintenant : null,
      },
    });

    if (ouvert.entrepriseId) await recalculerIndices(ouvert.entrepriseId).catch(() => undefined);
    revalidatePath(`/mon-espace/dossier/${jeton}`);
    redirect(`/mon-espace/dossier/${jeton}?maj=1`);
  }

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx">
        <div className="rfx-tunnel" style={{ padding: "32px 20px 56px" }}>
          <h1 className="rfx-h2">Où en est votre problème ?</h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Votre signalement concernant {nom}, déposé sous la référence{" "}
            <span className="rfx-chiffre">{signalement.reference}</span>.
          </p>

          {erreur ? (
            <div className="rfx-erreur" style={{ marginTop: 16 }} role="alert">
              Choisissez où en est votre problème pour enregistrer la mise à jour.
            </div>
          ) : null}

          <form action={enregistrer}>
            <div className="rfx-situations" style={{ marginTop: 24 }}>
              {SITUATIONS_SUIVI.map((s) => (
                <div key={s.cle} className="rfx-situation">
                  <label className="rfx-situation__label">
                    <input
                      type="radio"
                      name="situation"
                      value={s.cle}
                      defaultChecked={
                        s.cle === (signalement.resolutionConfirmee ? "resolu" : "en-cours")
                      }
                      required
                    />
                    <span className="rfx-situation__corps" style={{ minWidth: 0 }}>
                      <span className="rfx-situation__titre">{s.libelle}</span>
                      <span className="rfx-situation__desc">{s.desc}</span>

                      {/* Le résultat obtenu n'apparaît que sous les issues qui
                          en appellent un : le demander à quelqu'un dont rien
                          n'a bougé serait absurde. */}
                      {s.cle !== "en-cours" ? (
                        <span className="rfx-sous">
                          {RESULTATS.map((r) => (
                            <label key={r}>
                              <input
                                type="radio"
                                name="resultat"
                                value={r}
                                defaultChecked={signalement.resultat === r}
                              />
                              {r}
                            </label>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div className="rfx-succes" style={{ marginTop: 22 }}>
              Si vous déclarez votre problème résolu, la mention « Résolu selon le consommateur »
              apparaîtra sur la fiche {nom}, à côté de votre signalement. Recours France ne constate
              jamais une résolution à votre place.
            </div>

            <button type="submit" className="rfx-btn rfx-btn--large" style={{ marginTop: 22 }}>
              Enregistrer ma mise à jour
            </button>
          </form>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            <Link href={`/mon-espace/dossier/${jeton}`}>← Revenir à mon signalement</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
