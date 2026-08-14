import { useEffect, useState } from 'react';
import { Plus, Pencil, X, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Prenda } from '../types';
import { CATEGORIAS_PRENDA } from '../constants';
import CustomSelect from '../components/CustomSelect';

interface PrendaForm {
  nombre: string;
  categoria: string;
  precio: string;
  stock: string;
}

const EMPTY_FORM: PrendaForm = { nombre: '', categoria: '', precio: '', stock: '' };

export default function CatalogoPage() {
  const [prendas,    setPrendas]    = useState<Prenda[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState<PrendaForm>({ ...EMPTY_FORM });
  const [filterCat,  setFilterCat]  = useState('');
  const [search,     setSearch]     = useState('');

  useEffect(() => { loadPrendas(); }, []);

  async function loadPrendas() {
    setLoading(true);
    const { data } = await supabase.from('prendas').select('*').order('nombre');
    setPrendas(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(p: Prenda) {
    setEditId(p.id);
    setForm({
      nombre:    p.nombre,
      categoria: p.categoria,
      precio:    String(p.precio),
      stock:     String(p.stock),
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria) {
      alert('Completá nombre y categoría.');
      return;
    }
    setSubmitting(true);

    const payload = {
      nombre:    form.nombre.trim(),
      categoria: form.categoria,
      precio:    parseFloat(form.precio) || 0,
      stock:     parseInt(form.stock, 10)  || 0,
    };

    if (editId) {
      await supabase.from('prendas').update(payload).eq('id', editId);
    } else {
      await supabase.from('prendas').insert({ ...payload, is_active: true });
    }

    setSubmitting(false);
    closeModal();
    loadPrendas();
  }

  async function toggleActive(p: Prenda) {
    await supabase.from('prendas').update({ is_active: !p.is_active }).eq('id', p.id);
    loadPrendas();
  }

  const catOptions = [
    { value: '', label: 'Todas las categorías' },
    ...CATEGORIAS_PRENDA.map(c => ({ value: c, label: c })),
  ];

  const filtered = prendas.filter(p => {
    const matchCat    = !filterCat || p.categoria === filterCat;
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-sm text-gray-500 mt-0.5">{prendas.length} prendas en total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva prenda
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
          value={filterCat}
          onChange={setFilterCat}
          options={catOptions}
          placeholder="Todas las categorías"
          size="sm"
          className="w-48"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-rose-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay prendas{filterCat ? ` en ${filterCat}` : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <PrendaCard key={p.id} prenda={p} onEdit={openEdit} onToggle={toggleActive} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editId ? 'Editar prenda' : 'Nueva prenda'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required
                  placeholder="Ej: Blusa floral manga larga"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoría</label>
                <CustomSelect
                  value={form.categoria}
                  onChange={v => setForm(f => ({ ...f, categoria: v }))}
                  options={CATEGORIAS_PRENDA.map(c => ({ value: c, label: c }))}
                  placeholder="Seleccioná categoría"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Precio (Bs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio}
                    onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
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
      )}
    </div>
  );
}

/* ── PrendaCard ─────────────────────────────────────────────────────────── */

function PrendaCard({
  prenda, onEdit, onToggle,
}: { prenda: Prenda; onEdit: (p: Prenda) => void; onToggle: (p: Prenda) => void }) {
  const stockColor = prenda.stock === 0
    ? 'text-red-500'
    : prenda.stock <= 3
    ? 'text-amber-500'
    : 'text-green-600';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 transition-opacity ${prenda.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{prenda.nombre}</p>
          <span className="inline-block text-xs bg-rose-50 text-rose-600 rounded-full px-2 py-0.5 mt-1">
            {prenda.categoria}
          </span>
        </div>
        <button
          onClick={() => onEdit(prenda)}
          className="text-gray-400 hover:text-rose-500 ml-2 shrink-0 transition-colors"
        >
          <Pencil size={15} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div>
          <p className="text-lg font-bold text-gray-900">Bs {prenda.precio}</p>
          <p className={`text-xs font-medium ${stockColor}`}>
            {prenda.stock === 0 ? 'Sin stock' : `${prenda.stock} en stock`}
          </p>
        </div>
        <button
          onClick={() => onToggle(prenda)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            prenda.is_active
              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
          }`}
        >
          {prenda.is_active ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
