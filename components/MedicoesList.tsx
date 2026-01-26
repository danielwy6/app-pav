
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../db.ts';
import { Medicao, Contrato } from '../types.ts';

const MedicoesList: React.FC<{ contratoId: string, onNavigate: any }> = ({ contratoId, onNavigate }) => {
  const [items, setItems] = useState<Medicao[]>([]);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [c, all] = await Promise.all([
      db.getById<Contrato>('contratos', contratoId),
      db.getAll<Medicao>('medicoes')
    ]);
    if (c) setContrato(c);
    setItems(all.filter(m => m.contratoId === contratoId));
    setLoading(false);
  };

  useEffect(() => { load(); }, [contratoId]);

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("⚠️ APAGAR MEDIÇÃO?\n\nEsta ação excluirá todos os dados desta medição permanentemente.")) {
      setLoading(true);
      await db.deleteMedicaoCascade(id);
      await load();
    }
  };

  const onEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigate('FORM_MEDICAO', { selectedContratoId: contratoId, editingId: id });
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">Obra Selecionada</p>
          <h2 className="text-2xl font-black uppercase">Contrato {contrato?.numero}</h2>
        </div>
        <button onClick={() => onNavigate('FORM_MEDICAO', { selectedContratoId: contratoId })} className="bg-blue-600 p-4 rounded-2xl active:scale-95"><Lucide.Plus size={24} /></button>
      </div>

      <div className="grid gap-3">
        {items.map(m => (
          <div 
            key={m.id} 
            onClick={() => onNavigate('RUAS', { selectedMedicaoId: m.id })}
            className="bg-white p-5 rounded-[32px] border shadow-sm flex items-center justify-between active:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl"><Lucide.Calendar size={24} /></div>
              <div>
                <h3 className="font-black text-slate-800 text-lg uppercase leading-none mb-1">Medição {m.numero}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.periodo}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={(e) => onEdit(e, m.id)} 
                className="p-4 text-slate-400 hover:text-blue-600 active:scale-90 transition-all"
              >
                <Lucide.Edit3 size={22} />
              </button>
              <button 
                onClick={(e) => onDelete(e, m.id)} 
                className="p-4 text-red-400 hover:text-red-600 active:scale-90 transition-all"
              >
                <Lucide.Trash2 size={22} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center"><Lucide.Loader2 className="animate-spin text-blue-600" size={40} /></div>
      )}
    </div>
  );
};

export default MedicoesList;
