
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Profissional } from '../types';
import { Save, Loader2 } from 'lucide-react';

interface FormProfissionalProps {
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormProfissional: React.FC<FormProfissionalProps> = ({ id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Profissional>>({
    nome: '',
    apelido: '',
    telefone: '',
    status: 'Ativo'
  });

  useEffect(() => {
    if (id) {
      db.getById<Profissional>('profissionais', id).then(p => {
        if (p) setFormData(p);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: Profissional = {
        id: id || crypto.randomUUID(),
        nome: formData.nome || '',
        apelido: formData.apelido || '',
        telefone: formData.telefone || '',
        status: formData.status as 'Ativo' | 'Inativo' || 'Ativo'
      };
      await db.save('profissionais', data);
      onSave();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar profissional.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
          <input 
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.nome}
            onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Nome do profissional..."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apelido (Opcional)</label>
          <input 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.apelido}
            onChange={e => setFormData(prev => ({ ...prev, apelido: e.target.value }))}
            placeholder="Como é conhecido..."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone (Opcional)</label>
          <input 
            type="tel"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.telefone}
            onChange={e => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
          <div className="flex gap-2">
            {['Ativo', 'Inativo'].map(status => (
              <button 
                key={status}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: status as any }))}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.status === status ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
              >
                {status}
              </button>
            ))}
          </div>
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
          Salvar
        </button>
      </div>
    </form>
  );
};

export default FormProfissional;
