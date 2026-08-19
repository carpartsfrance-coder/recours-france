/**
 * Valeur d'environnement, avec repli sur le défaut quand la variable est vide.
 *
 * `process.env.X ?? defaut` ne se rabat que sur `undefined` : une variable
 * déclarée à `""` — cas courant dans un fichier .env d'exemple — écrase
 * silencieusement le défaut. L'annuaire des médiateurs est resté vide pour
 * cette raison, et la synchronisation rapportait « ok » sans rien charger.
 */
export function variable(nom: string, defaut: string): string {
  const valeur = process.env[nom];
  return valeur && valeur.trim() ? valeur.trim() : defaut;
}

const UA = "RecoursFrance/1.0 (+https://recours-france.fr; contact@recours-france.fr)";

export class ErreurSource extends Error {
  constructor(
    public readonly source: string,
    message: string,
    public readonly statut?: number,
  ) {
    super(`[${source}] ${message}`);
    this.name = "ErreurSource";
  }
}

type Options = RequestInit & { timeoutMs?: number; tentatives?: number };

/** Appel HTTP avec délai maximal, réessais et en-tête d'identification. */
export async function appel(url: string, options: Options = {}): Promise<Response> {
  const { timeoutMs = 12_000, tentatives = 2, headers, ...reste } = options;
  let derniere: unknown;

  for (let i = 0; i <= tentatives; i++) {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), timeoutMs);
    try {
      const reponse = await fetch(url, {
        ...reste,
        headers: { "User-Agent": UA, Accept: "application/json", ...(headers ?? {}) },
        signal: controleur.signal,
        cache: "no-store",
      });
      clearTimeout(minuteur);
      // 429 / 5xx : on réessaie avec un retrait progressif.
      if ((reponse.status === 429 || reponse.status >= 500) && i < tentatives) {
        await pause(600 * (i + 1));
        continue;
      }
      return reponse;
    } catch (e) {
      clearTimeout(minuteur);
      derniere = e;
      if (i < tentatives) await pause(600 * (i + 1));
    }
  }
  throw new ErreurSource("http", `échec de l’appel à ${url} : ${String(derniere)}`);
}

export async function appelJson<T>(url: string, source: string, options: Options = {}): Promise<T> {
  const reponse = await appel(url, options);
  if (!reponse.ok) {
    throw new ErreurSource(source, `réponse ${reponse.status} pour ${url}`, reponse.status);
  }
  return (await reponse.json()) as T;
}

export function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function dateOuNull(valeur: unknown): Date | null {
  if (!valeur || typeof valeur !== "string") return null;
  const d = new Date(valeur.length === 7 ? `${valeur}-01` : valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}
