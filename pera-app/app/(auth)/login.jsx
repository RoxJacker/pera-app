import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii } from '../../src/theme';
import { verificarPin } from '../../src/services/authService';

export default function LoginView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleDigito = async (d) => {
    if (cargando || pin.length >= 4) return;
    setErrorMsg('');
    const nuevo = pin + d;
    setPin(nuevo);

    if (nuevo.length === 4) {
      setCargando(true);
      try {
        const esValido = await verificarPin(nuevo);
        if (esValido) {
          router.replace('/(tabs)');
        } else {
          setErrorMsg('PIN incorrecto. Intenta de nuevo');
          setTimeout(() => {
            setPin('');
            setCargando(false);
          }, 600);
        }
      } catch (err) {
        setErrorMsg('Error al verificar. Intenta de nuevo');
        setPin('');
        setCargando(false);
      }
    }
  };

  const borrar = () => {
    if (cargando) return;
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const TECLADO = ['1','2','3','4','5','6','7','8','9','','0','←'];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarLetter}>B</Text>
      </View>
      <Text style={styles.appName}>Belleza Pera</Text>
      <Text style={styles.instruccion}>Ingresa tu PIN</Text>

      {/* Indicadores del PIN */}
      <View style={styles.pinDots}>
        {[0,1,2,3].map(i => (
          <View
            key={i}
            style={[
              styles.pinDot,
              i < pin.length && styles.pinDotFilled,
              errorMsg ? styles.pinDotError : null,
            ]}
          >
            {i < pin.length && <Text style={[styles.pinBullet, errorMsg && styles.pinBulletError]}>•</Text>}
          </View>
        ))}
      </View>

      {/* Feedback de error o carga */}
      <View style={styles.feedbackArea}>
        {cargando ? (
          <ActivityIndicator color={Colors.brand} size="small" />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <Text style={styles.helperText}>PIN por defecto: 1234</Text>
        )}
      </View>

      {/* Teclado numérico */}
      <View style={styles.teclado}>
        {TECLADO.map((d, i) => {
          if (d === '') return <View key={i} style={styles.teclaVacia} />;
          return (
            <TouchableOpacity
              key={i}
              style={styles.tecla}
              onPress={() => d === '←' ? borrar() : handleDigito(d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.teclaText, d === '←' && styles.teclaBack]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarLetter: {
    fontSize: 24,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.brandText,
  },
  appName: {
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  instruccion: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  pinDot: {
    width: 44,
    height: 52,
    borderRadius: 11,
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    borderColor: Colors.brand,
  },
  pinDotError: {
    borderColor: Colors.terra,
    backgroundColor: Colors.terraBg,
  },
  pinBullet: {
    fontSize: 22,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.brand,
  },
  pinBulletError: {
    color: Colors.terra,
  },
  feedbackArea: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.terra,
  },
  helperText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  teclado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 10,
    marginTop: 8,
  },
  tecla: {
    width: 70,
    height: 58,
    borderRadius: Radii.btn,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  teclaVacia: { width: 70, height: 58 },
  teclaText: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  teclaBack: {
    fontSize: 16,
    color: Colors.stone,
  },
});
