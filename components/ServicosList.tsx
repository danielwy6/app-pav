
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ServicoComplementar, Rua, AppView, AppState } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Wrench, 
  RotateCcw, 
  PlusCircle, 
  History, 
  Ruler, 
  Info
} from 'lucide-react';

interface ServicosListProps {
  ruaId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const ServicosList: React.FC<ServicosListProps> = ({ ruaId, onNavigate }) => {
  const [servicos, setServicos] = useState<ServicoComplementar[]>([]);
  const [rua, setRua] = useState<Rua | null>(null);

  useEffect(() => {
    loadData();
  }, [ruaId]);

  const loadData = async () => {
    const r = await db.getById<Rua>('ruas', ruaId);
    if (r) setRua(r);

    const all = await db.getAll<ServicoComplementar>('servicos');
    setServicos(all.filter(s => s.ruaId === ruaId));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este registro de serviço?")) {
      await db.delete('servicos', id);
      loadData();
    }
  };

  const totals = servicos.reduce((acc, curr) => {
    if (curr.tipo === 'RETIRADA_MEIO_FIO') acc.retirada += curr.quantidade;
    else acc.assentamento += curr.quantidade;
    return acc;
  }, { retirada: 0, assentamento: 0 });

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho de Totais */}
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 opacity-60">
             <Wrench size={14} />
             <p className="text-[10px] font-black uppercase tracking-widest">{rua?.nome || 'Logradouro'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Total Retirada</p>
                <h4 className="text-2xl font-black">{totals.retirada.toFixed(2)}m</h4>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Assentamento</p>
                <h4 className="text-2xl font-black">{totals.assentamento.toFixed(2)}m</h4>
            </div>
          </div>
        </div>
        <div className="absolute top-[-40px] right-[-20px] opacity-10">
            <Wrench size={160} />
        </div>
      </div>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History size={14} /> Histórico de Lançamentos
        </h3>
        <button 
          onClick={() => onNavigate('FORM_SERVICO', { selectedRuaId: ruaId })}
          className="bg-blue-600 text-white flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-transform uppercase tracking-widest"
        >
          <Plus size={16} /> Novo Registro
        </button>
      </div>

      <div className="grid gap-4">
        {servicos.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-slate-400">
              <Wrench size={40} className="opacity-20" />
              <p className="text-xs font-black uppercase tracking-tighter">Nenhum serviço registrado nesta rua.</p>
          </div>
        ) : (
          servicos.map(s => (
            <div key={s.id} className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-200 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${s.tipo === 'RETIRADA_MEIO_FIO' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {s.tipo === 'RETIRADA_MEIO_FIO' ? <RotateCcw size={24} /> : <PlusCircle size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">
                        {s.quantidade.toFixed(2)} metros
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {s.tipo === 'RETIRADA_MEIO_FIO' ? 'Retirada de Meio-fio' : 'Assentamento de Meio-fio'}
                    </p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <div className="text-right mr-2 hidden sm:block">
                     <p className="text-[9px] font-black text-slate-400 uppercase">{s.data}</p>
                     <p className="text-[9px] font-mono text-slate-300">{s.hora}</p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="p-3 text-slate-200 hover:text-red-500 active:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ServicosList;
