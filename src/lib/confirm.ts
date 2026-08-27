import { Alert, Platform } from 'react-native';

// Cross-platform confirm. Alert.alert's button callbacks don't fire on the web
// build (so "delete" taps did nothing there); on web we use window.confirm.
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'OK',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.confirm) return Promise.resolve(true);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
