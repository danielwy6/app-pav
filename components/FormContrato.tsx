
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato } from '../types';
import { Save, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';

interface FormContratoProps {
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormContrato: React.FC<FormContratoProps> = ({ id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [existingNumeros, setExistingNumeros] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Contrato>>({
    numero: ''
  });

  useEffect(() => {
    const loadData = async () => {
      const todos = await db.getAll<Contrato>('contratos');
      // Filtra os números existentes, excluindo o número do próprio contrato se estiver editando
      const numeros = todos
        .filter(c => c.id !== id)
        .map(c => c.numero.trim().toUpperCase());
      setExistingNumeros(numeros);

      if (id) {
        const c = await db.getById<Contrato>('contratos', id);
        if (c) setFormData(c);
      }
    };
    loadData();
  }, [id]);

  const numeroLimpo = (formData.numero || '').trim().toUpperCase();
  const isDuplicate = existingNumeros.includes(numeroLimpo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroLimpo || isDuplicate) return;

    setLoading(true);
    try {
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
            <div className={`p-3 rounded-2xl shadow-lg transition-colors ${isDuplicate ? 'bg-red-600 shadow-red-100' : 'bg-blue-600 shadow-blue-100'}`}>
                {isDuplicate ? <AlertTriangle size={24} className="text-white" /> : <Save size={24} className="text-white" />}
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Dados do Contrato</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cadastro Técnico</p>
            </div>
        </div>

        <div>
          <label className={`block text-[10px] font-black uppercase mb-2 tracking-[0.2em] ml-1 transition-colors ${isDuplicate ? 'text-red-500' : 'text-slate-400'}`}>
            Número Oficial do Contrato
          </label>
          <input 
            required
            className={`w-full p-6 border rounded-[28px] outline-none text-2xl font-black transition-all ${
              isDuplicate 
              ? 'bg-red-50 border-red-500 text-red-700 ring-4 ring-red-100' 
              : 'bg-slate-50 border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-400'
            }`}
            value={formData.numero}
            onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
            placeholder="Ex: 042/2024"
            autoFocus
          />
          
          {isDuplicate ? (
            <div className="mt-3 flex items-center gap-2 text-red-600 animate-bounce">
              <AlertCircle size={14} />
              <p className="text-[10px] font-black uppercase italic">Este número já existe no sistema!</p>
            </div>
          ) : (
            <p className="mt-3 text-[9px] text-slate-400 font-bold uppercase italic ml-1">* O número do contrato deve ser exclusivo.</p>
          )}
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
          disabled={loading || isDuplicate}
          className={`flex-[1.5] py-5 text-white font-black rounded-[28px] shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest transition-all ${
            isDuplicate ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-blue-600 shadow-blue-100'
          }`}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
          {isDuplicate ? 'Número Duplicado' : 'Confirmar Cadastro'}
        </button>
      </div>
    </form>
  );
};

export default FormContrato;
