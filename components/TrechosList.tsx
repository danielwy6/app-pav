
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../db.ts';
import { Trecho, Rua } from '../types.ts';

const TrechosList: React.FC<{ ruaId: string, onNavigate: any }> = ({ ruaId, onNavigate }) => {
  const [items, setItems] = useState<Trecho[]>([]);
  const [rua, setRua] = useState<Rua | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, all] = await Promise.all([
      db.getById<Rua>('ruas', ruaId),
      db.getAll<Trecho>('trechos')
    ]);
    if (r) setRua(r);
    setItems(all.filter(t => t.ruaId === ruaId));
    setLoading(false);
  };

  useEffect(() => { load(); }, [ruaId]);

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Deseja apagar este trecho e suas fotos?")) {
      setLoading(true);
      await db.delete('trechos', id);
      await load();
    }
  };

  const totalArea = items.reduce((acc, t) => acc + t.area, 0);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase opacity-50 mb-1">{rua?.nome}</p>
        <h2 className="text-4xl font-black">{totalArea.toFixed(2)} m²</h2>
        <p className="text-[10px] font-black uppercase opacity-50 mt-1">Total de Área Medida</p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{items.length} Lançamentos</h2>
        <button onClick={() => onNavigate('FORM_TRECHO', { selectedRuaId: ruaId })} className="bg-blue-600 text-white px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <Lucide.Plus size={18} /> Novo Trecho
        </button>
      </div>

      <div className="grid gap-4">
        {items.map((t, idx) => (
          <div key={t.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trecho #{idx + 1}</p>
              <h3 className="text-2xl font-black text-slate-800">{t.area.toFixed(2)} m²</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{t.comprimento.toFixed(2)}m x {t.larguraMedia.toFixed(2)}m</p>
            </div>
            <button onClick={(e) => onDelete(e, t.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-90 transition-all"><Lucide.Trash2 size={22} /></button>
          </div>
        ))}
      </div>
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center"><Lucide.Loader2 className="animate-spin text-blue-600" size={40} /></div>
      )}
    </div>
  );
};

export default TrechosList;
