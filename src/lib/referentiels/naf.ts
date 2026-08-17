/**
 * Nomenclature d'activités française (NAF rév. 2).
 * Classes détaillées pour les activités les plus exposées aux litiges de
 * consommation, complétées par le libellé de la division pour tout le reste.
 */

const CLASSES: Record<string, string> = {
  "45.11Z": "Commerce de voitures et de véhicules automobiles légers",
  "45.20A": "Entretien et réparation de véhicules automobiles légers",
  "45.20B": "Entretien et réparation d’autres véhicules automobiles",
  "45.32Z": "Commerce de détail d’équipements automobiles",
  "46.90Z": "Commerce de gros non spécialisé",
  "47.11B": "Commerce d’alimentation générale",
  "47.11D": "Supermarchés",
  "47.11F": "Hypermarchés",
  "47.19B": "Autres commerces de détail en magasin non spécialisé",
  "47.41Z": "Commerce de détail d’ordinateurs et de logiciels en magasin spécialisé",
  "47.42Z": "Commerce de détail de matériels de télécommunication en magasin spécialisé",
  "47.43Z": "Commerce de détail de matériels audio et vidéo en magasin spécialisé",
  "47.51Z": "Commerce de détail de textiles en magasin spécialisé",
  "47.52A": "Commerce de détail de quincaillerie, peintures et verres (petites surfaces)",
  "47.52B": "Commerce de détail de quincaillerie, peintures et verres (grandes surfaces)",
  "47.54Z": "Commerce de détail d’appareils électroménagers en magasin spécialisé",
  "47.59A": "Commerce de détail de meubles",
  "47.59B": "Commerce de détail d’autres équipements du foyer",
  "47.71Z": "Commerce de détail d’habillement en magasin spécialisé",
  "47.72A": "Commerce de détail de la chaussure",
  "47.77Z": "Commerce de détail d’articles d’horlogerie et de bijouterie",
  "47.78C": "Autres commerces de détail spécialisés divers",
  "47.91A": "Vente à distance sur catalogue général",
  "47.91B": "Vente à distance sur catalogue spécialisé",
  "47.99A": "Vente à domicile",
  "47.99B": "Vente par automates et autres commerces de détail hors magasin",
  "49.32Z": "Transports de voyageurs par taxis",
  "49.41A": "Transports routiers de fret interurbains",
  "52.10B": "Entreposage et stockage non frigorifique",
  "53.20Z": "Autres activités de poste et de courrier",
  "55.10Z": "Hôtels et hébergement similaire",
  "56.10A": "Restauration traditionnelle",
  "61.10Z": "Télécommunications filaires",
  "61.20Z": "Télécommunications sans fil",
  "61.90Z": "Autres activités de télécommunication",
  "62.01Z": "Programmation informatique",
  "63.11Z": "Traitement de données, hébergement et activités connexes",
  "64.19Z": "Autres intermédiations monétaires",
  "64.92Z": "Autres distributions de crédit",
  "65.11Z": "Assurance vie",
  "65.12Z": "Autres assurances",
  "68.20A": "Location de logements",
  "68.31Z": "Agences immobilières",
  "69.10Z": "Activités juridiques",
  "79.11Z": "Activités des agences de voyage",
  "79.12Z": "Activités des voyagistes",
  "80.20Z": "Activités liées aux systèmes de sécurité",
  "81.21Z": "Nettoyage courant des bâtiments",
  "85.59A": "Formation continue d’adultes",
  "85.59B": "Autres enseignements",
  "35.11Z": "Production d’électricité",
  "35.13Z": "Distribution d’électricité",
  "35.14Z": "Commerce d’électricité",
  "35.23Z": "Commerce de combustibles gazeux par conduite",
  "36.00Z": "Captage, traitement et distribution d’eau",
  "41.20A": "Construction de maisons individuelles",
  "41.20B": "Construction d’autres bâtiments",
  "43.21A": "Travaux d’installation électrique dans tous locaux",
  "43.22A": "Travaux d’installation d’eau et de gaz en tous locaux",
  "43.22B": "Travaux d’installation d’équipements thermiques et de climatisation",
  "43.32A": "Travaux de menuiserie bois et PVC",
  "43.91A": "Travaux de charpente",
  "95.11Z": "Réparation d’ordinateurs et d’équipements périphériques",
  "95.12Z": "Réparation d’équipements de communication",
  "95.21Z": "Réparation de produits électroniques grand public",
  "95.22Z": "Réparation d’appareils électroménagers et d’équipements pour la maison",
  "96.01A": "Blanchisserie-teinturerie de gros",
  "96.02A": "Coiffure",
  "96.04Z": "Entretien corporel",
};

