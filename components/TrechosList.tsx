
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Trecho, Rua, AppView, AppState } from '../types';
import { Plus, Trash2, Loader2, Ruler, Calendar, User, ChevronRight } from 'lucide-react';

interface TrechosListProps {
  ruaId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const TrechosList: React.FC<TrechosListProps> = ({ ruaId, onNavigate }) => {
  const [trechos, setTrechos] = useState<Trecho[]>([]);
  const [rua, setRua] = useState<Rua | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [ruaId]);

  const loadData = async () => {
    const r = await db.getById<Rua>('ruas', ruaId);
    if (r) setRua(r);

    const all = await db.getAll<Trecho>('trechos');
    setTrechos(all.filter(t => t.ruaId === ruaId));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Confirmar exclusão deste trecho e suas fotos?")) {
      setDeletingId(id);
      try {
        await db.delete('trechos', id);
        setTrechos(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        alert("Erro ao excluir trecho.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const areaTotal = trechos.reduce((acc, curr) => acc + curr.area, 0);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase opacity-50 mb-1">{rua?.nome || 'Logradouro'}</p>
        <h2 className="text-4xl font-black">{areaTotal.toFixed(2)} m²</h2>
        <p className="text-[10px] font-bold uppercase opacity-50 mt-1">Área total acumulada</p>
      </div>

      <div className="flex justify-between items-center px-1">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{trechos.length} Trechos medidos</p>
        <button 
          onClick={() => onNavigate('FORM_TRECHO', { selectedRuaId: ruaId })}
          className="bg-blue-600 text-white flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={16} /> Novo Trecho
        </button>
      </div>

      <div className="grid gap-4">
        {trechos.map(t => (
          <div key={t.id} className={`bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 transition-all ${deletingId === t.id ? 'opacity-30 scale-95' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-slate-900 text-3xl tracking-tighter">{t.area.toFixed(2)} m²</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1">
                  <Ruler size={12} /> {t.comprimento.toFixed(2)}m x {t.larguraMedia.toFixed(2)}m
                </p>
              </div>
              <button 
                onClick={(e) => handleDelete(e, t.id)}
                className="p-3 bg-red-50 text-red-600 rounded-2xl active:scale-90 transition-transform"
              >
                {deletingId === t.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase">{t.data}</span>
               </div>
               <ChevronRight size={18} className="text-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrechosList;
