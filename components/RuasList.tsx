
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../db.ts';
import { Rua, Medicao } from '../types.ts';

const RuasList: React.FC<{ medicaoId: string, onNavigate: any }> = ({ medicaoId, onNavigate }) => {
  const [items, setItems] = useState<Rua[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const all = await db.getAll<Rua>('ruas');
    setItems(all.filter(r => r.medicaoId === medicaoId));
    setLoading(false);
  };

  useEffect(() => { load(); }, [medicaoId]);

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("⚠️ APAGAR RUA?\n\nExcluirá todos os trechos e fotos desta rua.")) {
      setLoading(true);
      await db.deleteRuaCascade(id);
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{items.length} Ruas Medidas</h2>
        <button onClick={() => onNavigate('FORM_RUA', { selectedMedicaoId: medicaoId })} className="bg-blue-600 text-white px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <Lucide.Plus size={18} /> Adicionar Rua
        </button>
      </div>

      <div className="grid gap-3">
        {items.map(r => (
          <div 
            key={r.id} 
            onClick={() => onNavigate('TRECHOS', { selectedRuaId: r.id })}
            className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between active:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${r.tipoIntervencao === 'NOVA' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                {r.tipoIntervencao === 'NOVA' ? <Lucide.PlusCircle size={24} /> : <Lucide.RotateCcw size={24} />}
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{r.nome}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{r.bairro}</p>
              </div>
            </div>
            <button onClick={(e) => onDelete(e, r.id)} className="p-4 text-red-300 hover:text-red-500 active:scale-90 transition-all"><Lucide.Trash2 size={22} /></button>
          </div>
        ))}
      </div>
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center"><Lucide.Loader2 className="animate-spin text-blue-600" size={40} /></div>
      )}
    </div>
  );
};

export default RuasList;
