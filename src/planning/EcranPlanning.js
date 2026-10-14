import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, COLORS, confirmAction } from '../ui';
import {
  CRENEAUX,
  ajouterMedecin,
  assigner,
  aujourdhui,
  compterGardes,
  joursDuMois,
  moisDecale,
  nomMois,
  planningVide,
  supprimerMedecin,
} from './logique';
import { chargerPlanning, enregistrerPlanning } from './stockage';

const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function EcranPlanning() {
  const [planning, setPlanning] = useState(planningVide);
  const [charge, setCharge] = useState(false);
  const [{ annee, mois }, setMoisAffiche] = useState(() => {
    const d = new Date();
    return { annee: d.getFullYear(), mois: d.getMonth() };
  });
  const [selection, setSelection] = useState(null); // { date, creneau }
  const [gestionMedecins, setGestionMedecins] = useState(false);

  useEffect(() => {
    chargerPlanning().then((p) => {
      setPlanning(p);
      setGestionMedecins(p.medecins.length === 0);
      setCharge(true);
    });
  }, []);

  const modifier = (fn) => {
    setPlanning((p) => {
      const suivant = fn(p);
      enregistrerPlanning(suivant);
      return suivant;
    });
  };

  const medecinsParId = useMemo(
    () => Object.fromEntries(planning.medecins.map((m) => [m.id, m])),
    [planning.medecins],
  );
  const jours = joursDuMois(annee, mois);
  const today = aujourdhui();
  const gardesDuJour = planning.gardes[today] ?? {};
  const compte = compterGardes(planning, annee, mois);

  if (!charge) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>DE GARDE AUJOURD’HUI</Text>
        {CRENEAUX.map((c) => (
          <View key={c.id} style={styles.todayRow}>
            <Text style={styles.todayLabel}>
              {c.icone} {c.label}
            </Text>
            <NomMedecin medecin={medecinsParId[gardesDuJour[c.id]]} />
          </View>
        ))}
      </View>

      <Pressable style={styles.toggle} onPress={() => setGestionMedecins((g) => !g)}>
        <Text style={styles.toggleText}>
          👥 Médecins ({planning.medecins.length}) {gestionMedecins ? '▲' : '▼'}
        </Text>
      </Pressable>
      {gestionMedecins && (
        <GestionMedecins
          medecins={planning.medecins}
          compte={compte}
          titreMois={nomMois(annee, mois)}
          ajouter={(nom) => modifier((p) => ajouterMedecin(p, nom, nouvelId()))}
          supprimer={(m) =>
            confirmAction('Supprimer', `Supprimer ${m.nom} et libérer ses gardes ?`, 'Supprimer', () =>
              modifier((p) => supprimerMedecin(p, m.id)),
            )
          }
        />
      )}

      <View style={styles.monthBar}>
        <Pressable style={styles.monthArrow} onPress={() => setMoisAffiche(moisDecale(annee, mois, -1))}>
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{nomMois(annee, mois)}</Text>
        <Pressable style={styles.monthArrow} onPress={() => setMoisAffiche(moisDecale(annee, mois, 1))}>
          <Text style={styles.monthArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.dayCol} />
        {CRENEAUX.map((c) => (
          <Text key={c.id} style={styles.headerCell}>
            {c.icone} {c.court}
          </Text>
        ))}
      </View>
      {jours.map((j) => {
        const gardes = planning.gardes[j.cle] ?? {};
        return (
          <View
            key={j.cle}
            style={[styles.dayRow, j.weekend && styles.weekend, j.cle === today && styles.today]}
          >
            <View style={styles.dayCol}>
              <Text style={styles.dayName}>{j.nomJour}</Text>
              <Text style={styles.dayNumber}>{j.numero}</Text>
            </View>
            {CRENEAUX.map((c) => {
              const medecin = medecinsParId[gardes[c.id]];
              return (
                <Pressable
                  key={c.id}
                  style={[styles.slot, medecin && { backgroundColor: medecin.couleur }]}
                  onPress={() => setSelection({ date: j.cle, numero: j.numero, nomJour: j.nomJour, creneau: c })}
                >
                  <Text style={[styles.slotText, !medecin && styles.slotEmpty]} numberOfLines={2}>
                    {medecin ? medecin.nom : '—'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <ChoixMedecin
        selection={selection}
        medecins={planning.medecins}
        actuel={selection && planning.gardes[selection.date]?.[selection.creneau.id]}
        fermer={() => setSelection(null)}
        choisir={(id) => {
          modifier((p) => assigner(p, selection.date, selection.creneau.id, id));
          setSelection(null);
        }}
      />
    </ScrollView>
  );
}

function NomMedecin({ medecin }) {
  if (!medecin) return <Text style={styles.todayEmpty}>Personne</Text>;
  return (
    <View style={[styles.badge, { backgroundColor: medecin.couleur }]}>
      <Text style={styles.badgeText}>{medecin.nom}</Text>
    </View>
  );
}

function GestionMedecins({ medecins, compte, titreMois, ajouter, supprimer }) {
  const [nom, setNom] = useState('');
  const valider = () => {
    ajouter(nom);
    setNom('');
  };
  return (
    <View style={styles.card}>
      {medecins.length === 0 && (
        <Text style={styles.hint}>Commencez par ajouter les médecins du service.</Text>
      )}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          onSubmitEditing={valider}
          placeholder="Nom du médecin (ex. Dr Amine)"
          placeholderTextColor={COLORS.muted}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={valider}>
          <Text style={styles.addButtonText}>Ajouter</Text>
        </Pressable>
      </View>
      {medecins.length > 0 && <Text style={styles.label}>Gardes en {titreMois}</Text>}
      {medecins.map((m) => (
        <View key={m.id} style={styles.medecinRow}>
          <View style={[styles.dot, { backgroundColor: m.couleur }]} />
          <Text style={styles.medecinNom}>{m.nom}</Text>
          <Text style={styles.medecinCompte}>
            ☀️{compte[m.id].jour} 🌙{compte[m.id].nuit} 📟{compte[m.id].astreinte}
          </Text>
          <Pressable onPress={() => supprimer(m)} hitSlop={8}>
            <Text style={styles.delete}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ChoixMedecin({ selection, medecins, actuel, fermer, choisir }) {
  return (
    <Modal visible={!!selection} transparent animationType="fade" onRequestClose={fermer}>
      <Pressable style={styles.overlay} onPress={fermer}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {selection && (
            <>
              <Text style={styles.sheetTitle}>
                {selection.creneau.icone} {selection.creneau.label}
              </Text>
              <Text style={styles.label}>
                {selection.nomJour} {selection.numero}
              </Text>
              {medecins.length === 0 && (
                <Text style={styles.hint}>Ajoutez d’abord des médecins (bouton « Médecins »).</Text>
              )}
              <ScrollView style={styles.sheetList}>
                {medecins.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.choice, m.id === actuel && { borderColor: m.couleur }]}
                    onPress={() => choisir(m.id)}
                  >
                    <View style={[styles.dot, { backgroundColor: m.couleur }]} />
                    <Text style={styles.choiceText}>{m.nom}</Text>
                    {m.id === actuel && <Text style={styles.choiceText}>✓</Text>}
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.sheetActions}>
                {actuel && (
                  <ActionButton color={COLORS.grey} onPress={() => choisir(null)}>
                    Libérer
                  </ActionButton>
                )}
                <ActionButton color={COLORS.card} onPress={fermer}>
                  Fermer
                </ActionButton>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  label: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  hint: { color: COLORS.orange, fontSize: 15 },
  todayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayLabel: { color: COLORS.text, fontSize: 16 },
  todayEmpty: { color: COLORS.muted, fontSize: 16 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14 },
  toggleText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: { backgroundColor: COLORS.blue, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  medecinRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  medecinNom: { color: COLORS.text, fontSize: 16, flex: 1 },
  medecinCompte: { color: COLORS.muted, fontSize: 14 },
  delete: { color: COLORS.red, fontSize: 18, paddingHorizontal: 6 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  monthArrow: { backgroundColor: COLORS.card, borderRadius: 10, width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { color: COLORS.text, fontSize: 28, lineHeight: 30 },
  monthTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  headerRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
  headerCell: { flex: 1, color: COLORS.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 10,
    backgroundColor: COLORS.card,
  },
  weekend: { backgroundColor: '#252d38' },
  today: { borderWidth: 2, borderColor: COLORS.orange },
  dayCol: { width: 40, alignItems: 'center' },
  dayName: { color: COLORS.muted, fontSize: 12 },
  dayNumber: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  slot: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  slotText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  slotEmpty: { color: COLORS.muted, fontWeight: '400' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
    maxHeight: '80%',
  },
  sheetTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sheetList: { flexGrow: 0 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  choiceText: { color: COLORS.text, fontSize: 17, fontWeight: '600', flex: 1 },
  sheetActions: { flexDirection: 'row', gap: 10 },
});
