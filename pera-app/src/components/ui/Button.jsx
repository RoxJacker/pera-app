import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Radii } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

/**
 * Button — Botón primario, ghost o danger
 * Props:
 *   variant: 'primary' | 'ghost' | 'danger'
 *   label: string
 *   onPress: () => void
 *   loading: boolean
 *   disabled: boolean
 *   style: ViewStyle
 */
export default function Button({ variant = 'primary', label, onPress, loading, disabled, style }) {
  const { theme } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'ghost':
        return { bg: theme.surface, border: theme.stoneLight, text: theme.brand };
      case 'danger':
        return { bg: theme.surface, border: theme.terraBg, text: theme.terra };
      default: // primary
        return { bg: theme.brand, border: 'transparent', text: theme.brandText };
    }
  };

  const v = getVariantStyle();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: v.bg, borderWidth: 1, borderColor: v.border },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={[styles.label, { color: v.text }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

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
