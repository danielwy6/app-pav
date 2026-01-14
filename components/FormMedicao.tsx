
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Medicao, Rua, Trecho, ServicoComplementar } from '../types';
import { Save, Loader2, Calendar, Trash2 } from 'lucide-react';

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
    periodo: new Date().toLocaleDateString('pt-BR'),
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

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm("CONFIRMAR EXCLUSÃO?\n\nIsso apagará permanentemente esta medição e todos os seus registros de ruas e fotos.")) {
      setLoading(true);
      try {
        const todasRuas = await db.getAll<Rua>('ruas');
        const ruasDaMedicao = todasRuas.filter(r => r.medicaoId === id);
        const todosTrechos = await db.getAll<Trecho>('trechos');
        const todosServicos = await db.getAll<ServicoComplementar>('servicos');

        for (const rua of ruasDaMedicao) {
          const trechosRua = todosTrechos.filter(t => t.ruaId === rua.id);
          for (const t of trechosRua) await db.delete('trechos', t.id);
          const servicosRua = todosServicos.filter(s => s.ruaId === rua.id);
          for (const s of servicosRua) await db.delete('servicos', s.id);
          await db.delete('ruas', rua.id);
        }

        await db.delete('medicoes', id);
        onSave(); // Volta para a lista
      } catch (err) {
        alert("Erro ao excluir.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
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
              placeholder="Descreva detalhes importantes..."
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl active:bg-blue-700 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <Save />} SALVAR MEDIÇÃO
          </button>
          <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200">
            Cancelar
          </button>
        </div>
      </form>

      {id && (
        <button 
          onClick={handleDelete}
          disabled={loading}
          className="w-full py-4 bg-red-50 text-red-600 font-black rounded-2xl border border-red-100 flex items-center justify-center gap-2 active:bg-red-100"
        >
          <Trash2 size={18} /> EXCLUIR MEDIÇÃO PERMANENTEMENTE
        </button>
      )}
    </div>
  );
};

export default FormMedicao;
