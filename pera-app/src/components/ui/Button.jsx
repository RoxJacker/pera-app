import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Radii } from '../../theme';

/**
 * Button — Botón primario o ghost
 * Props:
 *   variant: 'primary' | 'ghost' | 'danger'
 *   label: string
 *   onPress: () => void
 *   loading: boolean
 *   disabled: boolean
 *   style: ViewStyle
 */
export default function Button({ variant = 'primary', label, onPress, loading, disabled, style }) {
  const s = variantStyles[variant] ?? variantStyles.primary;

  return (
    <TouchableOpacity
      style={[styles.btn, s.btn, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {loading
        ? <ActivityIndicator color={s.textColor} size="small" />
        : <Text style={[styles.label, { color: s.textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const variantStyles = {
  primary: {
    btn: { backgroundColor: Colors.brand, borderWidth: 0 },
    textColor: Colors.brandText,
  },
  ghost: {
    btn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.stoneLight },
    textColor: Colors.brand,
  },
  danger: {
    btn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.terraBg },
    textColor: Colors.terra,
  },
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: Radii.btn,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  disabled: {
    opacity: 0.5,
  },
});
