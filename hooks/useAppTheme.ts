// hooks/useAppTheme.ts
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  return Colors[theme];
}