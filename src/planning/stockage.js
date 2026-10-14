import AsyncStorage from '@react-native-async-storage/async-storage';
import { planningVide } from './logique';

// Stockage local (sur l'appareil). Sera remplacé par une base en ligne partagée.
const CLE = 'planning-gardes-v1';

export async function chargerPlanning() {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? { ...planningVide, ...JSON.parse(brut) } : planningVide;
  } catch {
    return planningVide;
  }
}

export async function enregistrerPlanning(planning) {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(planning));
  } catch {
    // Stockage indisponible (navigation privée) : le planning reste en mémoire.
  }
}
