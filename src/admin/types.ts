export type Role = 'admin' | 'vendedor';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Prenda {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  is_active: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  ciudad: string;
  telefono: string | null;
  email: string | null;
  created_at: string;
}

export interface VentaItem {
  id: string;
  venta_id: string;
  prenda_id: string;
  qty: number;
  precio_unitario: number;
  prendas?: { nombre: string; categoria: string } | null;
}

export interface Venta {
  id: string;
  date: string;
  total: number;
  cliente_id: string | null;
  responsible_id: string | null;
  notes: string | null;
  created_at: string;
  clientes?: { nombre: string; ciudad: string } | null;
  profiles?: { name: string } | null;
  venta_items?: VentaItem[];
}
