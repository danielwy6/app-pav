
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../db.ts';
import { Contrato, AppView, AppState } from '../types.ts';

const ContratosList: React.FC<{ onNavigate: any }> = ({ onNavigate }) => {
  const [items, setItems] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setItems(await db.getAll('contratos'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // ESSENCIAL: Impede que o clique "vaze" para o card
    
    if (confirm("⚠️ APAGAR CONTRATO?\n\nEsta ação excluirá permanentemente este contrato e TODAS as medições e fotos vinculadas.")) {
      setLoading(true);
      await db.deleteContratoCascade(id);
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Contratos Ativos</h2>
        <button onClick={() => onNavigate('FORM_CONTRATO')} className="bg-blue-600 text-white px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <Lucide.Plus size={18} /> Novo Contrato
        </button>
      </div>

      <div className="grid gap-3">
        {items.length === 0 && !loading ? (
          <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center opacity-50">
            <Lucide.FileText size={48} className="mb-4" />
            <p className="font-black text-xs uppercase">Nenhum contrato encontrado</p>
          </div>
        ) : (
          items.map(item => (
            <div 
              key={item.id} 
              onClick={() => onNavigate('MEDICOES', { selectedContratoId: item.id })}
              className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl"><Lucide.FileText size={24} /></div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none mb-1">Nº {item.numero}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Contrato de Manutenção</p>
                </div>
              </div>
              <button 
                onClick={(e) => onDelete(e, item.id)} 
                className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-90 transition-all"
              >
                <Lucide.Trash2 size={22} />
              </button>
            </div>
          ))
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center">
          <Lucide.Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      )}
    </div>
  );
};

export default ContratosList;
