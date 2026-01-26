
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../db.ts';
import { Trecho, Rua, Profissional } from '../types.ts';
import JSZip from 'jszip';

const TrechosList: React.FC<{ ruaId: string, onNavigate: any }> = ({ ruaId, onNavigate }) => {
  const [items, setItems] = useState<Trecho[]>([]);
  const [rua, setRua] = useState<Rua | null>(null);
  const [profissionais, setProfissionais] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTrecho, setSelectedTrecho] = useState<Trecho | null>(null);
  const [exportingZip, setExportingZip] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, allTrechos, allPros] = await Promise.all([
      db.getById<Rua>('ruas', ruaId),
      db.getAll<Trecho>('trechos'),
      db.getAll<Profissional>('profissionais')
    ]);
    
    if (r) setRua(r);
    setItems(allTrechos.filter(t => t.ruaId === ruaId));
    
    const proMap = allPros.reduce((acc, p) => ({ ...acc, [p.id]: p.nome }), {});
    setProfissionais(proMap);
    
    setLoading(false);
  };

  useEffect(() => { load(); }, [ruaId]);

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Deseja apagar este trecho e suas fotos?")) {
      setLoading(true);
      await db.delete('trechos', id);
      await load();
    }
  };

  const downloadPhotosZip = async (trecho: Trecho) => {
    if (!trecho.fotos || trecho.fotos.length === 0) {
      alert("Nenhuma foto disponível para baixar.");
      return;
    }

    setExportingZip(true);
    try {
      const zip = new JSZip();
      // Pasta principal do trecho
      const mainFolder = zip.folder(`trecho_${trecho.id.substring(0, 8)}_${trecho.data.replace(/\//g, '-')}`);
      
      // Cria subpastas conforme solicitado
      const antesFolder = mainFolder?.folder("Antes");
      const depoisFolder = mainFolder?.folder("Depois");

      trecho.fotos.forEach((foto, index) => {
        const base64Data = foto.base64.split(',')[1];
        const filename = `foto_${index + 1}.jpg`;
        
        if (foto.tipo === 'Antes') {
          antesFolder?.file(filename, base64Data, { base64: true });
        } else if (foto.tipo === 'Depois') {
          depoisFolder?.file(filename, base64Data, { base64: true });
        } else {
          // Caso exista outro tipo de foto (DURANTE, GERAL), fica na raiz do trecho
          mainFolder?.file(`${foto.tipo}_${filename}`, base64Data, { base64: true });
        }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evidencias_pav_${trecho.id.substring(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao gerar arquivo ZIP.");
    } finally {
      setExportingZip(false);
    }
  };

  const totalArea = items.reduce((acc, t) => acc + t.area, 0);

  const fotosAntes = selectedTrecho?.fotos.filter(f => f.tipo === 'Antes') || [];
  const fotosDepois = selectedTrecho?.fotos.filter(f => f.tipo === 'Depois') || [];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full">
          <p className="text-[10px] font-black uppercase opacity-50 mb-1">{rua?.nome}</p>
          <h2 className="text-4xl font-black">{totalArea.toFixed(2)} m²</h2>
          <p className="text-[10px] font-black uppercase opacity-50 mt-1">Total de Área Medida</p>
          
          <button 
            onClick={() => onNavigate('MAPA_GERAL', { selectedRuaId: ruaId })}
            className="mt-6 flex items-center gap-2 bg-blue-600/30 hover:bg-blue-600/50 backdrop-blur-md self-start px-4 py-2 rounded-xl border border-white/20 transition-all active:scale-95"
          >
            <Lucide.MapPin size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Ver Pontos no Mapa</span>
          </button>
        </div>
        <Lucide.Ruler size={100} className="absolute -right-5 -bottom-5 opacity-10 rotate-12" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{items.length} Lançamentos</h2>
        <button onClick={() => onNavigate('FORM_TRECHO', { selectedRuaId: ruaId })} className="bg-blue-600 text-white px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <Lucide.Plus size={18} /> Novo Trecho
        </button>
      </div>

      <div className="grid gap-4">
        {items.map((t, idx) => (
          <div 
            key={t.id} 
            onClick={() => setSelectedTrecho(t)}
            className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl transition-transform">
                <Lucide.MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trecho #{idx + 1}</p>
                <h3 className="text-2xl font-black text-slate-800">{t.area.toFixed(2)} m²</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{t.comprimento.toFixed(2)}m x {t.larguraMedia.toFixed(2)}m</p>
                <p className="text-[9px] font-black text-blue-500 uppercase mt-1">{profissionais[t.profissionalId] || '---'}</p>
              </div>
            </div>
            <button onClick={(e) => onDelete(e, t.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-90 transition-all"><Lucide.Trash2 size={22} /></button>
          </div>
        ))}
      </div>

      {/* MODAL DE DETALHES */}
      {selectedTrecho && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter">Detalhes do Trecho</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTrecho.data} • {selectedTrecho.hora}</p>
              </div>
              <button onClick={() => setSelectedTrecho(null)} className="p-3 bg-slate-100 rounded-full text-slate-500 active:scale-90"><Lucide.X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              {/* Info Card */}
              <div className="bg-slate-50 p-6 rounded-[32px] grid grid-cols-2 gap-4 border border-slate-100">
                <div className="col-span-2 flex items-center gap-3 mb-2">
                   <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg"><Lucide.HardHat size={18} /></div>
                   <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Executado por</p>
                      <p className="font-black text-slate-800 text-sm uppercase">{profissionais[selectedTrecho.profissionalId] || 'Não identificado'}</p>
                   </div>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Dimensões</p>
                  <p className="font-black text-slate-800">{selectedTrecho.comprimento}m x {selectedTrecho.larguraMedia}m</p>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Área Total</p>
                  <p className="font-black text-blue-600 text-lg">{selectedTrecho.area.toFixed(2)} m²</p>
                </div>
                {selectedTrecho.observacoes && (
                  <div className="col-span-2 border-t border-slate-200 pt-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Observações Técnicas</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{selectedTrecho.observacoes}"</p>
                  </div>
                )}
              </div>

              {/* Botão de Download */}
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.1em]">Galerias Técnicas</h4>
                <button 
                  onClick={() => downloadPhotosZip(selectedTrecho)}
                  disabled={exportingZip}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
                >
                  {exportingZip ? <Lucide.Loader2 className="animate-spin" size={14} /> : <Lucide.FileArchive size={14} />}
                  Baixar ZIP Organizado
                </button>
              </div>

              {/* Galeria ANTES */}
              {fotosAntes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Evidências: ANTES (Original)</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {fotosAntes.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-[24px] overflow-hidden border border-slate-200 shadow-sm">
                        <img src={f.base64} className="w-full h-full object-cover" alt="Antes" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Galeria DEPOIS */}
              {fotosDepois.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Evidências: DEPOIS (Finalizado)</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {fotosDepois.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-[24px] overflow-hidden border border-slate-200 shadow-sm">
                        <img src={f.base64} className="w-full h-full object-cover" alt="Depois" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedTrecho.latitude},${selectedTrecho.longitude}`, '_blank')}
                  className="py-4 bg-white text-slate-600 font-black rounded-2xl shadow-sm flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest border border-slate-200"
                >
                  <Lucide.MapPin size={16} /> Ver no Mapa
                </button>
                <button 
                  onClick={() => onNavigate('FORM_TRECHO', { selectedRuaId: ruaId, editingId: selectedTrecho.id })}
                  className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:bg-blue-700"
                >
                  <Lucide.Edit3 size={16} /> Editar Dados
                </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center"><Lucide.Loader2 className="animate-spin text-blue-600" size={40} /></div>
      )}
    </div>
  );
};

export default TrechosList;
