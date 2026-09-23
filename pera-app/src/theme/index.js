// ============================================================
// SISTEMA DE DISEÑO — Cosméticos y Belleza Pera
// Paleta Dark Luxe & Champagne (Alta Gama / Profesional)
// ============================================================

export const Colors = {
  // Fondos oscuros de lujo
  cream: '#121114',        // Fondo principal negro carbón con matiz cálido
  creamSoft: '#1A181E',    // Contenedores secundarios y tarjetas suaves
  surface: '#1E1C23',      // Superficie principal de tarjetas, modales y barras
  surfaceElevated: '#27242E', // Superficie elevada para hover / popups

  // Marca / Acentos Champagne & Oro Rosa
  brand: '#D49B84',        // Oro rosa cálido boutique (acento principal de marca)
  brandMid: '#B87B64',     // Terracota champagne para degradados y transiciones
  brandText: '#121114',    // Texto con contraste óptimo sobre fondos de color brand
  tan: '#E2B29F',          // Champagne suave para estados activos y luces
  blush: '#F3D8CD',        // Tono perla rosado para contrastes delicados

  // Neutros de alta legibilidad
  stone: '#8D8596',        // Texto secundario, iconos inactivos, placeholders
  stoneLight: '#2D2836',   // Bordes sutiles de tarjetas y divisores de listas
  ink: '#F5F3F7',          // Texto principal blanco perla (máximo contraste y nitidez)
  inkSoft: '#A9A1B3',      // Subtítulos y descripciones secundarias

  // Semánticos adaptados a modo oscuro
  sage: '#86B379',         // Verde salvia menta (éxito, ingresos altos, completado)
  sageBg: '#1B2B1B',       // Fondo de píldora de éxito
  terra: '#E57373',        // Rojo coral elegante (alertas de stock, cancelaciones)
  terraBg: '#341919',      // Fondo de píldora de alerta
  amberBg: '#342813',      // Fondo ámbar de advertencia
  amberInk: '#FFD166',     // Texto ámbar dorado de advertencia

  // Colores aterciopelados para pedestales de productos (POS)
  pedestalColors: [
    '#25212A',
    '#1E2620',
    '#2C1E22',
    '#2C251D',
    '#1F242F',
    '#271F29',
  ],
};

// Tipografía — regla: cifras en $ → Fraunces, todo lo demás → Montserrat
export const Fonts = {
  montserrat: {
    regular: 'Montserrat_400Regular',
    medium: 'Montserrat_500Medium',
    semiBold: 'Montserrat_600SemiBold',
    bold: 'Montserrat_700Bold',
    extraBold: 'Montserrat_800ExtraBold',
  },
  fraunces: {
    medium: 'Fraunces_500Medium',
  },
};

export const Typography = {
  screenTitle: { fontSize: 17, fontFamily: 'Montserrat_800ExtraBold', color: '#F5F3F7' },
  screenSub:   { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: '#A9A1B3' },
  heroAmount:  { fontSize: 34, fontFamily: 'Fraunces_500Medium', color: '#F5F3F7' },
  metricValue: { fontSize: 22, fontFamily: 'Fraunces_500Medium', color: '#F5F3F7' },
  price:       { fontSize: 14, fontFamily: 'Fraunces_500Medium', color: '#D49B84' },
  cartTotal:   { fontSize: 24, fontFamily: 'Fraunces_500Medium', color: '#F5F3F7' },
  splitValue:  { fontSize: 17, fontFamily: 'Fraunces_500Medium', color: '#F5F3F7' },
  ticketTotal: { fontSize: 24, fontFamily: 'Fraunces_500Medium', color: '#F5F3F7' },
  label:       { fontSize: 10, fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase', letterSpacing: 0.3, color: '#8D8596' },
  itemName:    { fontSize: 12.5, fontFamily: 'Montserrat_700Bold', color: '#F5F3F7' },
  itemMeta:    { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: '#8D8596' },
  btnText:     { fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  badge:       { fontSize: 9.5, fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase' },
  sectionTitle:{ fontSize: 12.5, fontFamily: 'Montserrat_700Bold', color: '#F5F3F7' },
  bodySmall:   { fontSize: 11, fontFamily: 'Montserrat_400Regular', color: '#A9A1B3', lineHeight: 17 },
  fieldLabel:  { fontSize: 10.5, fontFamily: 'Montserrat_700Bold', color: '#A9A1B3' },
  tabLabel:    { fontSize: 11.5, fontFamily: 'Montserrat_700Bold' },
  navLabel:    { fontSize: 9.5, fontFamily: 'Montserrat_700Bold' },
  prodName:    { fontSize: 11, fontFamily: 'Montserrat_700Bold', lineHeight: 14, color: '#F5F3F7' },
};

export const Radii = {
  card: 16,
  prodCard: 14,
  input: 10,
  btn: 13,
  pill: 100,
  thumb: 11,
  thumbRound: 999,
  sheet: 22,
};

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cartBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  topBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBtn: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
};

export const Spacing = {
  cardPadding: { paddingHorizontal: 16, paddingVertical: 15 },
  cardGap: 12,
  gridGap: 10,
  screenPadding: 18,
  listRowPadding: 11,
  thumbSize: 40,
  iconBtnSize: 32,
};
