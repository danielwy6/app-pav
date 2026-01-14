
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Medicao } from '../types';
import { Save, Loader2, Calendar } from 'lucide-react';

interface FormMedicaoProps {
  contratoId: string;
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormMedicao: React.FC<FormMedicaoProps> = ({ contratoId, id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Medicao>>({
    numero: '',
    periodo: new Date().toLocaleDateString('pt-BR'), // Data automática
    observacoes: '',
    contratoId
  });

  useEffect(() => {
    if (id) {
      db.getById<Medicao>('medicoes', id).then(m => {
        if (m) setFormData(m);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: Medicao = {
        id: id || crypto.randomUUID(),
        numero: formData.numero || '',
        periodo: formData.periodo || new Date().toLocaleDateString('pt-BR'),
        observacoes: formData.observacoes || '',
        contratoId: formData.contratoId!
      };
      await db.save('medicoes', data);
      onSave();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar medição.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3 border border-blue-100 mb-2">
          <Calendar className="text-blue-600" size={20} />
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase">Data da Medição</p>
            <p className="font-bold text-slate-700">{formData.periodo}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número da Medição</label>
          <input 
            required
            type="number"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            value={formData.numero}
            onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
            placeholder="Ex: 02"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Técnicas</label>
          <textarea 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm"
            value={formData.observacoes}
            onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Descreva detalhes importantes da medição..."
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 active:bg-slate-50"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg active:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
          Salvar Medição
        </button>
      </div>
    </form>
  );
};

export default FormMedicao;
