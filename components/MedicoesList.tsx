
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Medicao, Contrato, AppView, AppState } from '../types';
import { Plus, ChevronRight, Calendar, Trash2 } from 'lucide-react';

interface MedicoesListProps {
  contratoId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const MedicoesList: React.FC<MedicoesListProps> = ({ contratoId, onNavigate }) => {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [contrato, setContrato] = useState<Contrato | null>(null);

  useEffect(() => {
    loadData();
  }, [contratoId]);

  const loadData = async () => {
    const c = await db.getById<Contrato>('contratos', contratoId);
    if (c) setContrato(c);

    const all = await db.getAll<Medicao>('medicoes');
    setMedicoes(all.filter(m => m.contratoId === contratoId));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Excluir medição?")) {
      await db.delete('medicoes', id);
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      {contrato && (
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-600 text-white p-3 rounded-2xl">
             <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contrato em Foco</p>
            <h2 className="font-black text-slate-800 text-xl tracking-tight">Nº {contrato.numero}</h2>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{medicoes.length} Medições Processadas</p>
        <button 
          onClick={() => onNavigate('FORM_MEDICAO', { selectedContratoId: contratoId })}
          className="bg-blue-600 text-white flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={16} /> Nova Medição
        </button>
      </div>

      {medicoes.length === 0 ? (
        <div className="text-center py-16 px-10 flex flex-col items-center gap-3 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200">
           <Calendar size={40} className="text-slate-200" />
           <p className="text-slate-400 text-sm font-bold">Nenhuma medição para este contrato.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {medicoes.map(m => (
            <div key={m.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group active:bg-slate-50 transition-colors">
              <div onClick={() => onNavigate('RUAS', { selectedMedicaoId: m.id })} className="flex-1 cursor-pointer flex items-center gap-4">
                <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">Medição #{m.numero}</h3>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-0.5 tracking-wider">Realizada em: {m.periodo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => handleDelete(e, m.id)} className="p-3 text-slate-300 hover:text-red-500 active:bg-red-50 rounded-xl transition-colors">
                  <Trash2 size={20} />
                </button>
                <ChevronRight size={24} className="text-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicoesList;
