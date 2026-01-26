
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../db.ts';
import { Rua, Trecho } from '../types.ts';

const RuasList: React.FC<{ medicaoId: string, onNavigate: any }> = ({ medicaoId, onNavigate }) => {
  const [items, setItems] = useState<Rua[]>([]);
  const [trechosCount, setTrechosCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [allRuas, allTrechos] = await Promise.all([
      db.getAll<Rua>('ruas'),
      db.getAll<Trecho>('trechos')
    ]);
    
    const filteredRuas = allRuas.filter(r => r.medicaoId === medicaoId);
    setItems(filteredRuas);

    // Contabiliza trechos por rua
    const counts: Record<string, number> = {};
    allTrechos.forEach(t => {
      counts[t.ruaId] = (counts[t.ruaId] || 0) + 1;
    });
    setTrechosCount(counts);
    
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

  const onEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigate('FORM_RUA', { selectedMedicaoId: medicaoId, editingId: id });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{items.length} Ruas Cadastradas</h2>
        <button onClick={() => onNavigate('FORM_RUA', { selectedMedicaoId: medicaoId })} className="bg-blue-600 text-white px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <Lucide.Plus size={18} /> Adicionar Rua
        </button>
      </div>

      <div className="grid gap-3">
        {items.map(r => {
          const hasTrechos = (trechosCount[r.id] || 0) > 0;
          return (
            <div 
              key={r.id} 
              onClick={() => onNavigate('TRECHOS', { selectedRuaId: r.id })}
              className={`bg-white p-5 rounded-[32px] shadow-sm border flex items-center justify-between active:bg-slate-50 transition-all cursor-pointer ${!hasTrechos ? 'border-amber-200 ring-1 ring-amber-50' : 'border-slate-100'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl transition-colors ${!hasTrechos ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {hasTrechos ? <Lucide.MapPin size={24} /> : <Lucide.Clock size={24} className="animate-pulse" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{r.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">{r.bairro}</p>
                  
                  {!hasTrechos ? (
                    <span className="text-[8px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Em Execução</span>
                  ) : (
                    <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">{trechosCount[r.id]} Trechos Medidos</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => onEdit(e, r.id)} 
                  className="p-4 text-slate-300 hover:text-blue-500 active:scale-90 transition-all"
                >
                  <Lucide.Edit3 size={22} />
                </button>
                <button 
                  onClick={(e) => onDelete(e, r.id)} 
                  className="p-4 text-red-300 hover:text-red-500 active:scale-90 transition-all"
                >
                  <Lucide.Trash2 size={22} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center"><Lucide.Loader2 className="animate-spin text-blue-600" size={40} /></div>
      )}
    </div>
  );
};

export default RuasList;
