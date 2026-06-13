import { Alert, Platform } from 'react-native';

// Cross-platform confirmation.
//
// react-native-web's Alert.alert IGNORES the buttons array — no buttons render
// and no onPress callback ever fires. That silently broke logout and workout
// exit on the web build (viaxe-app.vercel.app), where the whole client app runs.
//
// This resolves to true (confirmed) / false (cancelled) on every platform:
//   - web:    window.confirm (synchronous, but wrapped in a Promise)
//   - native: Alert.alert with a two-button cancel/confirm sheet
export function confirm(
  title: string,
  message?: string,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // eslint-disable-next-line no-alert
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(text) : false);
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
