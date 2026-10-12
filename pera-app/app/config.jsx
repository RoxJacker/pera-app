import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import Card from '../src/components/ui/Card';
import Button from '../src/components/ui/Button';
import Icon from '../src/components/ui/Icon';
import { useTheme } from '../src/context/ThemeContext';
import { Radii } from '../src/theme';

export default function ConfigView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const s = makeStyles(theme);

  const [textoGrande, setTextoGrande] = useState(true);
  const [alertasStock, setAlertasStock] = useState(true);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Regresar"
        >
          <Icon name="arrow-left" size={18} color={theme.brand} />
        </TouchableOpacity>
        <Text style={s.title}>Configuración</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Perfil */}
        <View style={s.perfil}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>B</Text>
          </View>
          <View>
            <Text style={s.perfilNombre}>Belleza Pera</Text>
            <Text style={s.perfilSub}>Cambiar logo</Text>
          </View>
        </View>

        {/* Datos del negocio */}
        <Card>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Nombre del negocio</Text>
            <TextInput
              style={s.input}
              defaultValue="Belleza Pera"
              placeholderTextColor={theme.stone}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Moneda</Text>
            <View style={[s.input, { justifyContent: 'center' }]}>
              <Text style={{ fontSize: 13, fontFamily: 'Montserrat_400Regular', color: theme.ink }}>
                MXN — Peso mexicano
              </Text>
            </View>
          </View>
        </Card>

        {/* Preferencias */}
        <Card>
          {/* Tema oscuro/claro */}
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Icon name={isDark ? 'moon' : 'sun'} size={16} color={theme.brand} />
              <View style={{ marginLeft: 10 }}>
                <Text style={s.toggleLabel}>Tema oscuro</Text>
                <Text style={s.toggleSub}>{isDark ? 'Activado' : 'Usando tema claro'}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.stoneLight, true: theme.brand }}
              thumbColor={theme.surface}
            />
          </View>

          <View style={[s.toggleRow, s.toggleRowBorder]}>
            <View style={s.toggleLeft}>
              <Icon name="type" size={16} color={theme.stone} />
              <Text style={[s.toggleLabel, { marginLeft: 10 }]}>Texto grande</Text>
            </View>
            <Switch
              value={textoGrande}
              onValueChange={setTextoGrande}
              trackColor={{ false: theme.stoneLight, true: theme.brand }}
              thumbColor={theme.surface}
            />
          </View>

          <View style={[s.toggleRow, s.toggleRowBorder]}>
            <View style={s.toggleLeft}>
              <Icon name="bell" size={16} color={theme.stone} />
              <Text style={[s.toggleLabel, { marginLeft: 10 }]}>Alertas de stock bajo</Text>
            </View>
            <Switch
              value={alertasStock}
              onValueChange={setAlertasStock}
              trackColor={{ false: theme.stoneLight, true: theme.brand }}
              thumbColor={theme.surface}
            />
          </View>
        </Card>

        <Button
          variant="danger"
          label="Cerrar sesión"
          onPress={() => router.replace('/(auth)/login')}
        />
      </ScrollView>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.cream },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 17, fontFamily: 'Montserrat_800ExtraBold', color: t.ink },
    content: { padding: 18, paddingBottom: 40, gap: 12 },
    perfil: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: t.brandText },
    perfilNombre: { fontSize: 14, fontFamily: 'Montserrat_700Bold', color: t.ink },
    perfilSub: { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: t.stone },
    field: { marginBottom: 13 },
    fieldLabel: {
      fontSize: 10.5,
      fontFamily: 'Montserrat_700Bold',
      color: t.inkSoft,
      marginBottom: 5,
    },
    input: {
      width: '100%',
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: Radii.input,
      borderWidth: 1,
      borderColor: t.stoneLight,
      backgroundColor: t.creamSoft,
      fontFamily: 'Montserrat_400Regular',
      fontSize: 13,
      color: t.ink,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
    },
    toggleRowBorder: {
      borderTopWidth: 1,
      borderTopColor: t.stoneLight,
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center' },
    toggleLabel: { fontSize: 12.5, fontFamily: 'Montserrat_600SemiBold', color: t.ink },
    toggleSub: { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: t.stone, marginTop: 1 },
  });
}
