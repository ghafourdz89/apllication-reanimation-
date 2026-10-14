import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/ui';
import EcranPlanning from './src/planning/EcranPlanning';
import EcranRCP from './src/rcp/EcranRCP';

const ONGLETS = [
  { id: 'planning', label: 'Planning', icone: '📅' },
  { id: 'rcp', label: 'RCP', icone: '❤️' },
];

export default function App() {
  const [onglet, setOnglet] = useState('planning');
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        {/* Les deux écrans restent montés : une RCP en cours continue en arrière-plan. */}
        <View style={[styles.page, onglet !== 'planning' && styles.hidden]}>
          <EcranPlanning />
        </View>
        <View style={[styles.page, onglet !== 'rcp' && styles.hidden]}>
          <EcranRCP />
        </View>
        <View style={styles.tabBar}>
          {ONGLETS.map((o) => (
            <Pressable key={o.id} style={styles.tab} onPress={() => setOnglet(o.id)}>
              <Text style={styles.tabIcon}>{o.icone}</Text>
              <Text style={[styles.tabLabel, onglet === o.id && styles.tabActive]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  page: { flex: 1 },
  hidden: { display: 'none' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.card,
    backgroundColor: COLORS.bg,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 22 },
  tabLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  tabActive: { color: COLORS.text, fontWeight: '800' },
});
