import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingCart, MapPin, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Venta } from '../types';
import { MONTH_NAMES } from '../constants';
import CustomSelect from '../components/CustomSelect';

interface TopPrenda {
  nombre: string;
  categoria: string;
  total_qty: number;
  total_monto: number;
}

interface TopCiudad {
  ciudad: string;
  total_ventas: number;
  total_monto: number;
}

interface TopCliente {
  nombre: string;
  ciudad: string;
  total_compras: number;
  total_monto: number;
}

function getLaPazToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

export default function DashboardPage() {
  const today = getLaPazToday();
  const currentYear  = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7)) - 1; // 0-indexed

  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selYear,  setSelYear]  = useState(currentYear);

  const [loading,       setLoading]       = useState(true);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalVentas,   setTotalVentas]   = useState(0);
  const [topPrendas,    setTopPrendas]    = useState<TopPrenda[]>([]);
  const [topCiudades,   setTopCiudades]   = useState<TopCiudad[]>([]);
  const [topClientas,   setTopClientas]   = useState<TopCliente[]>([]);

  useEffect(() => { loadData(); }, [selMonth, selYear]);

  async function loadData() {
    setLoading(true);
    const mm        = String(selMonth + 1).padStart(2, '0');
    const monthStart = `${selYear}-${mm}-01`;
    const nextM      = selMonth === 11 ? 1 : selMonth + 2;
    const nextY      = selMonth === 11 ? selYear + 1 : selYear;
    const monthEnd   = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

    const { data } = await supabase
      .from('ventas')
      .select('*, clientes(nombre, ciudad), venta_items(id, prenda_id, qty, precio_unitario, prendas(nombre, categoria))')
      .gte('date', monthStart)
      .lt('date', monthEnd)
      .order('date', { ascending: false });

    const ventas: Venta[] = data ?? [];
    setTotalIngresos(ventas.reduce((s, v) => s + (v.total ?? 0), 0));
    setTotalVentas(ventas.length);

    // Top prendas
    const pm = new Map<string, TopPrenda>();
    for (const v of ventas) {
      for (const item of (v.venta_items ?? [])) {
        const key = item.prenda_id;
        const ex  = pm.get(key) ?? {
          nombre:      item.prendas?.nombre    ?? 'Desconocida',
          categoria:   item.prendas?.categoria ?? '',
          total_qty:   0,
          total_monto: 0,
        };
        ex.total_qty   += item.qty;
        ex.total_monto += item.qty * item.precio_unitario;
        pm.set(key, ex);
      }
    }
    setTopPrendas([...pm.values()].sort((a, b) => b.total_qty - a.total_qty).slice(0, 5));

    // Top ciudades
    const cm = new Map<string, TopCiudad>();
    for (const v of ventas) {
      const ciudad = v.clientes?.ciudad || 'Sin ciudad';
      const ex     = cm.get(ciudad) ?? { ciudad, total_ventas: 0, total_monto: 0 };
      ex.total_ventas += 1;
      ex.total_monto  += v.total ?? 0;
      cm.set(ciudad, ex);
    }
    setTopCiudades([...cm.values()].sort((a, b) => b.total_monto - a.total_monto).slice(0, 5));

    // Top clientas
    const clm = new Map<string, TopCliente>();
    for (const v of ventas) {
      if (!v.cliente_id || !v.clientes) continue;
      const key = v.cliente_id;
      const ex  = clm.get(key) ?? {
        nombre:          v.clientes.nombre,
        ciudad:          v.clientes.ciudad,
        total_compras:   0,
        total_monto:     0,
      };
      ex.total_compras += 1;
      ex.total_monto   += v.total ?? 0;
      clm.set(key, ex);
    }
    setTopClientas([...clm.values()].sort((a, b) => b.total_monto - a.total_monto).slice(0, 5));

    setLoading(false);
  }

  const years = [currentYear - 1, currentYear, currentYear + 1].filter(y => y >= 2024);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen mensual de ventas</p>
        </div>
        <div className="flex gap-2">
          <CustomSelect
            value={String(selMonth)}
            onChange={v => setSelMonth(Number(v))}
            options={MONTH_NAMES.map((m, i) => ({ value: String(i), label: m }))}
            size="sm"
            className="w-36"
          />
          <CustomSelect
            value={String(selYear)}
            onChange={v => setSelYear(Number(v))}
            options={years.map(y => ({ value: String(y), label: String(y) }))}
            size="sm"
            className="w-24"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={TrendingUp}    label="Ingresos del mes"  value={`Bs ${totalIngresos.toFixed(2)}`} loading={loading} />
        <StatCard icon={ShoppingCart}  label="Ventas realizadas" value={String(totalVentas)}              loading={loading} />
      </div>

      {/* Top prendas */}
      <TopCard title="Prendas más vendidas" loading={loading}>
        {topPrendas.length === 0
          ? <Empty />
          : topPrendas.map((p, i) => (
            <Row key={i} rank={i + 1} left={p.nombre} sub={p.categoria}
              right={`${p.total_qty} uds.`} rightSub={`Bs ${p.total_monto.toFixed(0)}`} />
          ))}
      </TopCard>

      {/* Top ciudades */}
      <TopCard title="Ciudades" loading={loading} icon={MapPin}>
        {topCiudades.length === 0
          ? <Empty />
          : topCiudades.map((c, i) => (
            <Row key={i} rank={i + 1} left={c.ciudad}
              right={`Bs ${c.total_monto.toFixed(0)}`} rightSub={`${c.total_ventas} venta${c.total_ventas !== 1 ? 's' : ''}`} />
          ))}
      </TopCard>

      {/* Top clientas */}
      <TopCard title="Top clientas" loading={loading} icon={Users}>
        {topClientas.length === 0
          ? <Empty />
          : topClientas.map((c, i) => (
            <Row key={i} rank={i + 1} left={c.nombre} sub={c.ciudad}
              right={`Bs ${c.total_monto.toFixed(0)}`} rightSub={`${c.total_compras} compra${c.total_compras !== 1 ? 's' : ''}`} />
          ))}
      </TopCard>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon, label, value, loading,
}: { icon: React.ElementType; label: string; value: string; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
          <Icon size={16} className="text-rose-500" />
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      {loading
        ? <div className="h-7 w-28 bg-gray-100 animate-pulse rounded" />
        : <p className="text-2xl font-bold text-gray-900">{value}</p>}
    </div>
  );
}

function TopCard({
  title, loading, icon: Icon, children,
}: { title: string; loading: boolean; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={15} className="text-rose-400" />}
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {loading
        ? <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-5 bg-gray-100 animate-pulse rounded" />)}</div>
        : <div>{children}</div>}
    </div>
  );
}

function Row({
  rank, left, sub, right, rightSub,
}: { rank: number; left: string; sub?: string; right: string; rightSub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-rose-400 w-4 shrink-0">{rank}</span>
        <div>
          <p className="text-sm font-medium text-gray-800">{left}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-700">{right}</p>
        {rightSub && <p className="text-xs text-gray-400">{rightSub}</p>}
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-gray-400 text-center py-4">Sin datos este mes</p>;
}
