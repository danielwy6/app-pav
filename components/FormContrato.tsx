
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Contrato } from '../types';
import { Save, Loader2 } from 'lucide-react';

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
    setLoading(true);
    try {
      const data: Contrato = {
        id: id || crypto.randomUUID(),
        numero: formData.numero || ''
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número do Contrato</label>
          <input 
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
            value={formData.numero}
            onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
            placeholder="Ex: 042/2024"
            autoFocus
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 active:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
          Salvar Contrato
        </button>
      </div>
    </form>
  );
};

export default FormContrato;
