# Stack Técnico y Especificaciones de UI — Cosméticos y Belleza Pera

Este documento resume el stack de desarrollo y el sistema de diseño exacto usado en el prototipo navegable (HTML/CSS), para que Antigravity construya la app real respetando los mismos valores — colores, tipografía, espaciados y componentes — sin tener que adivinarlos.

---

## 1. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 (Vite) |
| Backend | Node.js — funciones serverless de Vercel |
| Base de datos | Supabase (Postgres) |
| Autenticación | Supabase Auth (PIN de 4 dígitos) |
| Almacenamiento de archivos | Supabase Storage (fotos de productos) |
| Hosting / Deploy | Vercel (deploy automático desde GitHub) |
| Entorno de desarrollo | Google Antigravity (agentes de código) |
| Tipo de app | PWA (Progressive Web App) — instalable, sin tiendas de apps |
| Plataforma objetivo | Móvil (responsivo, diseño mobile-first) |

---

## 2. Paleta de color

Todos los valores son exactos, tomados directo de las variables CSS (`:root`) del prototipo.

| Token | Hex | Uso |
|---|---|---|
| `--cream` | `#F0E6D8` | Fondo principal de la app |
| `--cream-soft` | `#F7F1E8` | Fondo de inputs, fondo de tarjetas internas suaves |
| `--surface` | `#FFFFFF` | Fondo de tarjetas (`.card`), superficies elevadas |
| `--brand` | `#714329` | Color primario — botones, textos de marca, elementos activos |
| `--brand-mid` | `#9C6A47` | Segundo tono para degradados (ej. tarjeta de Ganancias) |
| `--tan` | `#B08463` | Acento decorativo (ej. barra destacada en gráficas) |
| `--blush` | `#D9C2AC` | Puntos decorativos, detalles pequeños |
| `--stone` | `#B5A192` | Texto secundario, íconos inactivos, placeholders |
| `--stone-light` | `#E4D9CB` | Bordes, separadores, líneas divisorias |
| `--ink` | `#2A2118` | Texto principal |
| `--ink-soft` | `#6B5D4F` | Texto secundario / descripciones |
| `--sage` | `#7C8A62` | Indicador positivo (subidas, éxito) |
| `--sage-bg` | `#E7EBDC` | Fondo de badges positivos / stock OK |
| `--terra` | `#C1694F` | Indicador negativo (bajadas, alertas) |
| `--terra-bg` | `#F3DFD5` | Fondo de badges de alerta / stock bajo |
| `--amber-bg` | `#F5E3C4` | Fondo de badges de advertencia intermedia |
| `--amber-ink` | `#8C5E12` | Texto sobre fondo ámbar |
| Fondo exterior (body, fuera del "teléfono") | `#E3D8C6` | Solo aplica en las vistas de prototipo/propuesta, no en la app real |

**Regla de aplicación:** nunca texto en `--stone` sobre fondo `--cream` para contenido accionable (solo para etiquetas secundarias). Los degradados (ej. tarjeta de Ganancias) van de `--brand` a `--brand-mid` en 155°.

---

## 3. Tipografía

| Familia | Uso | Pesos usados |
|---|---|---|
| **Montserrat** | Tipografía principal — UI, botones, formularios, navegación, texto de cuerpo | 400, 500, 600, 700, 800 |
| **Fraunces** (serif, `opsz` variable) | Solo para cifras de dinero y números protagonistas (precios, totales, ganancias) | 500 |

Ambas se cargan desde Google Fonts (`fonts.googleapis.com`).

### Escala tipográfica observada

| Elemento | Tamaño | Peso | Familia |
|---|---|---|---|
| Título de pantalla (topbar) | 17px | 800 | Montserrat |
| Subtítulo (topbar) | 10.5px | 400 | Montserrat |
| Cifra grande (hero de Ganancias) | 34px | 500 | Fraunces |
| Valor de métrica (dashboard) | 22px | 500 | Fraunces |
| Precio en tarjeta de producto | 14px | 500 | Fraunces |
| Total en ticket / carrito | 24px | 500 | Fraunces |
| Etiqueta de métrica (uppercase) | 10px | 700 | Montserrat |
| Nombre de producto/servicio en lista | 12.5px | 700 | Montserrat |
| Meta / descripción secundaria | 10.5px | 400 | Montserrat |
| Texto de botón | 13px | 700 | Montserrat |
| Badge | 9.5px | 700 | Montserrat |

**Regla:** cualquier cifra en pesos (`$`) usa Fraunces. Todo lo demás — incluyendo números que no son dinero, como cantidades o folios — usa Montserrat.

---

## 4. Radios, sombras y espaciado

