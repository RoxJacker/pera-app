import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../src/components/layout/TopBar';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Icon from '../../src/components/ui/Icon';
import { useTheme } from '../../src/context/ThemeContext';
import { Radii, Fonts } from '../../src/theme';
import {
  obtenerResumenGananciasMes,
  agregarGastoItem,
  actualizarGastoItem,
  eliminarGastoItem,
  obtenerMesClave,
} from '../../src/services/gananciasService';

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GananciasView() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [resumen, setResumen] = useState({
    mesClave: obtenerMesClave(),
    mesNombre: 'Octubre 2026',
    gananciaBruta: 0,
    gastosFijos: 0,
    gastosItems: [],
    gananciaNeta: 0,
    porProductos: 0,
    porServicios: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Estado del acordeón de gastos
  const [gastosExpandido, setGastosExpandido] = useState(true);

  // Formulario de nuevo ítem
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoConcepto, setNuevoConcepto] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Ítem en edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [editConcepto, setEditConcepto] = useState('');
  const [editMonto, setEditMonto] = useState('');

  const cargarGanancias = async (esRefresco = false) => {
    if (!esRefresco) setCargando(true);
    try {
      const data = await obtenerResumenGananciasMes();
      setResumen(data);
    } catch (e) {
      console.warn('Error cargando resumen de ganancias:', e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarGanancias();
    }, [])
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarGanancias(true);
  };

  // ── Agregar ítem ──────────────────────────────────────────────────────────
  const handleAgregarItem = async () => {
    if (!nuevoConcepto.trim()) {
      Alert.alert('Falta el concepto', 'Escribe un nombre para este gasto (ej. Renta, Luz).');
      return;
    }
    const montoNum = parseFloat(nuevoMonto || '0');
    if (montoNum <= 0) {
      Alert.alert('Monto inválido', 'El monto debe ser mayor a $0.');
      return;
    }
    setGuardando(true);
    try {
      await agregarGastoItem(resumen.mesClave, nuevoConcepto.trim(), montoNum);
      setNuevoConcepto('');
      setNuevoMonto('');
      setMostrarForm(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await cargarGanancias(true);
    } catch {
      Alert.alert('Error', 'No se pudo agregar el gasto. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Iniciar edición inline ────────────────────────────────────────────────
  const iniciarEdicion = (item) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditandoId(item.id);
    setEditConcepto(item.concepto);
    setEditMonto(String(item.monto));
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditConcepto('');
    setEditMonto('');
  };

  // ── Guardar edición ───────────────────────────────────────────────────────
  const handleGuardarEdicion = async (id) => {
    const montoNum = parseFloat(editMonto || '0');
    if (!editConcepto.trim() || montoNum <= 0) {
      Alert.alert('Datos incompletos', 'Escribe el concepto y un monto mayor a $0.');
      return;
    }
    try {
      await actualizarGastoItem(id, editConcepto.trim(), montoNum);
      cancelarEdicion();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await cargarGanancias(true);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el gasto.');
    }
  };

  // ── Eliminar ítem ─────────────────────────────────────────────────────────
  const handleEliminar = (item) => {
    Alert.alert(
      'Eliminar gasto',
      `¿Seguro que quieres eliminar "${item.concepto}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarGastoItem(item.id);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await cargarGanancias(true);
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el gasto.');
            }
          },
        },
      ]
    );
  };

  const totalGastos = resumen.gastosItems.reduce(
    (sum, i) => sum + parseFloat(i.monto || 0),
    0
  );
  const gananciaNetaViva = resumen.gananciaBruta - totalGastos;

  return (
    <View style={s.screen}>
      <TopBar title="Ganancias" subtitle="Bruta y neta del mes" />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            tintColor={theme.brand}
            colors={[theme.brand]}
          />
        }
      >
        {/* ── Hero Card ── */}
        <LinearGradient
          colors={[theme.brand, theme.brandMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <Text style={s.heroLbl}>Lo que realmente ganas este mes</Text>
          <Text style={s.heroBig}>
            ${gananciaNetaViva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={s.heroCaption}>
            Ganancia neta de {resumen.mesNombre} · actualizado en tiempo real
          </Text>

          <View style={s.splitRow}>
            <View style={s.splitCol}>
              <Text style={s.splitLabel}>Bruta (ventas)</Text>
              <Text style={s.splitValue}>
                ${resumen.gananciaBruta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={s.splitDivider} />
            <View style={s.splitCol}>
              <Text style={s.splitLabel}>Gastos fijos</Text>
              <Text style={s.splitValue}>
                –${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Desglose de gastos fijos (acordeón) ── */}
        <Card>
          {/* Header del acordeón */}
          <TouchableOpacity
            style={s.acordeonHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setGastosExpandido((v) => !v);
            }}
            activeOpacity={0.7}
          >
            <View style={s.acordeonHeaderLeft}>
              <Icon name="dollar" size={15} color={theme.brand} />
              <Text style={s.sectionTitle}>
                Gastos fijos · {resumen.mesNombre}
              </Text>
            </View>
            <View style={s.acordeonHeaderRight}>
              <Text style={s.totalTag}>
                ${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Icon
                name={gastosExpandido ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.stone}
              />
            </View>
          </TouchableOpacity>

          {gastosExpandido && (
            <View style={s.acordeonBody}>
              {/* Lista de ítems */}
              {cargando ? (
                <ActivityIndicator size="small" color={theme.brand} style={{ marginVertical: 12 }} />
              ) : resumen.gastosItems.length === 0 ? (
                <Text style={s.emptyMsg}>Aún no hay gastos registrados este mes.</Text>
              ) : (
                resumen.gastosItems.map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 && <View style={s.itemDivider} />}

                    {editandoId === item.id ? (
                      /* ── Modo edición inline ── */
                      <View style={s.editRow}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <TextInput
                            style={s.editInput}
                            value={editConcepto}
                            onChangeText={setEditConcepto}
                            placeholder="Concepto"
                            placeholderTextColor={theme.stone}
                          />
                          <View style={s.editMontoRow}>
                            <Text style={s.currencyPrefix}>$</Text>
                            <TextInput
                              style={[s.editInput, { flex: 1 }]}
                              value={editMonto}
                              onChangeText={setEditMonto}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              placeholderTextColor={theme.stone}
                            />
                          </View>
                        </View>
                        <View style={s.editActions}>
                          <TouchableOpacity
                            style={[s.iconAction, { backgroundColor: theme.sageBg }]}
                            onPress={() => handleGuardarEdicion(item.id)}
                          >
                            <Icon name="check" size={14} color={theme.sage} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.iconAction, { backgroundColor: theme.terraBg }]}
                            onPress={cancelarEdicion}
                          >
                            <Icon name="x" size={14} color={theme.terra} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* ── Vista normal del ítem ── */
                      <View style={s.itemRow}>
                        <View style={s.conceptoPill}>
                          <Text style={s.conceptoText} numberOfLines={1}>{item.concepto}</Text>
                        </View>
                        <Text style={s.itemMonto}>
                          ${parseFloat(item.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <TouchableOpacity
                          style={s.iconActionSmall}
                          onPress={() => iniciarEdicion(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="edit" size={13} color={theme.stone} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.iconActionSmall}
                          onPress={() => handleEliminar(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="trash" size={13} color={theme.terra} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}

              {/* Subtotal */}
              {resumen.gastosItems.length > 0 && (
                <View style={s.subtotalRow}>
                  <Text style={s.subtotalLabel}>Total gastos</Text>
                  <Text style={s.subtotalValue}>
                    ${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}

              {/* Formulario de nuevo ítem */}
              {mostrarForm && (
                <View style={s.newItemForm}>
                  <TextInput
                    style={s.newInput}
                    value={nuevoConcepto}
                    onChangeText={setNuevoConcepto}
                    placeholder="Concepto (ej. Renta, Luz…)"
                    placeholderTextColor={theme.stone}
                    autoFocus
                  />
                  <View style={s.newMontoRow}>
                    <Text style={s.currencyPrefix}>$</Text>
                    <TextInput
                      style={[s.newInput, { flex: 1, marginBottom: 0 }]}
                      value={nuevoMonto}
                      onChangeText={setNuevoMonto}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={theme.stone}
                    />
                  </View>
                  <View style={s.formActions}>
                    <TouchableOpacity
                      style={[s.formBtn, { backgroundColor: theme.brand }]}
                      onPress={handleAgregarItem}
                      disabled={guardando}
                    >
                      {guardando
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={[s.formBtnText, { color: theme.brandText }]}>Guardar</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.formBtn, { backgroundColor: theme.stoneLight }]}
                      onPress={() => { setMostrarForm(false); setNuevoConcepto(''); setNuevoMonto(''); }}
                    >
                      <Text style={[s.formBtnText, { color: theme.inkSoft }]}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Botón para agregar ítem */}
              {!mostrarForm && (
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setMostrarForm(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="plus" size={13} color={theme.brand} />
                  <Text style={s.addBtnText}>Agregar concepto</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>

        {/* ── Desglose por tipo de ingreso ── */}
        <Card>
          <View style={s.cardHeaderRow}>
            <Text style={s.sectionTitle}>Ganancia bruta por tipo</Text>
            <Icon name="trending" size={16} color={theme.sage} />
          </View>

          <View style={s.ingresoRow}>
            <View style={[s.ingresoDot, { backgroundColor: theme.sage }]} />
            <Text style={s.ingresoLabel}>Productos vendidos</Text>
            <Text style={[s.ingresoVal, { color: theme.sage }]}>
              +${resumen.porProductos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[s.ingresoRow, { marginTop: 8 }]}>
            <View style={[s.ingresoDot, { backgroundColor: theme.brand }]} />
            <Text style={s.ingresoLabel}>Servicios realizados</Text>
            <Text style={[s.ingresoVal, { color: theme.brand }]}>
              +${resumen.porServicios.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </Card>

        {/* ── ¿Cómo se calcula? ── */}
        <Card>
          <View style={s.cardHeaderRow}>
            <Text style={s.sectionTitle}>¿Cómo se calcula?</Text>
            <Icon name="sparkles" size={16} color={theme.brand} />
          </View>
          <Text style={s.bodyText}>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: theme.ink }}>Ganancia bruta</Text>
            {' '}= suma de (precio de venta − costo) de todo lo vendido en el mes.{'\n\n'}
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: theme.ink }}>Ganancia neta</Text>
            {' '}= ganancia bruta − total de gastos fijos. Agrega cada concepto por separado para mayor precisión.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

// ─── Estilos dinámicos ────────────────────────────────────────────────────────
function makeStyles(t) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.cream },
    content: { padding: 18, paddingBottom: 100, gap: 12 },

    // Hero
    heroCard: {
      borderRadius: 20,
      padding: 22,
      shadowColor: t.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },
    heroLbl: {
      fontSize: 12,
      fontFamily: 'Montserrat_600SemiBold',
      color: t.blush,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroBig: {
      fontSize: 34,
      fontFamily: 'Fraunces_500Medium',
      color: '#FFFFFF',
      marginBottom: 6,
    },
    heroCaption: {
      fontSize: 11,
      fontFamily: 'Montserrat_400Regular',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: 16,
    },
    splitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    splitCol: { flex: 1 },
    splitDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginHorizontal: 10,
    },
    splitLabel: {
      fontSize: 10,
      fontFamily: 'Montserrat_500Medium',
      color: 'rgba(255,255,255,0.75)',
      textTransform: 'uppercase',
    },
    splitValue: {
      fontSize: 15,
      fontFamily: 'Fraunces_500Medium',
      color: '#FFFFFF',
      marginTop: 2,
    },

    // Acordeón header
    acordeonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    acordeonHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    acordeonHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    totalTag: {
      fontSize: 12,
      fontFamily: 'Fraunces_500Medium',
      color: t.brand,
    },
    acordeonBody: { marginTop: 14, gap: 2 },

    // Ítems
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    itemDivider: { height: 1, backgroundColor: t.stoneLight },
    conceptoPill: { flex: 1 },
    conceptoText: {
      fontSize: 12.5,
      fontFamily: 'Montserrat_500Medium',
      color: t.ink,
    },
    itemMonto: {
      fontSize: 13,
      fontFamily: 'Fraunces_500Medium',
      color: t.inkSoft,
      minWidth: 72,
      textAlign: 'right',
    },
    iconActionSmall: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Edición inline
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    editInput: {
      backgroundColor: t.creamSoft,
      borderWidth: 1,
      borderColor: t.stoneLight,
      borderRadius: Radii.input,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 12.5,
      fontFamily: 'Montserrat_400Regular',
      color: t.ink,
    },
    editMontoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    editActions: { gap: 6 },
    iconAction: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Subtotal
    subtotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: t.stoneLight,
    },
    subtotalLabel: {
      fontSize: 11,
      fontFamily: 'Montserrat_700Bold',
      color: t.stone,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    subtotalValue: {
      fontSize: 15,
      fontFamily: 'Fraunces_500Medium',
      color: t.ink,
    },

    // Botón agregar
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    addBtnText: {
      fontSize: 12,
      fontFamily: 'Montserrat_600SemiBold',
      color: t.brand,
    },

    // Formulario nuevo ítem
    emptyMsg: {
      fontSize: 12,
      fontFamily: 'Montserrat_400Regular',
      color: t.stone,
      textAlign: 'center',
      paddingVertical: 12,
    },
    newItemForm: {
      marginTop: 10,
      gap: 8,
      padding: 12,
      backgroundColor: t.creamSoft,
      borderRadius: Radii.card,
      borderWidth: 1,
      borderColor: t.stoneLight,
    },
    newInput: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.stoneLight,
      borderRadius: Radii.input,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      fontFamily: 'Montserrat_400Regular',
      color: t.ink,
      marginBottom: 0,
    },
    newMontoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    currencyPrefix: {
      fontSize: 16,
      fontFamily: 'Fraunces_500Medium',
      color: t.inkSoft,
    },
    formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    formBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: Radii.btn,
      alignItems: 'center',
    },
    formBtnText: {
      fontSize: 12.5,
      fontFamily: 'Montserrat_700Bold',
    },

    // Ingresos por tipo
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: 'Montserrat_700Bold',
      color: t.ink,
    },
    ingresoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ingresoDot: { width: 8, height: 8, borderRadius: 4 },
    ingresoLabel: {
      flex: 1,
      fontSize: 12.5,
      fontFamily: 'Montserrat_500Medium',
      color: t.inkSoft,
    },
    ingresoVal: {
      fontSize: 13,
      fontFamily: 'Fraunces_500Medium',
    },

    // Info card
    bodyText: {
      fontSize: 12,
      fontFamily: 'Montserrat_400Regular',
      color: t.inkSoft,
      lineHeight: 18,
    },
  });
}
