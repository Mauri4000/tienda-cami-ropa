import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Venta, Cliente, Prenda } from '../types';
import { MONTH_NAMES } from '../constants';
import CustomSelect from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';

function getLaPazToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

interface ItemForm {
  prenda_id: string;
  qty: number;
  precio_unitario: number;
}

interface VentaForm {
  date: string;
  cliente_id: string;
  notes: string;
}

const EMPTY_FORM: VentaForm = { date: '', cliente_id: '', notes: '' };
const EMPTY_ITEM: ItemForm  = { prenda_id: '', qty: 1, precio_unitario: 0 };

export default function VentasPage() {
  const { profile } = useAuth();
  const today        = getLaPazToday();
  const currentYear  = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7)) - 1;

  const [ventas,    setVentas]    = useState<Venta[]>([]);
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [prendas,   setPrendas]   = useState<Prenda[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting,setSubmitting]= useState(false);

  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear,  setFilterYear]  = useState(currentYear);

  const [form,  setForm]  = useState<VentaForm>({ ...EMPTY_FORM, date: today });
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }]);

  const total = items.reduce((s, i) => s + i.qty * i.precio_unitario, 0);

  const years = [currentYear - 1, currentYear, currentYear + 1].filter(y => y >= 2024);

  const loadVentas = useCallback(async () => {
    setLoading(true);
    const mm         = String(filterMonth + 1).padStart(2, '0');
    const monthStart = `${filterYear}-${mm}-01`;
    const nextM      = filterMonth === 11 ? 1 : filterMonth + 2;
    const nextY      = filterMonth === 11 ? filterYear + 1 : filterYear;
    const monthEnd   = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

    const { data } = await supabase
      .from('ventas')
      .select('*, clientes(nombre, ciudad), venta_items(id, prenda_id, qty, precio_unitario, prendas(nombre, categoria))')
      .gte('date', monthStart)
      .lt('date', monthEnd)
      .order('date', { ascending: false });

    setVentas(data ?? []);
    setLoading(false);
  }, [filterMonth, filterYear]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  useEffect(() => {
    async function loadCatalog() {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('prendas').select('*').eq('is_active', true).order('nombre'),
      ]);
      setClientes(c ?? []);
      setPrendas(p ?? []);
    }
    loadCatalog();
  }, []);

  function openModal() {
    setForm({ date: today, cliente_id: '', notes: '' });
    setItems([{ ...EMPTY_ITEM }]);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function addItem() {
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handlePrendaChange(idx: number, prenda_id: string) {
    const prenda = prendas.find(p => p.id === prenda_id);
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, prenda_id, precio_unitario: prenda?.precio ?? 0 } : item
    ));
  }

  function handleItemField(idx: number, field: 'qty' | 'precio_unitario', val: string) {
    const num = parseFloat(val) || 0;
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: num } : item
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.some(i => !i.prenda_id)) {
      alert('Seleccioná una prenda en cada fila.');
      return;
    }
    if (items.length === 0) {
      alert('Agregá al menos una prenda.');
      return;
    }
    setSubmitting(true);

    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas')
      .insert({
        date:           form.date || today,
        total:          total,
        cliente_id:     form.cliente_id || null,
        responsible_id: profile?.id ?? null,
        notes:          form.notes || null,
      })
      .select()
      .single();

    if (ventaError || !ventaData) {
      alert('Error al registrar la venta.');
      setSubmitting(false);
      return;
    }

    // Insert items
    const { error: itemsError } = await supabase.from('venta_items').insert(
      items.map(i => ({
        venta_id:        ventaData.id,
        prenda_id:       i.prenda_id,
        qty:             i.qty,
        precio_unitario: i.precio_unitario,
      }))
    );

    if (itemsError) {
      alert('Venta guardada pero error en los items.');
    }

    // Decrement stock
    for (const item of items) {
      const prenda = prendas.find(p => p.id === item.prenda_id);
      if (prenda) {
        await supabase
          .from('prendas')
          .update({ stock: Math.max(0, prenda.stock - item.qty) })
          .eq('id', item.prenda_id);
      }
    }

    setSubmitting(false);
    closeModal();
    loadVentas();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta venta?')) return;
    await supabase.from('ventas').delete().eq('id', id);
    loadVentas();
  }

  const clienteOptions = [
    { value: '', label: 'Sin cliente' },
    ...clientes.map(c => ({ value: c.id, label: `${c.nombre}${c.ciudad ? ` — ${c.ciudad}` : ''}` })),
  ];

  const prendasOptions = prendas.map(p => ({
    value: p.id,
    label: `${p.nombre} — Bs ${p.precio} (stock: ${p.stock})`,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de ventas</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva venta
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <CustomSelect
          value={String(filterMonth)}
          onChange={v => setFilterMonth(Number(v))}
          options={MONTH_NAMES.map((m, i) => ({ value: String(i), label: m }))}
          size="sm"
          className="w-36"
        />
        <CustomSelect
          value={String(filterYear)}
          onChange={v => setFilterYear(Number(v))}
          options={years.map(y => ({ value: String(y), label: String(y) }))}
          size="sm"
          className="w-24"
        />
      </div>

      {/* Sales list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-rose-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ventas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin ventas este mes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map(v => (
            <VentaCard key={v.id} venta={v} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-semibold text-gray-900">Nueva Venta</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha</label>
                <DatePicker
                  value={form.date}
                  onChange={v => setForm(f => ({ ...f, date: v }))}
                  placeholder="Fecha de venta"
                  useFixed={true}
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Clienta</label>
                <CustomSelect
                  value={form.cliente_id}
                  onChange={v => setForm(f => ({ ...f, cliente_id: v }))}
                  options={clienteOptions}
                  placeholder="Sin cliente"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Prendas</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-rose-500 hover:text-rose-400 font-medium flex items-center gap-1"
                  >
                    <Plus size={13} /> Agregar prenda
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Prenda {idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <CustomSelect
                        value={item.prenda_id}
                        onChange={v => handlePrendaChange(idx, v)}
                        options={prendasOptions}
                        placeholder="Seleccioná una prenda"
                        size="sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={e => handleItemField(idx, 'qty', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Precio unit. (Bs)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio_unitario}
                            onChange={e => handleItemField(idx, 'precio_unitario', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-rose-400"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-right text-gray-500">
                        Subtotal: <span className="font-semibold text-gray-700">Bs {(item.qty * item.precio_unitario).toFixed(2)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Observaciones..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              {/* Total */}
              <div className="bg-rose-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-rose-700">Total</span>
                <span className="text-xl font-bold text-rose-700">Bs {total.toFixed(2)}</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-rose-500 hover:bg-rose-400 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Registrar venta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── VentaCard ─────────────────────────────────────────────────────────── */

function VentaCard({
  venta, onDelete,
}: { venta: Venta; onDelete: (id: string) => void }) {
  const dateStr = venta.date.slice(0, 10);
  const [d, m, y] = [
    dateStr.slice(8, 10),
    MONTH_NAMES[Number(dateStr.slice(5, 7)) - 1],
    dateStr.slice(0, 4),
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">
              {venta.clientes?.nombre ?? 'Sin cliente'}
            </span>
            {venta.clientes?.ciudad && (
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {venta.clientes.ciudad}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{d} {m} {y}</p>

          {/* Items */}
          {venta.venta_items && venta.venta_items.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {venta.venta_items.map(item => (
                <p key={item.id} className="text-xs text-gray-500">
                  · {item.prendas?.nombre ?? 'Prenda'} × {item.qty}
                  <span className="text-gray-400 ml-1">
                    (Bs {(item.qty * item.precio_unitario).toFixed(0)})
                  </span>
                </p>
              ))}
            </div>
          )}

          {venta.notes && (
            <p className="text-xs text-gray-400 mt-1 italic">{venta.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-3 ml-3 shrink-0">
          <span className="text-lg font-bold text-rose-600">Bs {(venta.total ?? 0).toFixed(0)}</span>
          <button
            onClick={() => onDelete(venta.id)}
            className="text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
