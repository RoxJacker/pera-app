import {
  View, Text, TouchableOpacity, Modal, Pressable, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radii } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../ui/Icon';

const SHEET_ITEMS = [
  { label: 'Historial de ventas', route: '/historial', iconName: 'history' },
  { label: 'Servicios', route: '/servicios', iconName: 'scissors' },
  { label: 'Nueva entrada', route: '/entrada', iconName: 'package' },
  { label: 'Agenda de citas', route: '/agenda', iconName: 'calendar' },
  { label: 'Configuración', route: '/config', iconName: 'settings' },
];

/**
 * MoreSheet — Panel "Más opciones" que se activa desde el tab Más
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function MoreSheet({ visible, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const navigate = (route) => {
    onClose();
    setTimeout(() => router.push(route), 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.stoneLight,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.stoneLight }]} />
          <Text style={[styles.sheetTitle, { color: theme.inkSoft }]}>Más opciones</Text>

          {SHEET_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.sheetItem,
                { borderTopColor: theme.stoneLight },
                i === 0 && styles.firstItem,
              ]}
              onPress={() => navigate(item.route)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.creamSoft, borderColor: theme.stoneLight },
                ]}
              >
                <Icon name={item.iconName} size={16} color={theme.brand} />
              </View>
              <Text style={[styles.sheetItemLabel, { color: theme.ink }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radii.pill,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
  },
  firstItem: { borderTopWidth: 0 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemLabel: {
    fontSize: 13.5,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
