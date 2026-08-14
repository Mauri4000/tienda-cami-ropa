import { useEffect, useState } from 'react';
import { Plus, Pencil, X, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Cliente, Venta } from '../types';
import { CIUDADES, MONTH_NAMES } from '../constants';
import CustomSelect from '../components/CustomSelect';

interface ClienteForm {
  nombre: string;
  ciudad: string;
  telefono: string;
  email: string;
}

const EMPTY_FORM: ClienteForm = { nombre: '', ciudad: '', telefono: '', email: '' };

export default function ClientesPage() {
  const [clientes,     setClientes]     = useState<Cliente[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [form,         setForm]         = useState<ClienteForm>({ ...EMPTY_FORM });
  const [search,       setSearch]       = useState('');
  const [filterCiudad, setFilterCiudad] = useState('');

  // Historial view
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [historial,        setHistorial]        = useState<Venta[]>([]);
  const [histLoading,      setHistLoading]      = useState(false);

  useEffect(() => { loadClientes(); }, []);

  async function loadClientes() {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nombre');
    setClientes(data ?? []);
    setLoading(false);
  }

  async function loadHistorial(clienteId: string) {
    setHistLoading(true);
    const { data } = await supabase
      .from('ventas')
      .select('*, venta_items(id, qty, precio_unitario, prendas(nombre))')
      .eq('cliente_id', clienteId)
      .order('date', { ascending: false });
    setHistorial(data ?? []);
    setHistLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(c: Cliente) {
    setEditId(c.id);
    setForm({
      nombre:   c.nombre,
      ciudad:   c.ciudad,
      telefono: c.telefono ?? '',
      email:    c.email    ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { alert('Completá el nombre.'); return; }
    setSubmitting(true);

    const payload = {
      nombre:   form.nombre.trim(),
      ciudad:   form.ciudad,
      telefono: form.telefono || null,
      email:    form.email    || null,
    };

    if (editId) {
      await supabase.from('clientes').update(payload).eq('id', editId);
    } else {
      await supabase.from('clientes').insert(payload);
    }

    setSubmitting(false);
    closeModal();
    loadClientes();
  }

  function openHistorial(c: Cliente) {
    setSelectedCliente(c);
    loadHistorial(c.id);
  }

  function closeHistorial() {
    setSelectedCliente(null);
    setHistorial([]);
  }

  const ciudadOptions = [
    { value: '', label: 'Todas las ciudades' },
    ...CIUDADES.map(c => ({ value: c, label: c })),
  ];

  const filtered = clientes.filter(c => {
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCiudad = !filterCiudad || c.ciudad === filterCiudad;
    return matchSearch && matchCiudad;
  });

  /* ── Historial view ────────────────────────────────────────────────── */
  if (selectedCliente) {
    const totalComprado = historial.reduce((s, v) => s + (v.total ?? 0), 0);
    return (
      <div className="space-y-5 max-w-2xl">
        <button
          onClick={closeHistorial}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-500 transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          Volver a clientes
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{selectedCliente.nombre}</h1>
              {selectedCliente.ciudad && (
                <p className="text-sm text-gray-500 mt-0.5">{selectedCliente.ciudad}</p>
              )}
            </div>
            <button
              onClick={() => { openEdit(selectedCliente!); }}
              className="text-gray-400 hover:text-rose-500 transition-colors"
            >
              <Pencil size={16} />
            </button>
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 text-sm">
            {selectedCliente.telefono && (
              <span className="text-gray-600">📞 {selectedCliente.telefono}</span>
            )}
            {selectedCliente.email && (
              <span className="text-gray-600">✉️ {selectedCliente.email}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{historial.length}</p>
            <p className="text-xs text-gray-500 mt-1">Compras totales</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">Bs {totalComprado.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">Monto total</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Historial de compras</h2>
          {histLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-rose-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin compras registradas</p>
          ) : (
            <div className="space-y-3">
              {historial.map(v => {
                const ds = v.date.slice(0, 10);
                return (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">
                        {ds.slice(8, 10)} {MONTH_NAMES[Number(ds.slice(5, 7)) - 1]} {ds.slice(0, 4)}
                      </p>
                      <p className="font-bold text-rose-600">Bs {(v.total ?? 0).toFixed(0)}</p>
                    </div>
                    {v.venta_items?.map(item => (
                      <p key={item.id} className="text-xs text-gray-500">
                        · {item.prendas?.nombre ?? 'Prenda'} × {item.qty}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit modal while in historial */}
        {showModal && (
          <ClienteModal
            form={form}
            setForm={setForm}
            editId={editId}
            submitting={submitting}
            onClose={closeModal}
            onSubmit={handleSubmit}
            ciudadOptions={ciudadOptions.slice(1)}
          />
        )}
      </div>
    );
  }

  /* ── List view ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clientes.length} clientas registradas</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva clienta
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-rose-400 w-48"
        />
        <CustomSelect
          value={filterCiudad}
          onChange={setFilterCiudad}
          options={ciudadOptions}
          placeholder="Todas las ciudades"
          size="sm"
          className="w-44"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-rose-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin clientes{search ? ` con "${search}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.map((c, idx) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${idx !== 0 ? 'border-t border-gray-50' : ''}`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-rose-500">
                  {c.nombre[0]?.toUpperCase() ?? '?'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{c.nombre}</p>
                <p className="text-xs text-gray-400">
                  {[c.ciudad, c.telefono].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => openHistorial(c)}
                  className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ClienteModal
          form={form}
          setForm={setForm}
          editId={editId}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
          ciudadOptions={ciudadOptions.slice(1)}
        />
      )}
    </div>
  );
}

/* ── ClienteModal ───────────────────────────────────────────────────────── */

interface ModalProps {
  form: ClienteForm;
  setForm: React.Dispatch<React.SetStateAction<ClienteForm>>;
  editId: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  ciudadOptions: { value: string; label: string }[];
}

function ClienteModal({ form, setForm, editId, submitting, onClose, onSubmit, ciudadOptions }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {editId ? 'Editar clienta' : 'Nueva clienta'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre completo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              required
              placeholder="Ej: María García"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Ciudad</label>
            <CustomSelect
              value={form.ciudad}
              onChange={v => setForm(f => ({ ...f, ciudad: v }))}
              options={ciudadOptions}
              placeholder="Seleccioná ciudad"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono (opcional)</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="Ej: 70000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email (opcional)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Ej: maria@email.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Agregar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
