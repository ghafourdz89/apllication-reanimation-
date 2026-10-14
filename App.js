import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import { BEAT_MS, COMPRESSION_BPM, formatClock, formatDuration } from './src/rcp';
import {
  CAUSES,
  PHASES,
  RYTHMES,
  adrenalineGuidance,
  amiodaroneGuidance,
  cycleRemaining,
  initialState,
  reducer,
} from './src/algorithme';

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
  grey: '#475467',
};

const LEVEL_COLORS = {
  attente: COLORS.muted,
  ok: COLORS.green,
  due: COLORS.orange,
  retard: COLORS.red,
};

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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [now, setNow] = useState(Date.now());
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [beat, setBeat] = useState(false);

  const act = (type, extra = {}) => {
    const at = Date.now();
    setNow(at);
    dispatch({ type, at, ...extra });
  };

  const { phase } = state;
  const active = phase === PHASES.ANALYSE || phase === PHASES.CHOC || phase === PHASES.RCP;
  const compressions = phase === PHASES.RCP || phase === PHASES.CHOC;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Horloge : rafraîchit l'affichage 4 fois par seconde pendant la réanimation.
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);

  // Métronome de compressions (coupé pendant l'analyse du rythme).
  useEffect(() => {
    if (!compressions || !metronomeOn) return undefined;
    const id = setInterval(() => {
      setBeat((b) => !b);
      player.seekTo(0).catch(() => {});
      player.play();
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [compressions, metronomeOn, player]);

  // Fin du cycle de 2 minutes : passage automatique à l'analyse du rythme.
  const remaining = cycleRemaining(state, now);
  const cycleOver = phase === PHASES.RCP && remaining === 0;
  useEffect(() => {
    if (cycleOver) {
      Vibration.vibrate([0, 500, 200, 500]);
      dispatch({ type: 'ANALYSE', at: Date.now() });
    }
  }, [cycleOver]);

  if (phase === PHASES.ACCUEIL) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.title}>Assistant RCP</Text>
        <Text style={styles.subtitle}>Algorithme de réanimation avancée de l’adulte (ERC)</Text>
        <Pressable style={styles.startButton} onPress={() => act('START')}>
          <Text style={styles.startButtonText}>DÉMARRER LA RCP</Text>
        </Pressable>
        <View style={styles.startSteps}>
          <Step>Arrêt cardiaque confirmé : appeler l’équipe de réanimation</Step>
          <Step>Débuter le massage cardiaque 30:2</Step>
          <Step>Oxygène, brancher le défibrillateur / scope</Step>
        </View>
        <Text style={styles.disclaimer}>
          Outil d’aide uniquement. Ne remplace ni la formation ni les protocoles de votre service.
        </Text>
      </SafeAreaView>
    );
  }

  const elapsedTotal = (state.endedAt ?? now) - state.startedAt;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <View style={[styles.card, styles.flex]}>
            <Text style={styles.label}>Durée totale</Text>
            <Text style={styles.timer}>{formatDuration(elapsedTotal)}</Text>
          </View>
          <View style={[styles.card, styles.flex]}>
            <Text style={styles.label}>
              {phase === PHASES.RCP ? `Cycle ${state.cycleNumber}` : 'Chocs délivrés'}
            </Text>
            <Text style={styles.timer}>
              {phase === PHASES.RCP ? formatDuration(remaining) : state.shocks}
            </Text>
          </View>
        </View>

        {phase === PHASES.ANALYSE && <AnalysePanel act={act} first={state.cycleNumber === 0} />}
        {phase === PHASES.CHOC && <ChocPanel act={act} shockNumber={state.shocks + 1} />}
        {phase === PHASES.RCP && (
          <RcpPanel state={state} now={now} act={act} metronomeOn={metronomeOn} beat={beat}
            toggleMetronome={() => setMetronomeOn((m) => !m)} />
        )}
        {phase === PHASES.RACS && <RacsPanel act={act} />}

        {active && (
          <>
            <CausesPanel causes={state.causes} toggle={(id) => dispatch({ type: 'TOGGLE_CAUSE', id })} />
            <View style={styles.row}>
              <ActionButton color={COLORS.green}
                onPress={() => confirmAction('RACS', 'Reprise d’activité cardiaque (pouls présent) ?', 'Confirmer', () => act('ROSC'))}>
                ❤️ RACS
              </ActionButton>
              <ActionButton color={COLORS.grey}
                onPress={() => confirmAction('Arrêt de la réanimation', 'Confirmer l’arrêt de la réanimation ?', 'Confirmer', () => act('STOP'))}>
                Arrêt RCP
              </ActionButton>
            </View>
          </>
        )}

        {(phase === PHASES.FIN || phase === PHASES.RACS) && (
          <ActionButton color={COLORS.red}
            onPress={() => confirmAction('Nouvelle réanimation', 'Effacer le journal actuel ?', 'Effacer', () => act('RESET'))}>
            Nouvelle réanimation
          </ActionButton>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>
            Journal · {state.shocks} choc(s) · {state.adrenalineTimes.length} adrénaline(s) ·{' '}
            {state.amiodaroneDoses} amiodarone
          </Text>
          {state.log.map((e) => (
            <View key={e.id} style={styles.logRow}>
              <Text style={styles.logTime}>
                {formatDuration(e.at - state.startedAt)} ({formatClock(e.at)})
              </Text>
              <Text style={styles.logLabel}>{e.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalysePanel({ act, first }) {
  return (
    <View style={[styles.card, styles.alertCard]}>
      <Text style={styles.alertTitle}>ANALYSE DU RYTHME</Text>
      <Step light>Pause du massage la plus courte possible (moins de 10 s)</Step>
      {!first && <Step light>Changer de masseur</Step>}
      <Step light>Rythme organisé ? Vérifier le pouls → si pouls : RACS</Step>
      <Text style={styles.question}>Quel est le rythme ?</Text>
      <ActionButton color={COLORS.orange} onPress={() => act('RHYTHM', { rhythm: RYTHMES.CHOQUABLE })}>
        ⚡ Choquable{'\n'}FV / TV sans pouls
      </ActionButton>
      <ActionButton color={COLORS.blue} onPress={() => act('RHYTHM', { rhythm: RYTHMES.NON_CHOQUABLE })}>
        Non choquable{'\n'}Asystolie / AESP
      </ActionButton>
    </View>
  );
}

function ChocPanel({ act, shockNumber }) {
  return (
    <View style={[styles.card, { borderColor: COLORS.orange, borderWidth: 2 }]}>
      <Text style={[styles.alertTitle, { color: COLORS.orange }]}>CHOC N°{shockNumber}</Text>
      <Step>Reprendre le massage pendant la charge du défibrillateur</Step>
      <Step>Énergie : 150-200 J biphasique (puis selon le fabricant, augmenter si échec)</Step>
      <Step>« Écartez-vous ! » — oxygène à distance, personne ne touche le patient</Step>
      <Step>Délivrer le choc</Step>
      <Step>Reprendre IMMÉDIATEMENT le massage pendant 2 min, sans vérifier le pouls</Step>
      <ActionButton color={COLORS.orange} onPress={() => act('SHOCK')}>
        ⚡ Choc délivré → reprendre le massage
      </ActionButton>
    </View>
  );
}

function RcpPanel({ state, now, act, metronomeOn, beat, toggleMetronome }) {
  const adre = adrenalineGuidance(state, now);
  const amio = amiodaroneGuidance(state);
  const rhythmLabel =
    state.lastRhythm === RYTHMES.CHOQUABLE ? 'Rythme choquable (FV / TV sans pouls)' : 'Rythme non choquable (asystolie / AESP)';
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.label}>{rhythmLabel}</Text>
        <Text style={styles.sectionTitle}>À FAIRE PENDANT CE CYCLE</Text>
        <Step>Massage cardiaque de qualité : 100-120/min, 5-6 cm, relâchement complet</Step>
        {!state.access && <Step>Poser une voie veineuse ou intra-osseuse</Step>}
        {state.airway ? (
          <Step>Intubé : massage continu, 10 insufflations/min, capnographie</Step>
        ) : (
          <Step>Ventilation 30:2 ; envisager une voie aérienne avancée + capnographie</Step>
        )}
        <Step>Rechercher et traiter les causes réversibles (4H / 4T ci-dessous)</Step>
      </View>

      <DrugCard title="Adrénaline 1 mg IV/IO" guidance={adre} buttonLabel="💉 Adrénaline 1 mg donnée"
        onPress={() => act('ADRENALINE')} />
      {amio && (
        <DrugCard title="Amiodarone" guidance={amio}
          buttonLabel={state.amiodaroneDoses === 0 ? '💊 Amiodarone 300 mg donnée' : '💊 Amiodarone 150 mg donnée'}
          onPress={() => act('AMIODARONE')} />
      )}

      <View style={styles.row}>
        {!state.access && (
          <ActionButton color={COLORS.card} onPress={() => act('ACCESS')}>Voie IV / IO posée</ActionButton>
        )}
        {!state.airway && (
          <ActionButton color={COLORS.card} onPress={() => act('AIRWAY')}>Intubation faite</ActionButton>
        )}
      </View>

      <Pressable style={[styles.metronome, beat && metronomeOn && styles.metronomeBeat]} onPress={toggleMetronome}>
        <Text style={styles.metronomeText}>
          {metronomeOn ? `🔊 Métronome ${COMPRESSION_BPM}/min` : '🔇 Métronome coupé'}
        </Text>
      </Pressable>

      <ActionButton color={COLORS.red} onPress={() => act('ANALYSE')}>
        Analyser le rythme maintenant
      </ActionButton>
    </>
  );
}

function DrugCard({ title, guidance, buttonLabel, onPress }) {
  const color = LEVEL_COLORS[guidance.level];
  const due = guidance.level === 'due' || guidance.level === 'retard';
  return (
    <View style={[styles.card, { borderColor: color, borderWidth: 2 }]}>
      <Text style={styles.label}>{title}</Text>
      <Text style={[styles.guidance, { color }]}>{guidance.text}</Text>
      {guidance.level !== 'attente' && (
        <ActionButton color={due ? COLORS.red : COLORS.grey} onPress={onPress}>
          {buttonLabel}
        </ActionButton>
      )}
    </View>
  );
}

function RacsPanel({ act }) {
  return (
    <View style={[styles.card, { borderColor: COLORS.green, borderWidth: 2 }]}>
      <Text style={[styles.alertTitle, { color: COLORS.green }]}>RACS — SOINS POST-RÉANIMATION</Text>
      <Step>Approche ABCDE</Step>
      <Step>SpO₂ 94-98 %, normocapnie (capnographie)</Step>
      <Step>PAS &gt; 100 mmHg (PAM ≥ 65 mmHg)</Step>
      <Step>ECG 12 dérivations : coronarographie si sus-décalage du ST</Step>
      <Step>Glycémie, prévenir la fièvre (&gt; 37,7 °C)</Step>
      <Step>Transfert en réanimation</Step>
      <ActionButton color={COLORS.red} onPress={() => act('REARREST')}>
        Récidive d’arrêt → analyser le rythme
      </ActionButton>
    </View>
  );
}

function CausesPanel({ causes, toggle }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>CAUSES RÉVERSIBLES (4H / 4T)</Text>
      {CAUSES.map((c) => (
        <Pressable key={c.id} style={styles.causeRow} onPress={() => toggle(c.id)}>
          <Text style={styles.causeCheck}>{causes[c.id] ? '☑' : '☐'}</Text>
          <Text style={[styles.causeText, causes[c.id] && styles.causeDone]}>
            {c.groupe} · {c.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Step({ children, light }) {
  return (
    <View style={styles.stepRow}>
      <Text style={[styles.stepBullet, light && styles.stepLight]}>•</Text>
      <Text style={[styles.stepText, light && styles.stepLight]}>{children}</Text>
    </View>
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
  startButton: {
    marginTop: 32,
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },
  startButtonText: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  startSteps: { marginTop: 28, alignSelf: 'stretch', gap: 4 },
  disclaimer: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 28 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 8 },
  alertCard: { backgroundColor: '#5c1a1d', borderColor: COLORS.red, borderWidth: 2 },
  alertTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  question: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  label: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  timer: { color: COLORS.text, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  guidance: { fontSize: 17, fontWeight: '700' },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepBullet: { color: COLORS.muted, fontSize: 15 },
  stepText: { color: COLORS.text, fontSize: 15, flex: 1 },
  stepLight: { color: '#fff' },
  button: {
    flex: 1,
    minHeight: 60,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  causeRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  causeCheck: { color: COLORS.text, fontSize: 18 },
  causeText: { color: COLORS.text, fontSize: 15, flex: 1 },
  causeDone: { color: COLORS.muted, textDecorationLine: 'line-through' },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  logTime: { color: COLORS.muted, fontVariant: ['tabular-nums'], width: 130 },
  logLabel: { color: COLORS.text, flex: 1 },
});
