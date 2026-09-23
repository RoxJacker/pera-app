// Datos mock para Sprint 0 — reemplazar con llamadas a Supabase en sprints 1+

export const mockProductos = [
  { id: '1', nombre: 'Tinte Igora 5.4', marca: 'Schwarzkopf', categoria: 'Tintes', costo: 95, precioVenta: 185, stock: 12, stockMinimo: 5, pedestalColor: '#EBD9CC' },
  { id: '2', nombre: 'Base líquida NW20', marca: 'MAC', categoria: 'Maquillaje', costo: 180, precioVenta: 320, stock: 3, stockMinimo: 5, pedestalColor: '#E7EBDC' },
  { id: '3', nombre: 'Brocha kabuki', marca: 'Sigma', categoria: 'Brochas', costo: 45, precioVenta: 95, stock: 8, stockMinimo: 3, pedestalColor: '#D9C2AC' },
  { id: '4', nombre: 'Esmalte terracota', marca: 'OPI', categoria: 'Uñas', costo: 30, precioVenta: 65, stock: 4, stockMinimo: 6, pedestalColor: '#F3DFD5' },
  { id: '5', nombre: 'Sérum vitamina C', marca: 'The Ordinary', categoria: 'Skincare', costo: 120, precioVenta: 250, stock: 6, stockMinimo: 4, pedestalColor: '#E4D9CB' },
  { id: '6', nombre: 'Rizador cerámico', marca: 'BaByliss', categoria: 'Herramientas', costo: 350, precioVenta: 580, stock: 2, stockMinimo: 2, pedestalColor: '#F5E3C4' },
];

export const mockServicios = [
  { id: 's1', nombre: 'Corte + peinado', precio: 250, duracion: 60, pedestalColor: '#EBD9CC' },
  { id: 's2', nombre: 'Manicura completa', precio: 180, duracion: 45, pedestalColor: '#E4D9CB' },
  { id: 's3', nombre: 'Coloración completa', precio: 420, duracion: 90, pedestalColor: '#D9C2AC' },
  { id: 's4', nombre: 'Tratamiento capilar', precio: 320, duracion: 60, pedestalColor: '#F3DFD5' },
];

export const mockVentas = [
  { id: 'v42', folio: '#0042', descripcion: 'Tinte + Corte', fecha: 'Hoy', hora: '3:42 pm', total: 435, ganancia: 220, metodoPago: 'Efectivo' },
  { id: 'v41', folio: '#0041', descripcion: 'Manicura', fecha: 'Hoy', hora: '1:15 pm', total: 180, ganancia: 140, metodoPago: 'Transferencia' },
  { id: 'v40', folio: '#0040', descripcion: '2× Esmalte', fecha: 'Ayer', hora: '5:30 pm', total: 130, ganancia: 60, metodoPago: 'Efectivo' },
  { id: 'v39', folio: '#0039', descripcion: 'Sérum + Base', fecha: 'Ayer', hora: '11:00 am', total: 570, ganancia: 240, metodoPago: 'Tarjeta' },
];

export const mockCitas = [
  { id: 'c1', clienteNombre: 'María López', clienteTelefono: '333-111-0000', servicio: 'Corte + peinado', fecha: 'Hoy', hora: '10:00 am', estado: 'confirmada', notas: '' },
  { id: 'c2', clienteNombre: 'Ana Ruiz', clienteTelefono: '333-222-1111', servicio: 'Coloración completa', fecha: 'Mañana', hora: '11:00 am', estado: 'pendiente', notas: 'Tinte rubio' },
  { id: 'c3', clienteNombre: 'Sandra Torres', clienteTelefono: '333-333-2222', servicio: 'Manicura completa', fecha: 'Mañana', hora: '2:00 pm', estado: 'pendiente', notas: '' },
  { id: 'c4', clienteNombre: 'Claudia Vega', clienteTelefono: '333-444-3333', servicio: 'Tratamiento capilar', fecha: '25 sep', hora: '9:00 am', estado: 'pendiente', notas: 'Primera vez' },
];

export const mockMetricasHoy = {
  gananciaHoy: 412,
  gananciaHoyDelta: 18,
  gananciaSemana: 2180,
  gananciasemanaDelta: 6,
  ventasHoy: 7,
  ventasProductos: 3,
  ventasServicios: 4,
};

export const mockGanancias = {
  mes: 'septiembre',
  bruta: 7190,
  gastosFijos: 850,
  neta: 6340,
  porProductos: 3540,
  porServicios: 3650,
};

export const mockBarras = [36, 58, 44, 72, 28, 28, 14]; // L M M J V S D
export const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const stockBajo = mockProductos.filter(p => p.stock <= p.stockMinimo);
