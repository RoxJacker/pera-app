# Plan de Sprints — Cosméticos y Belleza Pera (Fase 1 + Agenda de Citas)

**Stack:** Vue 3 (frontend) · Node.js — funciones serverless de Vercel (backend) · Supabase (BD Postgres + Auth + Storage) · Vercel (hosting/deploy) · Google Antigravity (desarrollo asistido por agentes)

Este plan reemplaza al anterior: refleja el alcance de **Fase 1** que ya definieron (sin Reportes ni módulo de Gastos detallado, con una pantalla de Ganancias simplificada, y Servicios a cobro unitario sin receta de insumos), más el **nuevo módulo de Agenda de Citas y Recordatorios**.

---

## Notas sobre cómo usar Antigravity en este plan

- Cada sprint está redactado como tareas que le puedes delegar directamente a un agente (Editor View para tareas puntuales, Manager View si quieres correr 2-3 en paralelo).
- Para **esquema de base de datos y lógica de dinero/stock** (sprints 1, 2, 5), usa autonomía baja — revisa el plan del agente antes de que ejecute.
- Pide siempre que el agente **valide con capturas o grabación del navegador integrado** el flujo que acaba de construir.
- Usa comentarios sobre los Artifacts para pedir ajustes puntuales en vez de reescribir el prompt completo.

---

## Sprint 0 — Setup y Arquitectura
**Duración estimada:** 2-3 días

**Tareas:**
1. Crear proyecto en Supabase (BD Postgres, Auth, Storage bucket para fotos de productos).
2. Diseñar y crear el esquema inicial de base de datos:
   - `productos` (nombre, marca, categoría, costo, precio_venta, stock, stock_minimo, foto_url)
   - `servicios` (nombre, precio, duracion_min)
   - `movimientos_inventario` (producto_id, tipo, cantidad, costo_unitario, fecha)
   - `ventas` (fecha, total, metodo_pago)
   - `venta_items` (venta_id, producto_id o servicio_id, cantidad, precio_unitario)
   - `citas` (servicio_id, cliente_nombre, cliente_telefono, fecha, hora, estado, notas)
   - `gastos_fijos_mensuales` (mes, monto) — un solo monto editable por mes, no un CRUD completo
3. Inicializar proyecto Vue 3 (Vite) + configurar Vercel para deploy automático desde GitHub.
4. Configurar carpeta `/api` con funciones serverless de Node.js conectadas a Supabase (`service_role` key solo en backend).
5. Deploy de un "Hello World" para confirmar que Vue → Vercel → Supabase funciona de punta a punta.

**Entregable:** URL pública funcionando con conexión confirmada a Supabase.

**Criterio de aceptación:** puedes insertar un registro de prueba desde el frontend y verlo reflejado en Supabase.

---

## Sprint 1 — Autenticación + CRUD de Productos
**Duración estimada:** 4-5 días

**Tareas:**
1. Login con PIN de 4 dígitos vía Supabase Auth.
2. Pantalla "Inventario" (lista de productos con foto, stock, precio).
3. Formulario de alta/edición: nombre, marca, categoría, costo, precio venta, stock, stock mínimo.
4. Subida de foto a Supabase Storage con compresión antes de subir (~800px de ancho).
5. Eliminar producto (con confirmación).
6. Aplicar estilo visual de marca (paleta cálida, Montserrat + Fraunces) a estas pantallas.

**Entregable:** CRUD de productos completo y funcional en producción.

**Criterio de aceptación:** puedes crear, editar, ver y eliminar un producto con foto desde el celular, y los cambios persisten al recargar.

---

## Sprint 2 — Entradas de Inventario (Compras)
**Duración estimada:** 2-3 días

**Tareas:**
1. Pantalla "Nueva entrada": buscar producto existente o crear uno nuevo desde ahí mismo.
2. Función serverless que, en una sola transacción, inserta el movimiento y actualiza el stock.
3. Registrar costo de esa compra específica y actualizar el costo de referencia del producto.

**Entregable:** flujo de entrada de inventario funcional, con stock actualizándose correctamente.

**Criterio de aceptación:** al registrar una entrada de 10 piezas, el stock sube exactamente 10.

---

## Sprint 3 — Servicios (cobro unitario, sin receta)
**Duración estimada:** 1-2 días

