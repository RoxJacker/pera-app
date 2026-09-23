import { View, StyleSheet } from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../theme';

/**
 * Card — Contenedor base blanco con sombra suave
 * Props:
 *   children: ReactNode
 *   style: ViewStyle (opcional)
 *   noPadding: boolean — quita el padding estándar
 *   soft: boolean — usa fondo cream-soft en vez de blanco
 */
export default function Card({ children, style, noPadding, soft }) {
  return (
    <View
      style={[
        styles.card,
        soft && styles.soft,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    paddingHorizontal: Spacing.screenPadding - 2,
    paddingVertical: 15,
    marginBottom: Spacing.cardGap,
    ...Shadows.card,
  },
  soft: {
    backgroundColor: Colors.creamSoft,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