const DIVISIONS: Record<string, string> = {
  "01": "Culture et production animale",
  "10": "Industries alimentaires",
  "13": "Fabrication de textiles",
  "16": "Travail du bois",
  "20": "Industrie chimique",
  "25": "Fabrication de produits métalliques",
  "26": "Fabrication de produits informatiques et électroniques",
  "27": "Fabrication d’équipements électriques",
  "28": "Fabrication de machines et équipements",
  "29": "Industrie automobile",
  "31": "Fabrication de meubles",
  "32": "Autres industries manufacturières",
  "33": "Réparation et installation de machines",
  "35": "Production et distribution d’électricité et de gaz",
  "36": "Captage, traitement et distribution d’eau",
  "38": "Collecte et traitement des déchets",
  "41": "Construction de bâtiments",
  "42": "Génie civil",
  "43": "Travaux de construction spécialisés",
  "45": "Commerce et réparation d’automobiles et de motocycles",
  "46": "Commerce de gros",
  "47": "Commerce de détail",
  "49": "Transports terrestres",
  "50": "Transports par eau",
  "51": "Transports aériens",
  "52": "Entreposage et services auxiliaires des transports",
  "53": "Activités de poste et de courrier",
  "55": "Hébergement",
  "56": "Restauration",
  "58": "Édition",
  "59": "Production de films et enregistrement sonore",
  "60": "Programmation et diffusion",
  "61": "Télécommunications",
  "62": "Programmation, conseil et autres activités informatiques",
  "63": "Services d’information",
  "64": "Activités des services financiers",
  "65": "Assurance",
  "66": "Activités auxiliaires de services financiers et d’assurance",
  "68": "Activités immobilières",
  "69": "Activités juridiques et comptables",
  "70": "Activités des sièges sociaux et conseil de gestion",
  "71": "Activités d’architecture et d’ingénierie",
  "73": "Publicité et études de marché",
  "74": "Autres activités spécialisées, scientifiques et techniques",
  "77": "Activités de location et location-bail",
  "78": "Activités liées à l’emploi",
  "79": "Agences de voyage et voyagistes",
  "80": "Enquêtes et sécurité",
  "81": "Services relatifs aux bâtiments et aménagement paysager",
  "82": "Services administratifs de bureau et autres activités de soutien",
  "85": "Enseignement",
  "86": "Activités pour la santé humaine",
  "87": "Hébergement médico-social",
  "88": "Action sociale sans hébergement",
  "90": "Activités créatives, artistiques et de spectacle",
  "93": "Activités sportives et récréatives",
  "94": "Activités des organisations associatives",
  "95": "Réparation d’ordinateurs et de biens personnels",
  "96": "Autres services personnels",
};