**Tareas:**
1. CRUD de servicios: nombre, precio, duración estimada (esta última se usa después en Agenda).
2. Sin campo de insumos/receta — el servicio se cobra a precio fijo, tal como se acordó.
3. Nota visible en la pantalla aclarando que los servicios no descuentan inventario automáticamente.

**Entregable:** catálogo de servicios gestionable desde la app.

**Criterio de aceptación:** puedes crear un servicio y que aparezca disponible tanto en el POS como en la Agenda de Citas.

---

## Sprint 4 — Agenda de Citas (uso personal de la dueña)
**Duración estimada:** 3-4 días

**Objetivo:** que ella lleve su propia agenda de citas de servicios (corte, uñas, etc.) dentro de la misma app, con recordatorios pensados para ella — no para avisar a sus clientas.

**Tareas:**
1. Pantalla "Agenda": vista de lista agrupada por día (hoy, mañana, próximos 7 días) con las citas programadas.
2. Formulario "Nueva cita": elegir servicio (jala duración y precio de ahí), nombre de clienta, teléfono (como dato de referencia, no para envíos automáticos), fecha, hora, nota opcional.
3. Estados de cita: **Pendiente → Confirmada → Completada / Cancelada**, con botones rápidos para cambiar de estado desde la misma tarjeta.
4. Validación simple de traslape: si ya hay una cita en ese horario, advertir antes de guardar (sin bloquear, solo avisar).
5. **Recordatorio interno (para ella, no para la clienta):** en la pantalla de Inicio, una tarjeta "Tienes 3 citas mañana" que enlaza directo a la Agenda — así lo primero que ve al abrir la app es lo que se le viene encima del día, sin tener que revisar la agenda completa cada vez.
6. Botón "Cobrar esta cita" dentro del detalle de una cita completada, que la manda directo al POS con el servicio ya precargado en el carrito — conecta Agenda y Venta sin captura doble.

**Entregable:** módulo de Agenda funcional, de uso 100% interno, con aviso de citas próximas dentro de la app.

**Criterio de aceptación:** puedes crear una cita, cambiar su estado, verla reflejada en el aviso de "citas de mañana" en Inicio, y cobrarla desde el POS sin volver a escribir el servicio.

---

## Sprint 5 — POS: Flujo de Venta
**Duración estimada:** 5-6 días (el sprint más crítico)

**Tareas:**
1. Pantalla de venta: grid de productos/servicios con foto, buscador, carrito en construcción.
2. Función serverless que procesa la venta completa en una sola transacción:
   - Descuenta stock de cada producto vendido
   - Calcula ganancia bruta de la venta (precio venta − costo)
   - Guarda el registro de venta con método de pago y total
3. Soporte para llegar al POS con un servicio precargado (desde una cita de la Agenda, Sprint 4).
4. Manejo de error: si algo falla a medio proceso, la transacción se revierte completa.
5. Pantalla de confirmación/ticket.
6. Función de cancelar venta reciente (regresa el stock automáticamente).

**Entregable:** flujo de venta completo y confiable, conectado con la Agenda.

**Criterio de aceptación:** después de una venta de 2 productos + 1 servicio, el stock bajó correctamente, la venta aparece en el historial, y cancelarla regresa el stock a su estado anterior.

> Sigue siendo el sprint donde vale más la pena pedirle a Antigravity que pruebe casos límite (vender más cantidad de la que hay en stock, cancelar una venta dos veces) antes de darlo por terminado.

---

## Sprint 6 — Historial de Ventas
**Duración estimada:** 2 días

**Tareas:**
1. Lista de ventas con filtro básico por fecha.
2. Detalle de venta individual.

**Entregable:** pantalla de historial funcional y conectada a datos reales.

**Criterio de aceptación:** puedes ver el detalle de cualquier venta pasada.

---

## Sprint 7 — Inicio (resumen) + Ganancias
**Duración estimada:** 3-4 días

