
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato } from '../types';
import { Save, Loader2, AlertTriangle } from 'lucide-react';

interface FormContratoProps {
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormContrato: React.FC<FormContratoProps> = ({ id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Contrato>>({
    numero: ''
  });

  useEffect(() => {
    if (id) {
      db.getById<Contrato>('contratos', id).then(c => {
        if (c) setFormData(c);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeroLimpo = (formData.numero || '').trim().toUpperCase();
    if (!numeroLimpo) return;

    setLoading(true);
    try {
      // Validação de duplicidade de número para evitar contratos repetidos
      const todosContratos = await db.getAll<Contrato>('contratos');
      const duplicado = todosContratos.find(c => 
        c.numero.trim().toUpperCase() === numeroLimpo && c.id !== id
      );

      if (duplicado) {
        alert(`⚠️ NÚMERO JÁ EXISTE\n\nO contrato de número "${numeroLimpo}" já está cadastrado. Por favor, utilize um número diferente para este contrato.`);
        setLoading(false);
        return;
      }

      const data: Contrato = {
        id: id || crypto.randomUUID(),
        numero: numeroLimpo
      };
      await db.save('contratos', data);
      onSave();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar contrato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100">
                <Save size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Dados do Contrato</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cadastro Técnico</p>
            </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em] ml-1">Número Oficial do Contrato</label>
          <input 
            required
            className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[28px] focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none text-2xl font-black transition-all"
            value={formData.numero}
            onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
            placeholder="Ex: 042/2024"
            autoFocus
          />
          <p className="mt-3 text-[9px] text-slate-400 font-bold uppercase italic ml-1">* Não é permitido criar contratos com o mesmo número.</p>
        </div>
      </div>

      <div className="flex gap-4 p-1">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-5 bg-white text-slate-500 font-black rounded-[28px] border border-slate-200 active:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-[1.5] py-5 bg-blue-600 text-white font-black rounded-[28px] shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
          Confirmar Cadastro
        </button>
      </div>
    </form>
  );
};

export default FormContrato;
