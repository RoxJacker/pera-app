import { View, StyleSheet } from 'react-native';
import { Radii, Shadows, Spacing } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

/**
 * Card — Contenedor base con sombra suave, responde al tema actual
 * Props:
 *   children: ReactNode
 *   style: ViewStyle (opcional)
 *   noPadding: boolean — quita el padding estándar
 *   soft: boolean — usa fondo cream-soft en vez de surface
 */
export default function Card({ children, style, noPadding, soft }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: soft ? theme.creamSoft : theme.surface,
          borderRadius: Radii.card,
          borderWidth: 1,
          borderColor: soft ? 'transparent' : theme.stoneLight,
          paddingHorizontal: Spacing.screenPadding - 2,
          paddingVertical: 15,
          marginBottom: Spacing.cardGap,
          ...(soft ? { shadowOpacity: 0, elevation: 0 } : Shadows.card),
        },
        noPadding && { paddingHorizontal: 0, paddingVertical: 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
