# Proyecto Base — Cosméticos y Belleza Pera (Sprint 0)
## Stack actualizado: React Native + Expo · Node.js + Vercel · Supabase

---

## Stack confirmado

| Capa | Tecnología |
|---|---|
| **Frontend** | React Native + Expo (SDK 51+) |
| **Backend** | Node.js + Vercel Serverless Functions (`/api`) |
| **Base de datos** | Supabase PostgreSQL |
| **Autenticación** | Supabase Auth (PIN de 4 dígitos) |
| **Archivos** | Supabase Storage (fotos de productos) |
| **Deploy backend** | Vercel |
| **Deploy app** | Expo Go (desarrollo) → EAS Build (producción APK/IPA) |
| **Plataforma objetivo** | Android & iOS (mobile nativo) |

> [!IMPORTANT]
> Con React Native + Expo **no existe CSS ni PWA**. El sistema de diseño se implementa como constantes JS (`theme.js`) y estilos con `StyleSheet.create()`. Los tokens de color y tipografía del prototipo HTML se traducen exactamente — solo cambia el mecanismo, no los valores.

> [!NOTE]
> La carpeta `/api` (funciones serverless de Vercel) vive en el **mismo repositorio** que la app Expo. Vercel detecta las funciones en `/api/*.js` automáticamente. La app Expo se conecta a esas URLs en producción.

---

## Estructura de carpetas objetivo

```
appPera/
├── app/                        # React Native (Expo Router)
│   ├── (auth)/
│   │   └── login.jsx
│   ├── (tabs)/
│   │   ├── _layout.jsx         # Tab navigator (BottomNav)
│   │   ├── index.jsx           # Dashboard
│   │   ├── venta.jsx           # POS
│   │   ├── inventario.jsx
│   │   └── ganancias.jsx
│   ├── producto/[id].jsx        # CRUD producto
│   ├── entrada.jsx
│   ├── servicios.jsx
│   ├── historial.jsx
│   ├── agenda.jsx
│   ├── config.jsx
│   └── _layout.jsx             # Root layout
│
├── api/                        # Vercel Serverless Functions
│   ├── hello.js                # Endpoint de prueba (Sprint 0)
│   ├── ventas/
│   │   └── index.js
│   ├── productos/
│   │   └── index.js
│   └── _lib/
│       └── supabase.js         # Cliente Supabase (service_role key)
│
├── src/
│   ├── theme/
│   │   └── index.js            # Tokens de color, tipografía, radios, sombras
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.jsx
│   │   │   └── MoreSheet.jsx   # Bottom sheet con react-native-reanimated
│   │   └── ui/
│   │       ├── Badge.jsx
│   │       ├── Card.jsx
│   │       ├── Button.jsx
│   │       ├── ListRow.jsx
│   │       ├── MetricCard.jsx
│   │       └── CartBar.jsx
│   ├── hooks/
│   │   └── useTheme.js         # Acceso rápido a tokens del tema
│   └── constants/
│       └── mockData.js         # Datos mock para Sprint 0
│
├── assets/
│   ├── icon.png
│   └── splash.png
│
├── app.json                    # Configuración Expo
├── vercel.json                 # Configuración Vercel (rewrites para /api)
├── package.json
└── .env.local                  # SUPABASE_URL, SUPABASE_ANON_KEY (gitignored)
```

---

## Proposed Changes

### 1. Scaffolding del proyecto

#### Comandos de inicialización
```bash
# Dentro de c:\Users\sotol\Desktop\appPera
npx create-expo-app@latest . --template blank
npm install expo-router react-native-safe-area-context react-native-screens
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-reanimated react-native-gesture-handler
npm install @supabase/supabase-js
npm install lucide-react-native react-native-svg
```

#### [NEW] `vercel.json`
```json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]
}
```

---

### 2. Sistema de diseño — `src/theme/index.js`

Traducción exacta de los tokens CSS del prototipo a constantes JS:

```js
export const Colors = {
  cream: '#F0E6D8',
  creamSoft: '#F7F1E8',
  surface: '#FFFFFF',
  brand: '#714329',
  brandMid: '#9C6A47',
  tan: '#B08463',
  blush: '#D9C2AC',
  stone: '#B5A192',
  stoneLight: '#E4D9CB',
  ink: '#2A2118',
  inkSoft: '#6B5D4F',
  sage: '#7C8A62',
  sageBg: '#E7EBDC',
  terra: '#C1694F',
  terraBg: '#F3DFD5',
  amberBg: '#F5E3C4',
  amberInk: '#8C5E12',
};

export const Typography = {
  // Familias: System font en RN — se configura con @expo-google-fonts/montserrat + fraunces
  screenTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Montserrat_800ExtraBold' },
  screenSub:   { fontSize: 10.5, fontFamily: 'Montserrat_400Regular' },
  heroAmount:  { fontSize: 34, fontFamily: 'Fraunces_500Medium' },
  metricValue: { fontSize: 22, fontFamily: 'Fraunces_500Medium' },
  price:       { fontSize: 14, fontFamily: 'Fraunces_500Medium' },
  cartTotal:   { fontSize: 24, fontFamily: 'Fraunces_500Medium' },
  label:       { fontSize: 10, fontWeight: '700', fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase' },
  itemName:    { fontSize: 12.5, fontWeight: '700', fontFamily: 'Montserrat_700Bold' },
  meta:        { fontSize: 10.5, fontFamily: 'Montserrat_400Regular' },
  btnText:     { fontSize: 13, fontWeight: '700', fontFamily: 'Montserrat_700Bold' },
  badge:       { fontSize: 9.5, fontWeight: '700', fontFamily: 'Montserrat_700Bold' },
};

export const Radii = {
  card: 16, prodCard: 14, input: 10,
  btn: 13, pill: 100, thumb: 11,
};

export const Shadows = {
  card: { shadowColor: '#2A2118', shadowOffset: {width:0,height:1}, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cartBar: { shadowColor: '#714329', shadowOffset: {width:0,height:-10}, shadowOpacity: 0.35, shadowRadius: 24, elevation: 12 },
};
```