/** Regroupement affiché à l'utilisateur (filtre « Secteur » de l'annuaire). */
export const SECTEURS: { code: string; libelle: string; divisions: string[] }[] = [
  { code: "commerce-detail", libelle: "Commerce de détail et grande distribution", divisions: ["47"] },
  { code: "vente-distance", libelle: "Vente à distance et commerce en ligne", divisions: [] },
  { code: "automobile", libelle: "Automobile et deux-roues", divisions: ["45", "29"] },
  { code: "telecom", libelle: "Télécommunications et internet", divisions: ["61", "60"] },
  { code: "energie", libelle: "Énergie et eau", divisions: ["35", "36"] },
  { code: "banque-assurance", libelle: "Banque, crédit et assurance", divisions: ["64", "65", "66"] },
  { code: "travaux", libelle: "Bâtiment, travaux et rénovation", divisions: ["41", "42", "43"] },
  { code: "immobilier", libelle: "Immobilier et location", divisions: ["68", "77"] },
  { code: "voyage", libelle: "Voyage, hébergement et transport", divisions: ["49", "50", "51", "55", "79"] },
  { code: "logistique", libelle: "Livraison, transport de colis et logistique", divisions: ["52", "53"] },
  { code: "numerique", libelle: "Services numériques et abonnements", divisions: ["62", "63", "58", "59"] },
  { code: "sante-bienetre", libelle: "Santé, bien-être et services à la personne", divisions: ["86", "88", "96"] },
  { code: "formation", libelle: "Enseignement et formation", divisions: ["85"] },
  { code: "reparation", libelle: "Réparation et service après-vente", divisions: ["95", "33"] },
  { code: "restauration", libelle: "Restauration et alimentation", divisions: ["56", "10"] },
  { code: "autre", libelle: "Autres activités", divisions: [] },
];

export function libelleNaf(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalise = code.toUpperCase().replace(/\s/g, "");
  if (CLASSES[normalise]) return CLASSES[normalise];
  const division = normalise.slice(0, 2);
  return DIVISIONS[division] ?? null;
}

export function secteurDepuisNaf(code: string | null | undefined): string {
  if (!code) return "autre";
  const normalise = code.toUpperCase().replace(/\s/g, "");
  // La vente à distance est un secteur à part entière côté consommateur.
  if (normalise.startsWith("47.91") || normalise.startsWith("47.99")) return "vente-distance";
  const division = normalise.slice(0, 2);
  const secteur = SECTEURS.find((s) => s.divisions.includes(division));
  return secteur?.code ?? "autre";
}

export function libelleSecteur(code: string | null | undefined): string {
  return SECTEURS.find((s) => s.code === code)?.libelle ?? "Autres activités";
}

/** Sections NAF (A…U) utilisées comme filtre côté API Recherche d'entreprises. */
export function sectionsPourSecteur(code: string): string[] {
  switch (code) {
    case "commerce-detail":
    case "vente-distance":
    case "automobile":
      return ["G"];
    case "telecom":
    case "numerique":
      return ["J"];
    case "energie":
      return ["D", "E"];
    case "banque-assurance":
      return ["K"];
    case "travaux":
      return ["F"];
    case "immobilier":
      return ["L"];
    case "voyage":
    case "logistique":
      return ["H", "I", "N"];
    case "sante-bienetre":
      return ["Q", "S"];
    case "formation":
      return ["P"];
    case "reparation":
      return ["S", "C"];
    case "restauration":
      return ["I"];
    default:
      return [];
  }
}