| Token | Valor | Uso |
|---|---|---|
| Radio de tarjeta (`.card`) | 16px | Tarjetas generales |
| Radio de tarjeta de producto | 14px | Grid del POS |
| Radio de input/select | 10px | Formularios |
| Radio de botón | 13px | Botones primarios y ghost |
| Radio de badge / tab | 100px (píldora) | Badges, tabs, toggle |
| Radio de thumbnail | 11px (o 50% si es circular) | Fotos pequeñas en listas |
| Sombra de tarjeta | `0 1px 3px rgba(42,33,24,.06)` | Todas las `.card` y `.prod-card` |
| Sombra de barra flotante (carrito) | `0 10px 24px rgba(113,67,41,.35)` | Barra de carrito en POS |
| Padding interno de tarjeta | 15px 16px | Estándar en `.card` |
| Espaciado entre tarjetas | 12px | Vertical, entre bloques de contenido |
| Gap en grids de 2 columnas | 10px | Dashboard, formularios |

---

## 5. Componentes de UI

### Navegación
- **Barra superior (topbar):** fija, con título (nombre de pantalla) + subtítulo + botón circular de notificación a la derecha.
- **Navegación inferior (bottom nav):** fija, 5 accesos — Inicio, Venta, Inventario, Ganancias, Más. Ítem activo en color `--brand`, inactivos en `--stone`.
- **Panel "Más":** hoja deslizable desde abajo (`sheet`), con overlay semitransparente (`rgba(42,33,24,.4)`), esquinas superiores redondeadas (22px), y un identificador visual (`sheet-handle`) para indicar que se puede cerrar deslizando.

### Tarjetas y métricas
- **`.card`:** contenedor base blanco, sombra suave, radio 16px. Es la unidad estructural de casi toda la app.
- **Tarjeta de métrica:** etiqueta en mayúsculas (10px, `--stone`) + valor grande (Fraunces) + variación opcional en verde/rojo.
- **Hero de Ganancias:** tarjeta con degradado de marca, texto en `--cream`, con sub-tarjetas semitransparentes (`rgba(255,255,255,.14)`) para el desglose bruta/gastos.

### Listas
- **`.list-row`:** fila con separador superior (`1px solid --stone-light`), usada en Inventario, Historial, Servicios, Stock bajo. Estructura: thumbnail + nombre/meta + valor a la derecha.
- **Thumbnail:** 40x40px, radio 11px (o circular con `.thumb-round` para servicios).

### Badges
- Tres variantes semánticas: `badge-ok` (verde), `badge-low` (rojo/terracota), `badge-warn` (ámbar). Todas en formato píldora, texto en mayúsculas visual (peso 700), tamaño 9.5px.

### Botones
- **`.btn-primary`:** fondo `--brand`, texto `--cream`. Acción principal (Cobrar, Guardar, Ingresar).
- **`.btn-ghost`:** fondo blanco, borde `--stone-light`, texto `--brand`. Acción secundaria (Compartir, Cancelar, Agregar).
- Altura cómoda por padding (13px vertical) — pensado para uso táctil sin precisión fina.

### Formularios
- Inputs con fondo `--cream-soft` (no blanco puro, para diferenciarlos de las tarjetas) y borde `--stone-light`.
- Etiqueta siempre arriba del campo, 10.5px, peso 700, color `--ink-soft`.

### Grid de productos (POS)
- 3 columnas en móvil.
- Cada producto: "pedestal" circular de color (48px) simulando el fondo del producto + nombre + precio en Fraunces.

### Barra flotante de carrito
- Fija sobre la navegación inferior, color `--brand`, con resumen de artículos + total, siempre visible mientras se arma una venta.

### Toggle (switches)
- Píldora de 36x21px, círculo de 17px. Estado activo en `--brand`.

---

## 6. Accesibilidad y criterios de usabilidad

Pensado específicamente para una usuaria sin experiencia técnica:

- Ningún texto interactivo en `--stone` puro (falta de contraste) — solo para etiquetas no accionables.
- Botones y filas de lista con área táctil generosa (mínimo ~44px de alto efectivo con padding).
- Máximo 2-3 toques para completar una venta.
- Navegación inferior siempre visible — no hay pantallas "sin salida" que obliguen a recordar cómo regresar.
- Toda cifra de dinero se distingue visualmente (Fraunces) del resto del texto, para que el ojo la encuentre de inmediato sin leer la etiqueta.

---

## 7. Notas para Antigravity

- Estos valores deben ir como variables CSS globales (`:root`) o como tema de Tailwind, no repetidos por componente — así un cambio de marca a futuro (si la clienta pide ajustar un color) se hace en un solo lugar.
- Las fuentes deben cargarse una sola vez a nivel de la app (no por pantalla).
- El patrón de "pedestal circular de color" en las tarjetas de producto no depende de la foto real — es un fondo decorativo detrás de la imagen del producto, y debe mantenerse aunque la foto cargue desde Supabase Storage.
