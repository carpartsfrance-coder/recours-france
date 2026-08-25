/**
 * IndexNow — la notification directe aux moteurs qui l'acceptent.
 *
 * Le protocole tient en une phrase : le site publie une clé à sa racine, puis
 * annonce ses adresses à un point d'entrée unique, et les moteurs participants
 * les relèvent. Bing, Yandex, Seznam et Naver le mettent en œuvre ; Bing
 * alimente aussi les réponses de Copilot et de ChatGPT. **Google ne le lit
 * pas** et n'a jamais annoncé l'intention de le faire : ce n'est pas un
 * raccourci vers Google, c'est une autre porte.
 *
 * Ce qu'on y gagne se compte en heures là où Google se compte en mois. Ce
 * qu'on n'y gagne pas : la part de Bing en France tourne autour de quelques
 * pour cent. C'est un complément, jamais le plan.
 *
 * La clé est publique par construction — c'est même tout le mécanisme : le
 * moteur la relit à l'adresse annoncée pour vérifier que celui qui soumet
 * possède bien le domaine. Elle ne protège rien et n'a rien d'un secret.
 */

import { ADRESSE } from "@/lib/adresse";

/**
 * La clé, et le fichier qui la porte.
 *
 * Le fichier vit dans `public/` sous le nom `<clé>.txt`, comme le veut la
 * forme la plus répandue du protocole. Le versionner ne coûte rien : la clé
 * est publique par construction, c'est son rôle. En revanche elle doit être
 * la même des deux côtés, faute de quoi la vérification échoue en silence —
 * d'où `verifierCle()`, appelée avant tout envoi.
 */
export const CLE_INDEXNOW = process.env.INDEXNOW_KEY ?? "";

/** Le protocole plafonne à dix mille adresses par envoi. */
export const PAR_ENVOI = 10_000;

export const POINT_ENTREE = "https://api.indexnow.org/IndexNow";

export type Resultat = { envoyees: number; lots: number; refus: string[] };

/**
 * Vérifie que le site publie bien la clé annoncée.
 *
 * C'est exactement ce que le moteur fera. Le faire d'abord évite de soumettre
 * des dizaines de milliers d'adresses à une vérification qui échouera, et sans
 * qu'aucune erreur ne soit renvoyée : le protocole accepte la soumission, puis
 * la rejette en silence.
 */
export async function verifierCle(cle = CLE_INDEXNOW): Promise<void> {
  if (!cle) throw new Error("INDEXNOW_KEY absente : rien n'est envoyé.");
  const url = `${ADRESSE}/${cle}.txt`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} répond ${r.status} — le fichier de clé n'est pas en ligne.`);
  const contenu = (await r.text()).trim();
  if (contenu !== cle) {
    throw new Error(`${url} contient « ${contenu.slice(0, 40)} », attendu « ${cle} ».`);
  }
}

/**
 * Annonce une liste d'adresses.
 *
 * Les lots partent l'un après l'autre, jamais en parallèle : un moteur qui
 * reçoit dix requêtes simultanées d'un domaine inconnu les traite comme un
 * abus, et le protocole ne demande aucune vitesse — il demande à être prévenu.
 *
 * Un refus n'interrompt pas l'envoi : les lots suivants ont autant de raisons
 * d'aboutir, et le rapport dit lesquels ont échoué.
 */
export async function annoncer(
  adresses: string[],
  options: { cle?: string; hote?: string; pause?: number } = {},
): Promise<Resultat> {
  const cle = options.cle ?? CLE_INDEXNOW;
  if (!cle) throw new Error("INDEXNOW_KEY absente : rien n'est envoyé.");

  const hote = options.hote ?? new URL(ADRESSE).host;
  const pause = options.pause ?? 1000;
  const refus: string[] = [];
  let envoyees = 0;
  let lots = 0;

  for (let i = 0; i < adresses.length; i += PAR_ENVOI) {
    const lot = adresses.slice(i, i + PAR_ENVOI);
    const reponse = await fetch(POINT_ENTREE, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: hote,
        key: cle,
        keyLocation: `${ADRESSE}/${cle}.txt`,
        urlList: lot,
      }),
    });

    lots += 1;
    // 200 et 202 valent acceptation ; le protocole n'en distingue pas d'autre.
    if (reponse.ok) envoyees += lot.length;
    else refus.push(`lot ${lots} : ${reponse.status} ${await reponse.text().catch(() => "")}`.trim());

    if (i + PAR_ENVOI < adresses.length) await new Promise((r) => setTimeout(r, pause));
  }

  return { envoyees, lots, refus };
}
