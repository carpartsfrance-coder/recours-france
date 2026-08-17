"use server";

import { z } from "zod";
import { envoyer, gabarit, echapper, versTexte } from "@/lib/mailer";
import type { EtatAction } from "@/components/formulaire-action";

const schema = z.object({
  sujet: z.string().trim().min(2, "Choisissez un sujet."),
  message: z.string().trim().min(20, "Détaillez votre demande en quelques lignes.").max(2000),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse email valide."),
  reference: z.string().trim().max(30).optional(),
});

/**
 * Message de contact. Une copie est envoyée à l'expéditeur : la plateforme
 * s'engage sur un délai de réponse de 5 jours ouvrés.
 */
export async function envoyerContact(_precedent: EtatAction, donnees: FormData): Promise<EtatAction> {
  const analyse = schema.safeParse(Object.fromEntries(donnees.entries()));
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Certains champs doivent être corrigés." };
  }
  const d = analyse.data;

  const corps = `
    <p style="font-size:15px;line-height:1.6;color:#4A515F">Nous avons bien reçu votre message. Une réponse vous sera adressée sous 5 jours ouvrés.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #D7DCE5;margin:18px 0">
      <tr><td style="padding:16px 18px;font-size:13.5px;color:#4A515F;line-height:1.7">
        <strong style="color:#14161C">Sujet</strong> : ${echapper(d.sujet)}<br />
        ${d.reference ? `<strong style="color:#14161C">Référence</strong> : ${echapper(d.reference)}<br />` : ""}
        <strong style="color:#14161C">Message</strong> :<br />${echapper(d.message).replace(/\n/g, "<br />")}
      </td></tr>
    </table>
    <p style="font-size:12.5px;color:#5F6673;line-height:1.6">
      Rappel : Recours France ne transmet pas les réclamations aux professionnels et ne délivre pas de conseil
      juridique personnalisé.
    </p>`;

  const html = gabarit("Votre message a bien été reçu", corps);

  await envoyer({
    destinataire: d.email,
    sujet: `Votre message — ${d.sujet}`,
    html,
    texte: versTexte(html),
  }).catch((e) => console.error("[mail] contact", e));

  // Copie interne, adressée à la boîte de réception du service.
  await envoyer({
    destinataire: process.env.MAIL_REPLY_TO ?? "contact@recours-france.fr",
    sujet: `[Contact] ${d.sujet} — ${d.email}`,
    html,
    texte: versTexte(html),
    repondreA: d.email,
  }).catch(() => undefined);

  return {
    succes: true,
    message: "Message envoyé. Vous recevez une copie par email et une réponse sous 5 jours ouvrés.",
  };
}
