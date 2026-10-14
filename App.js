import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import {
  BEAT_MS,
  COMPRESSION_BPM,
  EVENTS,
  adrenalineStatus,
  countEvents,
  cycleRemaining,
  formatClock,
  formatDuration,
  nextAmiodarone,
} from './src/rcp';

// Alert.alert n'affiche rien sur le web : on utilise window.confirm à la place.
function confirmAction(title, message, confirmText, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

const COLORS = {
  bg: '#101418',
  card: '#1c232b',
  text: '#f2f4f7',
  muted: '#98a2b3',
  red: '#e5484d',
  orange: '#f5a524',
  green: '#30a46c',
  blue: '#3e8ed0',
  purple: '#8e4ec6',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AssistantRCP />
    </SafeAreaProvider>
  );
}

function AssistantRCP() {
  useKeepAwake();
  const player = useAudioPlayer(require('./assets/bip.wav'));

  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [cycleStart, setCycleStart] = useState(null);
  const [cycleNumber, setCycleNumber] = useState(0);
  const [log, setLog] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [beat, setBeat] = useState(false);
  const cycleAlerted = useRef(false);

  const running = startedAt != null && endedAt == null;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Horloge : rafraîchit l'affichage 4 fois par seconde pendant la réanimation.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // Métronome de compressions.
  useEffect(() => {
    if (!running || !metronomeOn) return undefined;
    const id = setInterval(() => {
      setBeat((b) => !b);
      player.seekTo(0).catch(() => {});
      player.play();
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [running, metronomeOn, player]);

  // Fin du cycle de 2 minutes : alerte unique pour l'analyse du rythme.
  const remaining = running && cycleStart != null ? cycleRemaining(cycleStart, now) : null;
  const analysisDue = remaining === 0;
  useEffect(() => {
    if (analysisDue && !cycleAlerted.current) {
      cycleAlerted.current = true;
      Vibration.vibrate([0, 500, 200, 500]);
    }
  }, [analysisDue]);

  const addEvent = (label, at = Date.now()) => {
    setLog((l) => [{ id: `${at}-${l.length}`, label, at }, ...l]);
    setNow(at);
  };

  const newCycle = (at) => {
    setCycleStart(at);
    setCycleNumber((n) => n + 1);
    cycleAlerted.current = false;
  };

  const start = () => {
    const at = Date.now();
    setStartedAt(at);
    setEndedAt(null);
    setLog([]);
    setCycleNumber(0);
    newCycle(at);
    addEvent(EVENTS.START, at);
  };

  const rhythmChecked = (label) => {
    const at = Date.now();
    addEvent(label, at);
    newCycle(at);
  };

  const finish = (label) => {
    confirmAction(label, 'Confirmer la fin de la réanimation ?', 'Confirmer', () => {
      const at = Date.now();
      addEvent(label, at);
      setEndedAt(at);
    });
  };

  const reset = () => {
    confirmAction('Nouvelle réanimation', 'Effacer le journal actuel ?', 'Effacer', () => {
      setStartedAt(null);
      setEndedAt(null);
      setCycleStart(null);
      setLog([]);
    });
  };

  if (startedAt == null) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.title}>Assistant RCP</Text>
        <Text style={styles.subtitle}>
          Cycles de 2 min · Métronome {COMPRESSION_BPM}/min · Adrénaline toutes les 3-5 min
        </Text>
        <Pressable style={[styles.bigButton, { backgroundColor: COLORS.red }]} onPress={start}>
          <Text style={styles.bigButtonText}>DÉMARRER LA RCP</Text>
        </Pressable>
        <Text style={styles.disclaimer}>
          Outil d’aide uniquement. Ne remplace ni la formation ni les protocoles en vigueur.
        </Text>
      </SafeAreaView>
    );
  }

  const elapsedEnd = endedAt ?? now;
  const lastAdrenaline = log.find((e) => e.label === EVENTS.ADRENALINE);
  const adre = adrenalineStatus(lastAdrenaline?.at ?? null, now);
  const adreColor = { none: COLORS.muted, ok: COLORS.green, due: COLORS.orange, late: COLORS.red }[
    adre.level
  ];
  const amiodarone = nextAmiodarone(log);
  const shocks = countEvents(log, EVENTS.SHOCK);
  const adrenalineCount = countEvents(log, EVENTS.ADRENALINE);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <View style={[styles.card, styles.flex]}>
            <Text style={styles.label}>Durée totale</Text>
            <Text style={styles.timer}>{formatDuration(elapsedEnd - startedAt)}</Text>
          </View>
          <View
            style={[
              styles.card,
              styles.flex,
              analysisDue && { backgroundColor: COLORS.red },
            ]}
          >
            <Text style={styles.label}>Cycle {cycleNumber}</Text>
            <Text style={styles.timer}>{running ? formatDuration(remaining) : '--:--'}</Text>
          </View>
        </View>

        {running && analysisDue && (
          <View style={[styles.card, { backgroundColor: COLORS.red }]}>
            <Text style={styles.alertText}>ANALYSE DU RYTHME</Text>
            <Text style={styles.alertSub}>Changez de masseur</Text>
          </View>
        )}

        {running && (
          <>
            <View style={styles.row}>
              <ActionButton color={COLORS.orange} onPress={() => rhythmChecked(EVENTS.SHOCK)}>
                ⚡ Choc délivré
              </ActionButton>
              <ActionButton color={COLORS.blue} onPress={() => rhythmChecked(EVENTS.NO_SHOCK)}>
                Pas de choc
              </ActionButton>
            </View>

            <View style={[styles.card, { borderColor: adreColor, borderWidth: 2 }]}>
              <Text style={styles.label}>Adrénaline ({adrenalineCount} dose(s))</Text>
              <Text style={[styles.timerSmall, { color: adreColor }]}>
                {adre.level === 'none'
                  ? 'Aucune dose'
                  : `Dernière dose il y a ${formatDuration(adre.elapsed)}`}
              </Text>
              {adre.level === 'due' && <Text style={styles.hint}>Nouvelle dose recommandée</Text>}
              {adre.level === 'late' && <Text style={styles.hint}>Dose en retard (&gt; 5 min)</Text>}
              <ActionButton color={COLORS.red} onPress={() => addEvent(EVENTS.ADRENALINE)}>
                💉 Adrénaline 1 mg
              </ActionButton>
            </View>

            <View style={styles.row}>
              <ActionButton
                color={COLORS.purple}
                disabled={!amiodarone}
                onPress={() => amiodarone && addEvent(amiodarone)}
              >
                {amiodarone ?? 'Amiodarone : max atteint'}
              </ActionButton>
              <ActionButton color={COLORS.card} onPress={() => addEvent(EVENTS.AIRWAY)}>
                Intubation
              </ActionButton>
            </View>

            <Pressable
              style={[styles.metronome, beat && metronomeOn && styles.metronomeBeat]}
              onPress={() => setMetronomeOn((m) => !m)}
            >
              <Text style={styles.metronomeText}>
                {metronomeOn ? `🔊 Métronome ${COMPRESSION_BPM}/min` : '🔇 Métronome coupé'}
              </Text>
            </Pressable>

            <View style={styles.row}>
              <ActionButton color={COLORS.green} onPress={() => finish(EVENTS.ROSC)}>
                ❤️ RACS
              </ActionButton>
              <ActionButton color="#475467" onPress={() => finish(EVENTS.STOP)}>
                Arrêt RCP
              </ActionButton>
            </View>
          </>
        )}

        {!running && (
          <ActionButton color={COLORS.red} onPress={reset}>
            Nouvelle réanimation
          </ActionButton>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>
            Journal · {shocks} choc(s) · {adrenalineCount} adrénaline(s)
          </Text>
          {log.map((e) => (
            <View key={e.id} style={styles.logRow}>
              <Text style={styles.logTime}>
                {formatDuration(e.at - startedAt)} ({formatClock(e.at)})
              </Text>
              <Text style={styles.logLabel}>{e.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ color, onPress, disabled, children }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, gap: 12 },
  title: { color: COLORS.text, fontSize: 34, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 15, textAlign: 'center', marginTop: 8 },
  bigButton: {
    marginTop: 40,
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigButtonText: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  disclaimer: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 8 },
  label: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  timer: { color: COLORS.text, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerSmall: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  alertText: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  alertSub: { color: '#fff', fontSize: 16, textAlign: 'center' },
  button: {
    flex: 1,
    minHeight: 60,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  metronome: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  metronomeBeat: { borderColor: COLORS.red },
  metronomeText: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  logTime: { color: COLORS.muted, fontVariant: ['tabular-nums'], width: 130 },
  logLabel: { color: COLORS.text, flex: 1 },
});
