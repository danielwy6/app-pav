
import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
import * as Lucide from 'https://esm.sh/lucide-react@0.460.0';
import { db } from '../db.ts';
import { Medicao, Contrato, AppView, AppState, Rua, Trecho, ServicoComplementar } from '../types.ts';

interface MedicoesListProps {
  contratoId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const MedicoesList: React.FC<MedicoesListProps> = ({ contratoId, onNavigate }) => {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    const [c, all] = await Promise.all([
      db.getById<Contrato>('contratos', contratoId),
      db.getAll<Medicao>('medicoes')
    ]);
    if (c) setContrato(c);
    setMedicoes(all.filter(m => m.contratoId === contratoId));
  };

  useEffect(() => { load(); }, [contratoId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Confirmar exclusão desta medição e tudo vinculado?")) return;
    setDeleting(id);
    
    // UI Optimistic: Remove da lista visual antes de terminar no banco
    setMedicoes(prev => prev.filter(m => m.id !== id));

    try {
      const ruas = (await db.getAll<Rua>('ruas')).filter(r => r.medicaoId === id);
      const trechos = await db.getAll<Trecho>('trechos');
      const servicos = await db.getAll<ServicoComplementar>('servicos');

      for (const r of ruas) {
        for (const t of trechos.filter(t => t.ruaId === r.id)) await db.delete('trechos', t.id);
        for (const s of servicos.filter(s => s.ruaId === r.id)) await db.delete('servicos', s.id);
        await db.delete('ruas', r.id);
      }
      await db.delete('medicoes', id);
    } catch (e) {
      alert("Erro ao excluir. Restaurando lista...");
      load();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border shadow-sm">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase">Contrato Nº</p>
          <h2 className="text-xl font-black text-blue-700">{contrato?.numero || '...'}</h2>
        </div>
        <button onClick={()=>onNavigate('FORM_MEDICAO', {selectedContratoId: contratoId})} className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all">
          <Lucide.Plus size={20}/>
        </button>
      </div>

      <div className="grid gap-3">
        {medicoes.map(m => (
          <div key={m.id} className={`bg-white p-4 rounded-[28px] border flex items-center justify-between shadow-sm transition-opacity ${deleting === m.id ? 'opacity-30' : ''}`}>
            <div onClick={()=>onNavigate('RUAS', {selectedMedicaoId: m.id})} className="flex-1">
              <h3 className="font-black text-slate-800 uppercase text-sm">Medição {m.numero}</h3>
              <p className="text-[10px] font-bold text-slate-400">{m.periodo}</p>
            </div>
            <button onClick={()=>handleDelete(m.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl">
              {deleting === m.id ? <Lucide.Loader2 size={18} className="animate-spin"/> : <Lucide.Trash2 size={18}/>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicoesList;
