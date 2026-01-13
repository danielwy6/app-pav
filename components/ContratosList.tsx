
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato, AppView, AppState } from '../types';
import { Plus, ChevronRight, FileText, Trash2 } from 'lucide-react';

interface ContratosListProps {
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const ContratosList: React.FC<ContratosListProps> = ({ onNavigate }) => {
  const [contratos, setContratos] = useState<Contrato[]>([]);

  useEffect(() => {
    loadContratos();
  }, []);

  const loadContratos = async () => {
    const list = await db.getAll<Contrato>('contratos');
    setContratos(list);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Deseja realmente excluir este contrato?")) {
      await db.delete('contratos', id);
      loadContratos();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{contratos.length} Contratos Registrados</p>
        <button 
          onClick={() => onNavigate('FORM_CONTRATO')}
          className="bg-blue-600 text-white flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform"
        >
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {contratos.length === 0 ? (
        <div className="text-center py-20 px-10 flex flex-col items-center gap-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
           <FileText size={48} className="text-slate-200" />
           <p className="text-slate-400 text-sm">Nenhum contrato registrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {contratos.map(c => (
            <div 
              key={c.id} 
              onClick={() => onNavigate('MEDICOES', { selectedContratoId: c.id })}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
                    <FileText size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrato</p>
                  <h3 className="font-bold text-slate-800 text-lg">Nº {c.numero}</h3>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleDelete(e, c.id)}
                  className="p-2 text-slate-300 hover:text-red-500 active:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <ChevronRight size={24} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContratosList;
