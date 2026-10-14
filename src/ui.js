import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';

export const COLORS = {
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

// Alert.alert n'affiche rien sur le web : on utilise window.confirm à la place.
export function confirmAction(title, message, confirmText, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

export function ActionButton({ color, onPress, disabled, children }) {
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
});
