
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Profissional, AppView, AppState } from '../types';
import { Plus, User, Phone, Trash2, Edit } from 'lucide-react';

interface ProfissionaisListProps {
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const ProfissionaisList: React.FC<ProfissionaisListProps> = ({ onNavigate }) => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  useEffect(() => {
    loadProfissionais();
  }, []);

  const loadProfissionais = async () => {
    const list = await db.getAll<Profissional>('profissionais');
    setProfissionais(list);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir profissional?")) {
      await db.delete('profissionais', id);
      loadProfissionais();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{profissionais.length} Cadastrados</p>
        <button 
          onClick={() => onNavigate('FORM_PROFISSIONAL')}
          className="bg-amber-500 text-white flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform"
        >
          <Plus size={18} /> Novo Profissional
        </button>
      </div>

      {profissionais.length === 0 ? (
        <div className="text-center py-20 px-10 flex flex-col items-center gap-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
           <User size={48} className="text-slate-200" />
           <p className="text-slate-400 text-sm">Nenhum profissional cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {profissionais.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${p.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{p.nome}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    {p.apelido && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{p.apelido}</span>}
                    {p.telefone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone size={10} /> {p.telefone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => onNavigate('FORM_PROFISSIONAL', { editingId: p.id })} className="p-2 text-slate-400 active:bg-slate-50 rounded-lg"><Edit size={18} /></button>
                 <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-red-500 active:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfissionaisList;
