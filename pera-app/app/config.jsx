import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import Card from '../src/components/ui/Card';
import Button from '../src/components/ui/Button';
import Icon from '../src/components/ui/Icon';
import { Colors, Radii } from '../src/theme';
import { TextInput } from 'react-native';

export default function ConfigView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [textoGrande, setTextoGrande] = useState(true);
  const [alertasStock, setAlertasStock] = useState(true);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Regresar"
        >
          <Icon name="arrow-left" size={18} color={Colors.brand} />
        </TouchableOpacity>
        <Text style={styles.title}>Configuración</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Perfil */}
        <View style={styles.perfil}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>B</Text>
          </View>
          <View>
            <Text style={styles.perfilNombre}>Belleza Pera</Text>
            <Text style={styles.perfilSub}>Cambiar logo</Text>
          </View>
        </View>

        {/* Datos del negocio */}
        <Card>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre del negocio</Text>
            <TextInput
              style={styles.input}
              defaultValue="Belleza Pera"
              placeholderTextColor={Colors.stone}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Moneda</Text>
            <View style={[styles.input, { justifyContent: 'center' }]}>
              <Text style={{ fontSize: 13, fontFamily: 'Montserrat_400Regular', color: Colors.ink }}>
                MXN — Peso mexicano
              </Text>
            </View>
          </View>
        </Card>

        {/* Preferencias */}
        <Card>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Texto grande</Text>
            <Switch
              value={textoGrande}
              onValueChange={setTextoGrande}
              trackColor={{ false: Colors.stoneLight, true: Colors.brand }}
              thumbColor={Colors.surface}
            />
          </View>
          <View style={[styles.toggleRow, styles.toggleRowBorder]}>
            <Text style={styles.toggleLabel}>Alertas de stock bajo</Text>
            <Switch
              value={alertasStock}
              onValueChange={setAlertasStock}
              trackColor={{ false: Colors.stoneLight, true: Colors.brand }}
              thumbColor={Colors.surface}
            />
          </View>
        </Card>

        <Button variant="danger" label="Cerrar sesión" onPress={() => router.replace('/(auth)/login')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.brand, fontFamily: 'Montserrat_700Bold' },
  title: { fontSize: 17, fontFamily: 'Montserrat_800ExtraBold', color: Colors.ink },
  content: { padding: 18, paddingBottom: 40, gap: 12 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.brandText },
  perfilNombre: { fontSize: 14, fontFamily: 'Montserrat_700Bold', color: Colors.ink },
  perfilSub: { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: Colors.stone },
  field: { marginBottom: 13 },
  fieldLabel: { fontSize: 10.5, fontFamily: 'Montserrat_700Bold', color: Colors.inkSoft, marginBottom: 5 },
  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    backgroundColor: Colors.creamSoft,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: Colors.ink,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  toggleLabel: { fontSize: 12.5, fontFamily: 'Montserrat_600SemiBold', color: Colors.ink },
});