export const DEPARTEMENTS: { code: string; nom: string }[] = [
  { code: "01", nom: "Ain" }, { code: "02", nom: "Aisne" }, { code: "03", nom: "Allier" },
  { code: "04", nom: "Alpes-de-Haute-Provence" }, { code: "05", nom: "Hautes-Alpes" },
  { code: "06", nom: "Alpes-Maritimes" }, { code: "07", nom: "Ardèche" }, { code: "08", nom: "Ardennes" },
  { code: "09", nom: "Ariège" }, { code: "10", nom: "Aube" }, { code: "11", nom: "Aude" },
  { code: "12", nom: "Aveyron" }, { code: "13", nom: "Bouches-du-Rhône" }, { code: "14", nom: "Calvados" },
  { code: "15", nom: "Cantal" }, { code: "16", nom: "Charente" }, { code: "17", nom: "Charente-Maritime" },
  { code: "18", nom: "Cher" }, { code: "19", nom: "Corrèze" }, { code: "2A", nom: "Corse-du-Sud" },
  { code: "2B", nom: "Haute-Corse" }, { code: "21", nom: "Côte-d’Or" }, { code: "22", nom: "Côtes-d’Armor" },
  { code: "23", nom: "Creuse" }, { code: "24", nom: "Dordogne" }, { code: "25", nom: "Doubs" },
  { code: "26", nom: "Drôme" }, { code: "27", nom: "Eure" }, { code: "28", nom: "Eure-et-Loir" },
  { code: "29", nom: "Finistère" }, { code: "30", nom: "Gard" }, { code: "31", nom: "Haute-Garonne" },
  { code: "32", nom: "Gers" }, { code: "33", nom: "Gironde" }, { code: "34", nom: "Hérault" },
  { code: "35", nom: "Ille-et-Vilaine" }, { code: "36", nom: "Indre" }, { code: "37", nom: "Indre-et-Loire" },
  { code: "38", nom: "Isère" }, { code: "39", nom: "Jura" }, { code: "40", nom: "Landes" },
  { code: "41", nom: "Loir-et-Cher" }, { code: "42", nom: "Loire" }, { code: "43", nom: "Haute-Loire" },
  { code: "44", nom: "Loire-Atlantique" }, { code: "45", nom: "Loiret" }, { code: "46", nom: "Lot" },
  { code: "47", nom: "Lot-et-Garonne" }, { code: "48", nom: "Lozère" }, { code: "49", nom: "Maine-et-Loire" },
  { code: "50", nom: "Manche" }, { code: "51", nom: "Marne" }, { code: "52", nom: "Haute-Marne" },
  { code: "53", nom: "Mayenne" }, { code: "54", nom: "Meurthe-et-Moselle" }, { code: "55", nom: "Meuse" },
  { code: "56", nom: "Morbihan" }, { code: "57", nom: "Moselle" }, { code: "58", nom: "Nièvre" },
  { code: "59", nom: "Nord" }, { code: "60", nom: "Oise" }, { code: "61", nom: "Orne" },
  { code: "62", nom: "Pas-de-Calais" }, { code: "63", nom: "Puy-de-Dôme" },
  { code: "64", nom: "Pyrénées-Atlantiques" }, { code: "65", nom: "Hautes-Pyrénées" },
  { code: "66", nom: "Pyrénées-Orientales" }, { code: "67", nom: "Bas-Rhin" }, { code: "68", nom: "Haut-Rhin" },
  { code: "69", nom: "Rhône" }, { code: "70", nom: "Haute-Saône" }, { code: "71", nom: "Saône-et-Loire" },
  { code: "72", nom: "Sarthe" }, { code: "73", nom: "Savoie" }, { code: "74", nom: "Haute-Savoie" },
  { code: "75", nom: "Paris" }, { code: "76", nom: "Seine-Maritime" }, { code: "77", nom: "Seine-et-Marne" },
  { code: "78", nom: "Yvelines" }, { code: "79", nom: "Deux-Sèvres" }, { code: "80", nom: "Somme" },
  { code: "81", nom: "Tarn" }, { code: "82", nom: "Tarn-et-Garonne" }, { code: "83", nom: "Var" },
  { code: "84", nom: "Vaucluse" }, { code: "85", nom: "Vendée" }, { code: "86", nom: "Vienne" },
  { code: "87", nom: "Haute-Vienne" }, { code: "88", nom: "Vosges" }, { code: "89", nom: "Yonne" },
  { code: "90", nom: "Territoire de Belfort" }, { code: "91", nom: "Essonne" }, { code: "92", nom: "Hauts-de-Seine" },
  { code: "93", nom: "Seine-Saint-Denis" }, { code: "94", nom: "Val-de-Marne" }, { code: "95", nom: "Val-d’Oise" },
  { code: "971", nom: "Guadeloupe" }, { code: "972", nom: "Martinique" }, { code: "973", nom: "Guyane" },
  { code: "974", nom: "La Réunion" }, { code: "976", nom: "Mayotte" },
];

export function nomDepartement(code: string | null | undefined): string | null {
  if (!code) return null;
  return DEPARTEMENTS.find((d) => d.code === code)?.nom ?? null;
}
