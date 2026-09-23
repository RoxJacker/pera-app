import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../../theme';

const variants = {
  ok:   { bg: Colors.sageBg,   text: Colors.sage },
  low:  { bg: Colors.terraBg,  text: Colors.terra },
  warn: { bg: Colors.amberBg,  text: Colors.amberInk },
};

/**
 * Badge — Píldora semántica de estado
 * Props:
 *   variant: 'ok' | 'low' | 'warn'
 *   label: string
 */
export default function Badge({ variant = 'ok', label }) {
  const v = variants[variant] ?? variants.ok;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});
