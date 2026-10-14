// Logique pure du planning des gardes (sans React), testable avec `npm test`.

export const CRENEAUX = [
  { id: 'jour', label: 'Garde jour', court: 'Jour', icone: '☀️' },
  { id: 'nuit', label: 'Garde nuit', court: 'Nuit', icone: '🌙' },
  { id: 'astreinte', label: 'Astreinte', court: 'Astr.', icone: '📟' },
];

export const COULEURS_MEDECINS = [
  '#3e8ed0', '#e5484d', '#30a46c', '#f5a524', '#8e4ec6', '#12a594', '#d6409f', '#978365',
];

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const planningVide = { medecins: [], gardes: {} };

const pad = (n) => String(n).padStart(2, '0');

export function cleDate(annee, mois, jour) {
  return `${annee}-${pad(mois + 1)}-${pad(jour)}`;
}

export function aujourdhui(date = new Date()) {
  return cleDate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function nomMois(annee, mois) {
  return `${MOIS[mois]} ${annee}`;
}

// mois : 0 = janvier. Renvoie la liste des jours du mois.
export function joursDuMois(annee, mois) {
  const nb = new Date(annee, mois + 1, 0).getDate();
  return Array.from({ length: nb }, (_, i) => {
    const jourSemaine = new Date(annee, mois, i + 1).getDay();
    return {
      cle: cleDate(annee, mois, i + 1),
      numero: i + 1,
      nomJour: JOURS[jourSemaine],
      weekend: jourSemaine === 0 || jourSemaine === 6,
    };
  });
}

export function moisDecale(annee, mois, delta) {
  const d = new Date(annee, mois + delta, 1);
  return { annee: d.getFullYear(), mois: d.getMonth() };
}

export function ajouterMedecin(planning, nom, id) {
  const propre = nom.trim();
  if (!propre) return planning;
  const couleur = COULEURS_MEDECINS[planning.medecins.length % COULEURS_MEDECINS.length];
  return { ...planning, medecins: [...planning.medecins, { id, nom: propre, couleur }] };
}

// Supprime le médecin et libère tous ses créneaux.
export function supprimerMedecin(planning, id) {
  const gardes = {};
  for (const [date, creneaux] of Object.entries(planning.gardes)) {
    const restants = Object.fromEntries(Object.entries(creneaux).filter(([, m]) => m !== id));
    if (Object.keys(restants).length) gardes[date] = restants;
  }
  return { medecins: planning.medecins.filter((m) => m.id !== id), gardes };
}

// medecinId null : libère le créneau.
export function assigner(planning, date, creneau, medecinId) {
  const jour = { ...(planning.gardes[date] ?? {}) };
  if (medecinId) jour[creneau] = medecinId;
  else delete jour[creneau];
  const gardes = { ...planning.gardes };
  if (Object.keys(jour).length) gardes[date] = jour;
  else delete gardes[date];
  return { ...planning, gardes };
}

// Nombre de gardes par médecin sur un mois : { [id]: { jour, nuit, astreinte, total } }.
export function compterGardes(planning, annee, mois) {
  const prefixe = `${annee}-${pad(mois + 1)}-`;
  const compte = Object.fromEntries(
    planning.medecins.map((m) => [m.id, { jour: 0, nuit: 0, astreinte: 0, total: 0 }]),
  );
  for (const [date, creneaux] of Object.entries(planning.gardes)) {
    if (!date.startsWith(prefixe)) continue;
    for (const [creneau, id] of Object.entries(creneaux)) {
      if (!compte[id]) continue;
      compte[id][creneau] += 1;
      compte[id].total += 1;
    }
  }
  return compte;
}
