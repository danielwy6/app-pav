
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Trecho, Rua, AppView, AppState, Profissional } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  User, 
  Ruler, 
  Image as ImageIcon, 
  MapPin, 
  CameraOff, 
  X, 
  Calendar, 
  Clock, 
  Maximize2, 
  ChevronRight,
  RotateCcw,
  PlusCircle
} from 'lucide-react';

interface TrechosListProps {
  ruaId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const TrechosList: React.FC<TrechosListProps> = ({ ruaId, onNavigate }) => {
  const [trechos, setTrechos] = useState<Trecho[]>([]);
  const [rua, setRua] = useState<Rua | null>(null);
  const [profissionais, setProfissionais] = useState<Record<string, string>>({});
  const [viewingTrecho, setViewingTrecho] = useState<Trecho | null>(null);

  useEffect(() => {
    loadData();
  }, [ruaId]);

  const loadData = async () => {
    const r = await db.getById<Rua>('ruas', ruaId);
    if (r) setRua(r);

    const all = await db.getAll<Trecho>('trechos');
    const filtered = all.filter(t => t.ruaId === ruaId);
    setTrechos(filtered);

    const proList = await db.getAll<Profissional>('profissionais');
    const proMap = proList.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.nome }), {});
    setProfissionais(proMap);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Excluir este trecho medido?")) {
      await db.delete('trechos', id);
      loadData();
    }
  };

  const handleEdit = (e: React.MouseEvent, t: Trecho) => {
    e.stopPropagation();
    onNavigate('FORM_TRECHO', { editingId: t.id, selectedRuaId: ruaId });
  };

  const areaTotal = trechos.reduce((acc, curr) => acc + curr.area, 0);

  return (
    <div className="space-y-4 pb-10">
      {/* Resumo da Rua */}
      <div className={`p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center overflow-hidden relative ${rua?.tipoIntervencao === 'NOVA' ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-emerald-600 to-emerald-800'}`}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
             {rua?.tipoIntervencao === 'NOVA' ? <PlusCircle size={12} /> : <RotateCcw size={12} />}
             <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest">
                {rua?.tipoIntervencao === 'NOVA' ? 'Pavimentação Nova' : 'Recuperação de Pavimento'}
             </p>
          </div>
          <p className="text-sm font-black uppercase tracking-tight mb-1">{rua?.nome || 'Logradouro'}</p>
          <h2 className="text-4xl font-black">{areaTotal.toFixed(2)} m²</h2>
          <p className="text-[10px] opacity-60 font-bold uppercase">Área acumulada nesta rua</p>
        </div>
        <div className="flex gap-2 relative z-10">
            <button 
                onClick={() => onNavigate('FORM_RUA', { editingId: ruaId })}
                className="bg-white/20 p-4 rounded-2xl hover:bg-white/30 transition-colors backdrop-blur-sm shadow-lg active:scale-90"
            >
                <Edit size={20} />
            </button>
            <button 
                onClick={() => onNavigate('MAPA_GERAL', { selectedRuaId: ruaId })}
                className="bg-white/20 p-4 rounded-2xl hover:bg-white/30 transition-colors backdrop-blur-sm shadow-lg active:scale-90"
            >
                <MapPin size={20} />
            </button>
        </div>
        <div className="absolute top-[-20px] right-[-20px] opacity-10">
            {rua?.tipoIntervencao === 'NOVA' ? <PlusCircle size={140} /> : <RotateCcw size={140} />}
        </div>
      </div>

      <div className="flex justify-between items-center px-1 pt-2">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{trechos.length} Trechos executados</p>
        <button 
          onClick={() => onNavigate('FORM_TRECHO', { selectedRuaId: ruaId })}
          className="bg-blue-600 text-white flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs shadow-xl active:scale-95 transition-transform uppercase tracking-widest"
        >
          <Plus size={16} /> Novo Trecho
        </button>
      </div>

      {trechos.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
            <div className="p-6 bg-slate-100 rounded-full text-slate-300">
                <Ruler size={48} />
            </div>
            <p className="text-slate-400 text-sm font-black uppercase tracking-tighter">Nenhum trecho medido ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {trechos.map(t => (
            <div 
              key={t.id} 
              onClick={() => setViewingTrecho(t)}
              className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300 active:bg-slate-50 cursor-pointer transition-colors relative group"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h4 className="font-black text-slate-900 text-3xl tracking-tighter leading-none">{t.area.toFixed(2)} m²</h4>
                    <p className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1 tracking-wider mt-2">
                      <Ruler size={14} className="text-blue-500" /> {t.comprimento.toFixed(2)}m x {t.larguraMedia.toFixed(2)}m
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => handleEdit(e, t)} 
                        className="p-3 text-blue-600 bg-blue-50 rounded-2xl active:scale-90 transition-transform shadow-sm"
                    >
                        <Edit size={18} />
                    </button>
                    <button 
                        onClick={(e) => handleDelete(e, t.id)} 
                        className="p-3 text-red-500 bg-red-50 rounded-2xl active:scale-90 transition-transform shadow-sm"
                    >
                        <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 shadow-inner">
                        <User size={14} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Responsável</p>
                        <span className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[140px] block leading-none">
                            {profissionais[t.profissionalId] || '---'}
                        </span>
                     </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-black uppercase">
                        <Calendar size={10} /> {t.data}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-300 font-mono mt-0.5">
                        <Clock size={10} /> {t.hora}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes (Visualização) - Mantemos as fotos aqui para auditoria pontual */}
      {viewingTrecho && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
            
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Detalhes do Trecho</h3>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">ID: {viewingTrecho.id.substring(0, 8)}</p>
              </div>
              <button 
                onClick={() => setViewingTrecho(null)}
                className="p-4 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm border border-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-12">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} /> Registro Fotográfico
                </h4>
                {viewingTrecho.fotos && viewingTrecho.fotos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {viewingTrecho.fotos.map(f => (
                      <div key={f.id} className="relative rounded-[32px] overflow-hidden border border-slate-100 shadow-lg">
                        <img src={f.base64} className="w-full object-cover max-h-64" alt={f.tipo} />
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase">
                          {f.tipo}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <CameraOff size={32} />
                    <p className="text-xs font-black uppercase">Nenhuma foto anexada</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl col-span-2 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Área Medida</p>
                    <h5 className="text-4xl font-black tracking-tighter">{viewingTrecho.area.toFixed(2)} m²</h5>
                  </div>
                  <Ruler size={40} className="opacity-30" />
                </div>
                
                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Calendar size={10} /> Data
                  </p>
                  <p className="text-sm font-black text-slate-800 uppercase">{viewingTrecho.data}</p>
                </div>
                
                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Clock size={10} /> Hora
                  </p>
                  <p className="text-sm font-black text-slate-800 uppercase">{viewingTrecho.hora}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 col-span-2 flex items-center gap-4">
                   <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                      <User size={20} />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Profissional Responsável</p>
                      <p className="text-lg font-black text-slate-800 uppercase leading-tight">
                        {profissionais[viewingTrecho.profissionalId] || 'Não informado'}
                      </p>
                   </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-[24px] text-white col-span-2 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-xl text-blue-400">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase opacity-50 tracking-widest">Coordenadas GPS</p>
                        <p className="text-xs font-mono font-bold tracking-tight">
                          {viewingTrecho.latitude.toFixed(6)}, {viewingTrecho.longitude.toFixed(6)}
                        </p>
                      </div>
                   </div>
                   <button 
                    onClick={() => window.open(`https://www.google.com/maps?q=${viewingTrecho.latitude},${viewingTrecho.longitude}`, '_blank')}
                    className="p-3 bg-blue-600 rounded-xl active:scale-90 transition-transform shadow-lg"
                   >
                     <ChevronRight size={18} />
                   </button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 grid grid-cols-2 gap-4">
              <button 
                onClick={() => setViewingTrecho(null)}
                className="py-5 bg-slate-100 text-slate-500 font-black rounded-[24px] uppercase text-xs tracking-widest"
              >
                FECHAR
              </button>
              <button 
                onClick={(e) => { setViewingTrecho(null); handleEdit(e, viewingTrecho); }}
                className="py-5 bg-blue-600 text-white font-black rounded-[24px] uppercase text-xs tracking-widest shadow-xl shadow-blue-100"
              >
                EDITAR DADOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrechosList;
