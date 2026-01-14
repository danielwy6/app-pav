
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Medicao, Contrato, AppView, AppState, Rua, Trecho, ServicoComplementar } from '../types';
import { Plus, ChevronRight, Calendar, Trash2, Loader2 } from 'lucide-react';

interface MedicoesListProps {
  contratoId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const MedicoesList: React.FC<MedicoesListProps> = ({ contratoId, onNavigate }) => {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    
    if (window.confirm("⚠️ EXCLUIR MEDIÇÃO?\n\nIsso apagará permanentemente:\n- Todas as RUAS desta medição\n- Todos os TRECHOS e FOTOS\n- Esta ação não pode ser desfeita.")) {
      setDeletingId(id);
      
      try {
        // 1. Buscar dependências para limpeza em cascata
        const todasRuas = await db.getAll<Rua>('ruas');
        const ruasDaMedicao = todasRuas.filter(r => r.medicaoId === id);
        
        const todosTrechos = await db.getAll<Trecho>('trechos');
        const todosServicos = await db.getAll<ServicoComplementar>('servicos');

        // 2. Limpar em cascata (Ruas -> Trechos -> Fotos)
        for (const rua of ruasDaMedicao) {
          const trechosRua = todosTrechos.filter(t => t.ruaId === rua.id);
          for (const t of trechosRua) {
            await db.delete('trechos', t.id);
          }
          const servicosRua = todosServicos.filter(s => s.ruaId === rua.id);
          for (const s of servicosRua) {
            await db.delete('servicos', s.id);
          }
          await db.delete('ruas', rua.id);
        }

        // 3. Deletar a medição no banco
        await db.delete('medicoes', id);
        
        // 4. Atualizar UI imediatamente (Optimistic UI)
        setMedicoes(prev => prev.filter(m => m.id !== id));
        
        alert("Medição excluída com sucesso.");
      } catch (err) {
        console.error("Erro na exclusão:", err);
        alert("Ocorreu um erro ao excluir. Tente novamente.");
        loadData(); // Recarrega do banco em caso de erro
      } finally {
        setDeletingId(null);
      }
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

      <div className="grid gap-4">
        {medicoes.map(m => (
          <div key={m.id} className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all ${deletingId === m.id ? 'opacity-30 scale-95' : ''}`}>
            <div className="flex items-center p-5">
              <div onClick={() => onNavigate('RUAS', { selectedMedicaoId: m.id })} className="flex-1 cursor-pointer flex items-center gap-4">
                <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">Medição #{m.numero}</h3>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-0.5 tracking-wider">{m.periodo}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <button 
                  disabled={deletingId === m.id}
                  onClick={(e) => handleDelete(e, m.id)} 
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-100 active:scale-90 transition-all disabled:opacity-30"
                >
                  {deletingId === m.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  EXCLUIR
                </button>
                <ChevronRight size={20} className="text-slate-300" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {medicoes.length === 0 && (
        <div className="text-center py-16 px-10 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200">
           <Calendar size={40} className="mx-auto text-slate-200 mb-2" />
           <p className="text-slate-400 text-sm font-bold uppercase">Nenhuma medição encontrada.</p>
        </div>
      )}
    </div>
  );
};

export default MedicoesList;