---

### 3. Fuentes Google con Expo

#### [MODIFY] `app/_layout.jsx` — carga de fuentes
```bash
npx expo install @expo-google-fonts/montserrat @expo-google-fonts/fraunces expo-font
```
Usar `useFonts()` en el root layout para cargar Montserrat 400/500/600/700/800 y Fraunces 500 antes de renderizar la app.

---

### 4. Componentes de layout

#### [NEW] `src/components/layout/TopBar.jsx`
- `SafeAreaView` + `View` con fondo `Colors.cream`
- Texto título (17px, 800, Montserrat) + subtítulo (10.5px)
- Botón circular de notificación a la derecha (32px, sombra suave)

#### [NEW] `src/components/layout/MoreSheet.jsx`
- Implementado con `@gorhom/bottom-sheet` (o `react-native-reanimated` modal)
- Overlay semitransparente `rgba(42,33,24,.4)`, esquinas superiores 22px
- Sheet handle (36×4px, `Colors.stoneLight`)
- Links a: Historial, Servicios, Nueva entrada, Agenda, Configuración

---

### 5. Componentes UI

#### [NEW] `src/components/ui/Card.jsx`
Contenedor base: fondo `surface`, radio 16px, sombra `Shadows.card`, padding 15×16.

#### [NEW] `src/components/ui/Badge.jsx`
Variantes `ok` / `low` / `warn`. Pill (radius 100), texto 9.5px uppercase 700.

#### [NEW] `src/components/ui/Button.jsx`
Props: `variant='primary'|'ghost'`, `label`, `onPress`. Altura cómoda (padding vertical 13px).

#### [NEW] `src/components/ui/ListRow.jsx`
Fila con separador superior, thumbnail (40×40, radio 11px), info, valor derecho.

#### [NEW] `src/components/ui/MetricCard.jsx`
Etiqueta uppercase + valor Fraunces + delta ↑/↓ opcional.

#### [NEW] `src/components/ui/CartBar.jsx`
Barra fija sobre el tab bar en la vista POS. Color `brand`, sombra `Shadows.cartBar`.

---

### 6. Vistas (pantallas)

Todas usan datos mock de `src/constants/mockData.js` en este Sprint 0.

| Vista | Ruta Expo Router | Descripción |
|---|---|---|
| `login.jsx` | `/(auth)/login` | PIN de 4 dígitos |
| `index.jsx` | `/(tabs)/` | Dashboard: métricas, gráfica, stock bajo |
| `venta.jsx` | `/(tabs)/venta` | POS: grid 3 col, buscador, tabs, CartBar |
| `inventario.jsx` | `/(tabs)/inventario` | Lista productos + badges |
| `ganancias.jsx` | `/(tabs)/ganancias` | Hero gradiente + gastos fijos + desglose |
| `producto/[id].jsx` | `/producto/[id]` | Formulario CRUD producto + foto |
| `entrada.jsx` | `/entrada` | Nueva entrada de inventario |
| `servicios.jsx` | `/servicios` | Lista + CRUD servicios |
| `historial.jsx` | `/historial` | Historial de ventas |
| `agenda.jsx` | `/agenda` | Agenda de citas (scaffold) |
| `config.jsx` | `/config` | Configuración del negocio |
| `ticket.jsx` | `/ticket` | Confirmación de venta |

---

### 7. Backend base (Vercel Serverless)

#### [NEW] `api/hello.js` — endpoint de prueba
```js
export default function handler(req, res) {
  res.json({ ok: true, message: 'API Belleza Pera funcionando 🌸' });
}
```

#### [NEW] `api/_lib/supabase.js`
Cliente Supabase con `service_role` key (solo backend, nunca expuesta al cliente):
```js
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

---

### 8. Configuración

#### [NEW] `app.json`
```json
{
  "expo": {
    "name": "Belleza Pera",
    "slug": "belleza-pera",
    "scheme": "bellezapera",
    "version": "1.0.0",
    "orientation": "portrait",
    "backgroundColor": "#F0E6D8",
    "plugins": ["expo-router"],
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/icon.png", "backgroundColor": "#714329" } },
    "ios": { "supportsTablet": false }
  }
}
```

#### [NEW] `.env.local` (gitignored)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Verification Plan

### Automated
```bash
npx expo start          # App corriendo en Expo Go
curl localhost:3000/api/hello   # Vercel dev local
```

### Manual
1. Escanear QR en Expo Go (Android/iOS) y confirmar que abre ✓
2. Navegar entre las 5 tabs del BottomNav ✓
3. Abrir y cerrar el panel "Más" ✓
4. Verificar paleta de colores y tipografía (Montserrat + Fraunces) contra el prototipo HTML ✓
5. Confirmar que la CartBar aparece solo en la pantalla POS ✓
6. Probar en modo oscuro del sistema (la app debe ignorarlo y mantener su paleta cálida) ✓
7. Verificar `api/hello` retorna JSON correcto ✓