**Tareas:**
1. Pantalla "Inicio": ganancia de hoy, ganancia de la semana, ventas de hoy, alertas de stock bajo, y la tarjeta de "citas de mañana" (Sprint 4).
2. Pantalla "Ganancias": ganancia bruta del mes (suma de precio venta − costo de todo lo vendido), campo editable de "gastos fijos del mes" (un solo monto manual), y ganancia neta calculada como bruta − ese monto.
3. Desglose simple de ganancia por tipo (productos vs. servicios) dentro de la misma pantalla de Ganancias.
4. Construir las consultas agregadas como funciones/vistas de Supabase (no calculado en el frontend) para que carguen rápido.

**Entregable:** Inicio y Ganancias funcionando con datos reales.

**Criterio de aceptación:** el número de ganancia bruta del mes coincide exactamente con la suma manual de las ventas de ese mes, y la neta baja exactamente el monto de gastos fijos capturado.

---

## Sprint 8 — PWA, Responsivo y Pulido Visual
**Duración estimada:** 3-4 días

**Tareas:**
1. Configurar manifest.json y service worker para que sea instalable (PWA real).
2. Navegación inferior (Inicio, Venta, Inventario, Ganancias, Más) + panel "Más" con Agenda, Servicios, Nueva entrada, Configuración.
3. Aplicar el sistema de diseño completo (paleta cálida, Montserrat + Fraunces) de forma consistente en toda la app.
4. Ajustes de accesibilidad: tamaños de texto, contraste, áreas táctiles grandes — pensado para una usuaria de 40 años sin experiencia técnica.

**Entregable:** app instalable, responsiva y visualmente terminada.

**Criterio de aceptación:** se puede instalar la app desde Chrome en un celular Android y se ve/usa bien en pantalla completa.

---

## Sprint 9 — QA, Deploy Final y Entrega
**Duración estimada:** 2-3 días

**Tareas:**
1. Pruebas de extremo a extremo: venta, entrada de inventario, cita → cobro, cancelación.
2. Políticas de Row Level Security (RLS) en Supabase para que solo la usuaria autenticada vea/modifique sus datos.
3. Sesión de capacitación con la clienta (incluye cómo agendar una cita y enviar un recordatorio).
4. Manual de uso con capturas de pantalla.
5. Documentar en un README cómo hacer mantenimiento básico.

**Entregable:** sistema en producción, seguro, y clienta capacitada para usarlo — incluye el flujo de Agenda.

**Criterio de aceptación:** la clienta completa sin ayuda una venta, una cita nueva con su recordatorio, y una consulta de Ganancias durante la sesión de capacitación.

---

## Resumen de duración total

| Sprint | Enfoque | Duración estimada |
|---|---|---|
| 0 | Setup y arquitectura | 2-3 días |
| 1 | Auth + CRUD Productos | 4-5 días |
| 2 | Entradas de inventario | 2-3 días |
| 3 | Servicios (cobro unitario) | 1-2 días |
| 4 | **Agenda de citas (uso personal)** | 3-4 días |
| 5 | POS — flujo de venta | 5-6 días |
| 6 | Historial de ventas | 2 días |
| 7 | Inicio + Ganancias | 3-4 días |
| 8 | PWA, responsivo, pulido visual | 3-4 días |
| 9 | QA y entrega | 2-3 días |

**Total estimado:** ~4.5-5.5 semanas trabajando de forma constante — similar al plan anterior a pesar de agregar Agenda de Citas, porque se compensa con lo que se quitó (Reportes y Gastos detallados). Con Manager View de Antigravity corriendo tareas en paralelo (ej. Sprint 4 y Sprint 6 no dependen una de la otra y podrían avanzar juntas), se puede acortar más.

---

## Por qué la Agenda no alarga tanto el proyecto como parece

Aunque es un módulo nuevo, dos decisiones de alcance lo mantienen dentro de lo razonable para $4,500 MXN:
- El recordatorio es **100% interno** (una tarjeta en Inicio avisándole a ella), sin ninguna integración de mensajería externa — eso habría sumado días de desarrollo y, en muchos casos, un costo recurrente de un servicio de terceros.
- La Agenda **reutiliza el catálogo de Servicios** que ya ibas a construir en el Sprint 3, en vez de duplicar lógica.

Si más adelante la clienta quiere que la app le avise automáticamente a sus propias clientas (por WhatsApp, SMS, etc.), eso sí se cotiza aparte como Fase 2, ya que implica integrar un servicio externo con costo propio.
