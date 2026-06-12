// C is the dark palette kept for any remaining legacy refs; all screens should use useTheme()
export { darkTokens as C } from './context/ThemeContext';
export type { Tokens, ThemeMode } from './context/ThemeContext';

export const ARIA_INSIGHTS: Record<string, string> = {
  high_streak: 'Elite consistency. Keep the momentum going.',
  mid_streak:  'Building momentum. Stay the course.',
  low_streak:  'Every session counts. Keep showing up.',
  default:     'Log workouts and bodyweight to unlock personalised AI insights.',
};

// ARIA_RESPONSES removed — use buildAriaResponse() in ARIAScreen for data-aware responses
