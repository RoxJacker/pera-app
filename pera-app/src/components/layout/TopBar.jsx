import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadows, Radii } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../ui/Icon';

/**
 * TopBar — Barra superior fija con centro de avisos integrado
 * Props:
 *   title: string
 *   subtitle: string
 *   onNotification?: () => void
 */
export default function TopBar({ title, subtitle, onNotification }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [modalAvisos, setModalAvisos] = useState(false);

  const handlePressBell = () => {
    if (onNotification) {
      onNotification();
    } else {
      setModalAvisos(true);
    }
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.cream,
            paddingTop: insets.top + 8,
            borderBottomColor: theme.stoneLight,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: theme.inkSoft }]}>{subtitle}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: theme.surface, borderColor: theme.stoneLight }]}
          onPress={handlePressBell}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Avisos y notificaciones"
          accessibilityRole="button"
        >
          <Icon name="bell" size={15} color={theme.brand} />
        </TouchableOpacity>
      </View>

      {/* Modal Centro de Avisos Rápidos */}
      <Modal
        visible={modalAvisos}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAvisos(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalAvisos(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.stoneLight },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.stoneLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="bell" size={16} color={theme.brand} />
                <Text style={[styles.modalTitle, { color: theme.ink }]}>Avisos de Belleza Pera</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalAvisos(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={16} color={theme.inkSoft} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.avisoItem, { borderBottomColor: theme.stoneLight }]}
              onPress={() => { setModalAvisos(false); router.push('/agenda'); }}
              activeOpacity={0.75}
            >
              <View style={[styles.avisoIconCircle, { backgroundColor: theme.creamSoft, borderColor: theme.stoneLight }]}>
                <Icon name="calendar" size={16} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.avisoItemTitle, { color: theme.ink }]}>Agenda de citas</Text>
                <Text style={[styles.avisoItemSub, { color: theme.inkSoft }]}>
                  Revisa las citas programadas para hoy y los próximos días
                </Text>
              </View>
              <Icon name="arrow-right" size={14} color={theme.brand} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avisoItem, { borderBottomColor: theme.stoneLight }]}
              onPress={() => { setModalAvisos(false); router.push('/entrada'); }}
              activeOpacity={0.75}
            >
              <View style={[styles.avisoIconCircle, { backgroundColor: theme.terraBg, borderColor: theme.stoneLight }]}>
                <Icon name="warning" size={16} color={theme.terra} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.avisoItemTitle, { color: theme.ink }]}>Registrar compra de stock</Text>
                <Text style={[styles.avisoItemSub, { color: theme.inkSoft }]}>
                  Ingresa nueva mercancía para mantener surtido tu negocio
                </Text>
              </View>
              <Icon name="arrow-right" size={14} color={theme.brand} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avisoItem, { borderBottomWidth: 0 }]}
              onPress={() => { setModalAvisos(false); router.push('/historial'); }}
              activeOpacity={0.75}
            >
              <View style={[styles.avisoIconCircle, { backgroundColor: theme.sageBg, borderColor: theme.stoneLight }]}>
                <Icon name="history" size={16} color={theme.sage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.avisoItemTitle, { color: theme.ink }]}>Historial de ventas</Text>
                <Text style={[styles.avisoItemSub, { color: theme.inkSoft }]}>
                  Consulta tickets emitidos y comparte comprobantes
                </Text>
              </View>
              <Icon name="arrow-right" size={14} color={theme.brand} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    ...Shadows.topBar,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  subtitle: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 1,
  },
  notifBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.iconBtn,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  avisoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  avisoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoItemTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  avisoItemSub: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
    lineHeight: 15,
  },
});
