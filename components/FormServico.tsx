
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ServicoComplementar, TipoServico, Rua } from '../types';
import { Save, Loader2, RotateCcw, PlusCircle, Ruler, Wrench } from 'lucide-react';

interface FormServicoProps {
  ruaId: string;
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormServico: React.FC<FormServicoProps> = ({ ruaId, id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [rua, setRua] = useState<Rua | null>(null);
  const [formData, setFormData] = useState<Partial<ServicoComplementar>>({
    ruaId,
    tipo: 'ASSENTAMENTO_MEIO_FIO',
    quantidade: 0,
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR'),
    observacoes: ''
  });

  useEffect(() => {
    db.getById<Rua>('ruas', ruaId).then(r => r && setRua(r));
    if (id) {
      db.getById<ServicoComplementar>('servicos', id).then(s => s && setFormData(s));
    }
  }, [id, ruaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.quantidade || formData.quantidade <= 0) return alert("Informe uma quantidade válida.");
    
    setLoading(true);
    try {
      const servico: ServicoComplementar = {
        id: id || crypto.randomUUID(),
        ruaId: formData.ruaId!,
        tipo: formData.tipo as TipoServico,
        quantidade: Number(formData.quantidade),
        data: formData.data || new Date().toLocaleDateString('pt-BR'),
        hora: formData.hora || new Date().toLocaleTimeString('pt-BR'),
        observacoes: formData.observacoes,
        isDirty: true
      };
      await db.save('servicos', servico);
      onSave();
    } catch (err) {
      alert("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lançamento de Serviço</p>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{rua?.nome || 'Logradouro'}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seletor de Tipo */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividade Realizada</label>
            <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, tipo: 'RETIRADA_MEIO_FIO'}))}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[24px] border-2 transition-all ${formData.tipo === 'RETIRADA_MEIO_FIO' ? 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <RotateCcw size={32} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-center">Retirada de Meio-fio</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, tipo: 'ASSENTAMENTO_MEIO_FIO'}))}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[24px] border-2 transition-all ${formData.tipo === 'ASSENTAMENTO_MEIO_FIO' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <PlusCircle size={32} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-center">Assentamento de Meio-fio</span>
                </button>
            </div>
          </div>

          {/* Input de Quantidade */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade Executada (m)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.01"
                required
                autoFocus
                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[24px] outline-none text-4xl font-black text-slate-800 placeholder:text-slate-200 pr-20"
                value={formData.quantidade || ''}
                onChange={e => setFormData(p => ({...p, quantidade: Number(e.target.value)}))}
                placeholder="0.00"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">METROS</div>
            </div>
          </div>

          <div className="space-y-2">
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações (Opcional)</label>
             <textarea 
                className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[24px] outline-none text-sm font-bold text-slate-700 h-24"
                value={formData.observacoes}
                onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))}
                placeholder="Ex: Trecho com curva acentuada, material fornecido pela prefeitura..."
             />
          </div>
        </form>
      </div>

      <div className="flex gap-4 px-1">
        <button type="button" onClick={onCancel} className="flex-1 py-5 bg-white text-slate-500 font-black rounded-[24px] border border-slate-200 uppercase text-xs tracking-widest active:bg-slate-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="flex-[1.5] py-5 bg-blue-600 text-white font-black rounded-[24px] shadow-xl shadow-blue-100 flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95 transition-all">
          {loading ? <Loader2 className="animate-spin" /> : <Save />} Salvar Registro
        </button>
      </div>
    </div>
  );
};

export default FormServico;
