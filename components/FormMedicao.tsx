
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Medicao, Rua, Trecho, ServicoComplementar } from '../types';
import { Save, Loader2, Calendar, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';

interface FormMedicaoProps {
  contratoId: string;
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormMedicao: React.FC<FormMedicaoProps> = ({ contratoId, id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [existingNumeros, setExistingNumeros] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Medicao>>({
    numero: '',
    periodo: new Date().toLocaleDateString('pt-BR'),
    observacoes: '',
    contratoId
  });

  useEffect(() => {
    const loadData = async () => {
      const todas = await db.getAll<Medicao>('medicoes');
      // Filtra medições DO MESMO CONTRATO, exceto a que está sendo editada
      const numeros = todas
        .filter(m => m.contratoId === contratoId && m.id !== id)
        .map(m => m.numero.trim().toUpperCase());
      setExistingNumeros(numeros);

      if (id) {
        const m = await db.getById<Medicao>('medicoes', id);
        if (m) setFormData(m);
      }
    };
    loadData();
  }, [id, contratoId]);

  const numeroLimpo = (formData.numero || '').trim().toUpperCase();
  const isDuplicate = existingNumeros.includes(numeroLimpo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroLimpo || isDuplicate) return;

    setLoading(true);
    try {
      const data: Medicao = {
        id: id || crypto.randomUUID(),
        numero: numeroLimpo,
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

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm("CONFIRMAR EXCLUSÃO?\n\nIsso apagará permanentemente esta medição e todos os seus registros de ruas e fotos.")) {
      setLoading(true);
      try {
        await db.deleteMedicaoCascade(id);
        onSave();
      } catch (err) {
        alert("Erro ao excluir.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-2xl shadow-lg transition-colors ${isDuplicate ? 'bg-red-600' : 'bg-blue-600'}`}>
                {isDuplicate ? <AlertTriangle size={24} className="text-white" /> : <Calendar size={24} className="text-white" />}
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Dados da Medição</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Período e Identificação</p>
            </div>
          </div>

          <div className="bg-blue-50 p-5 rounded-[28px] flex items-center gap-4 border border-blue-100">
            <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm"><Calendar size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Data de Referência</p>
              <p className="font-black text-slate-700 text-lg uppercase">{formData.periodo}</p>
            </div>
          </div>

          <div>
            <label className={`block text-[10px] font-black uppercase mb-2 tracking-[0.2em] ml-1 transition-colors ${isDuplicate ? 'text-red-500' : 'text-slate-400'}`}>
              Número da Medição
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
              placeholder="Ex: 01"
              autoFocus
            />
            
            {isDuplicate ? (
              <div className="mt-3 flex items-center gap-2 text-red-600 animate-pulse">
                <AlertCircle size={14} />
                <p className="text-[10px] font-black uppercase italic">Número já utilizado neste contrato!</p>
              </div>
            ) : (
              <p className="mt-3 text-[9px] text-slate-400 font-bold uppercase italic ml-1 flex items-center gap-1">
                  <AlertCircle size={10} /> O número deve ser exclusivo neste contrato.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em] ml-1">Observações Técnicas</label>
            <textarea 
              className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[28px] focus:ring-4 focus:ring-blue-100 outline-none h-32 text-sm font-bold text-slate-700"
              value={formData.observacoes}
              onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Notas adicionais sobre esta medição..."
            />
          </div>
        </div>

        <div className="flex gap-4 p-1">
          <button 
            type="submit" 
            disabled={loading || isDuplicate} 
            className={`flex-[2] py-5 text-white font-black rounded-[28px] shadow-xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all ${
                isDuplicate ? 'bg-slate-300 shadow-none' : 'bg-blue-600 shadow-blue-100'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
            {isDuplicate ? 'ERRO: DUPLICADO' : 'SALVAR MEDIÇÃO'}
          </button>
          <button type="button" onClick={onCancel} className="flex-1 py-5 bg-white text-slate-500 font-black rounded-[28px] border border-slate-200 uppercase text-[10px] tracking-widest active:bg-slate-50">
            Cancelar
          </button>
        </div>
      </form>

      {id && (
        <button 
          onClick={handleDelete}
          disabled={loading}
          className="w-full py-5 bg-red-50 text-red-600 font-black rounded-[28px] border border-red-100 flex items-center justify-center gap-3 active:bg-red-100 transition-all uppercase text-[10px] tracking-widest"
        >
          <Trash2 size={20} /> Excluir Medição Permanente
        </button>
      )}
    </div>
  );
};

export default FormMedicao;
