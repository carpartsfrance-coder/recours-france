/**
 * Envoi d'emails.
 *
 * Garde-fou : aucun envoi réel tant que MAIL_ENABLED n'est pas « true » ET que
 * les paramètres SMTP ne sont pas renseignés. En développement, les messages
 * sont écrits dans .mail-outbox/ — jamais expédiés.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DOSSIER_SORTIE = path.join(process.cwd(), ".mail-outbox");

export type Message = {
  destinataire: string;
  sujet: string;
  html: string;
  texte: string;
  repondreA?: string;
};

function envoiReelActif(): boolean {
  return process.env.MAIL_ENABLED === "true" && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export async function envoyer(message: Message): Promise<{ envoye: boolean; chemin?: string }> {
  if (!envoiReelActif()) {
    await mkdir(DOSSIER_SORTIE, { recursive: true });
    const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
    const nom = `${horodatage}--${message.destinataire.replace(/[^a-z0-9@._-]/gi, "_")}.html`;
    const chemin = path.join(DOSSIER_SORTIE, nom);
    await writeFile(
      chemin,
      `<!-- À : ${message.destinataire}\n     Sujet : ${message.sujet} -->\n${message.html}`,
      "utf8",
    );
    console.info(`[mail] envoi désactivé — message écrit dans ${chemin}`);
    return { envoye: false, chemin };
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "Recours France <ne-pas-repondre@recours-france.fr>",
    to: message.destinataire,
    replyTo: message.repondreA ?? process.env.MAIL_REPLY_TO,
    subject: message.sujet,
    text: message.texte,
    html: message.html,
  });
  return { envoye: true };
}

/** Gabarit commun : en-tête sobre, aucun arrondi, mention d'indépendance. */
export function gabarit(titre: string, corps: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title></head>
<body style="margin:0;padding:0;background:#F2F5FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#14161C">
  <div style="max-width:620px;margin:0 auto;background:#FFFFFF">
    <div style="background:#101528;color:#C7CEDE;padding:10px 24px;font-size:12px">
      Recours France est un service privé indépendant. Il n’est ni un service de l’État, ni une autorité administrative.
    </div>
    <div style="padding:24px;border-bottom:1px solid #E4E9F2">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:40px;height:40px;background:#16235C;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center">RF</td>
        <td style="padding-left:14px;font-size:19px;font-weight:700">Recours France</td>
      </tr></table>
    </div>
    <div style="padding:28px 24px">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;line-height:1.2">${echapper(titre)}</h1>
      ${corps}
    </div>
    <div style="background:#101528;color:#98A3BE;padding:18px 24px;font-size:12px;line-height:1.6">
      Recours France SAS — service privé indépendant, sans mission de service public.<br />
      Vous pouvez demander la suppression de vos données à tout moment par simple réponse à cet email.
    </div>
  </div>
</body></html>`;
}

export function bouton(url: string, libelle: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr>
    <td style="background:#1E4BD2">
      <a href="${url}" style="display:inline-block;padding:15px 24px;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none">${echapper(libelle)}</a>
    </td></tr></table>`;
}

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function versTexte(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h1|h2|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
