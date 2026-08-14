export const CATEGORIAS_PRENDA = [
  'Blusas',
  'Vestidos',
  'Pantalones',
  'Faldas',
  'Abrigos',
  'Chaquetas',
  'Ropa interior',
  'Accesorios',
  'Calzado',
  'Otros',
] as const;

export type CategoriaPrenda = (typeof CATEGORIAS_PRENDA)[number];

export const CIUDADES = [
  'La Paz',
  'El Alto',
  'Cochabamba',
  'Santa Cruz',
  'Oruro',
  'Potosí',
  'Sucre',
  'Tarija',
  'Trinidad',
  'Cobija',
  'Otra',
] as const;

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
