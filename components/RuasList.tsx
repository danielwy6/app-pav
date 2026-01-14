
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Rua, Medicao, AppView, AppState, Trecho, ServicoComplementar } from '../types';
import { Plus, ChevronRight, Navigation, Trash2, Loader2, Map as MapIcon, Calendar, PlusCircle, RotateCcw } from 'lucide-react';

interface RuasListProps {
  medicaoId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const RuasList: React.FC<RuasListProps> = ({ medicaoId, onNavigate }) => {
  const [ruas, setRuas] = useState<Rua[]>([]);
  const [medicao, setMedicao] = useState<Medicao | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [medicaoId]);

  const loadData = async () => {
    const m = await db.getById<Medicao>('medicoes', medicaoId);
    if (m) setMedicao(m);

    const all = await db.getAll<Rua>('ruas');
    setRuas(all.filter(r => r.medicaoId === medicaoId));
  };

  const handleDeleteRua = async (e: React.MouseEvent, ruaId: string) => {
    e.stopPropagation();
    
    if (window.confirm("⚠️ EXCLUIR RUA?\n\nIsso removerá:\n- Este Logradouro\n- Todos os Trechos e Fotos medidos\n- Esta ação é definitiva.")) {
      setDeletingId(ruaId);
      
      try {
        // Limpar dependências
        const todosTrechos = await db.getAll<Trecho>('trechos');
        const trechosRua = todosTrechos.filter(t => t.ruaId === ruaId);
        for (const t of trechosRua) {
          await db.delete('trechos', t.id);
        }

        const todosServicos = await db.getAll<ServicoComplementar>('servicos');
        const servicosRua = todosServicos.filter(s => s.ruaId === ruaId);
        for (const s of servicosRua) {
          await db.delete('servicos', s.id);
        }

        // Deletar rua principal
        await db.delete('ruas', ruaId);
        
        // Atualizar interface imediatamente
        setRuas(prev => prev.filter(r => r.id !== ruaId));
        
      } catch (err) {
        console.error(err);
        alert("Falha ao excluir rua.");
        loadData();
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center overflow-hidden relative">
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 opacity-80 font-bold">
               <Calendar size={12} />
               <p className="text-[10px] uppercase tracking-widest">Medição #{medicao?.numero}</p>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{medicao?.periodo}</h2>
        </div>
        <div className="bg-white/10 p-4 rounded-full backdrop-blur-md relative z-10 border border-white/20">
            <Navigation size={28} />
        </div>
        <div className="absolute top-[-30px] right-[-30px] opacity-10">
            <MapIcon size={140} />
        </div>
      </div>

      <div className="flex justify-between items-center px-1 pt-2">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{ruas.length} Ruas Medidas</p>
        <button 
          onClick={() => onNavigate('FORM_RUA', { selectedMedicaoId: medicaoId })}
          className="bg-blue-600 text-white flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-transform uppercase tracking-widest"
        >
          <Plus size={18} /> Adicionar Rua
        </button>
      </div>

      <div className="grid gap-4">
        {ruas.map(r => (
          <div key={r.id} className={`bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden transition-all ${deletingId === r.id ? 'opacity-30 scale-95' : ''}`}>
            <div className="p-6 flex items-center justify-between">
              <div onClick={() => onNavigate('TRECHOS', { selectedRuaId: r.id })} className="flex items-center gap-5 cursor-pointer flex-1">
                <div className={`p-4 rounded-2xl ${r.tipoIntervencao === 'NOVA' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {r.tipoIntervencao === 'NOVA' ? <PlusCircle size={28} /> : <RotateCcw size={28} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase leading-tight">{r.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.bairro}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <button 
                  disabled={deletingId === r.id}
                  onClick={(e) => handleDeleteRua(e, r.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase active:scale-90 transition-all disabled:opacity-30"
                >
                  {deletingId === r.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  EXCLUIR
                </button>
                <ChevronRight size={20} className="text-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RuasList;
