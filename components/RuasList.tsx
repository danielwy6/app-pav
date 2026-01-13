
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Rua, Medicao, AppView, AppState, Trecho } from '../types';
import { 
  Plus, 
  ChevronRight, 
  MapPin, 
  Map as MapIcon, 
  Navigation, 
  List, 
  Calendar, 
  RotateCcw, 
  PlusCircle, 
  Wrench,
  FileArchive,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import JSZip from 'jszip';

interface RuasListProps {
  medicaoId: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const RuasList: React.FC<RuasListProps> = ({ medicaoId, onNavigate }) => {
  const [ruas, setRuas] = useState<Rua[]>([]);
  const [medicao, setMedicao] = useState<Medicao | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [zippingId, setZippingId] = useState<string | null>(null);
  const [zippingType, setZippingType] = useState<'Antes' | 'Depois' | null>(null);

  useEffect(() => {
    loadData();
  }, [medicaoId]);

  const loadData = async () => {
    const m = await db.getById<Medicao>('medicoes', medicaoId);
    if (m) setMedicao(m);

    const all = await db.getAll<Rua>('ruas');
    setRuas(all.filter(r => r.medicaoId === medicaoId));
  };

  const handleDownloadStreetPhotos = async (e: React.MouseEvent, rua: Rua) => {
    e.stopPropagation();
    if (!rua.fotos || rua.fotos.length === 0) {
      alert("Esta rua não possui fotos do estado inicial (Antes) cadastradas.");
      return;
    }

    setZippingId(rua.id);
    setZippingType('Antes');
    try {
      const zip = new JSZip();
      const folderName = `Fotos_Antes_${rua.nome.replace(/\s+/g, '_')}`;
      const folder = zip.folder(folderName);

      if (folder) {
        rua.fotos.forEach((foto, idx) => {
          const base64Data = foto.base64.split(',')[1];
          const fileName = `${rua.nome.replace(/\s+/g, '')}_Antes_${idx + 1}.jpg`;
          folder.file(fileName, base64Data, { base64: true });
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}_PavInspect.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar arquivo ZIP.");
    } finally {
      setZippingId(null);
      setZippingType(null);
    }
  };

  const handleDownloadAfterPhotos = async (e: React.MouseEvent, rua: Rua) => {
    e.stopPropagation();
    setZippingId(rua.id);
    setZippingType('Depois');
    
    try {
      const allTrechos = await db.getAll<Trecho>('trechos');
      const streetTrechos = allTrechos.filter(t => t.ruaId === rua.id);
      
      const hasAfterPhotos = streetTrechos.some(t => t.fotos && t.fotos.some(f => f.tipo === 'Depois'));
      
      if (!hasAfterPhotos) {
        alert("Não há fotos de execução (Depois) registradas nos trechos desta rua.");
        setZippingId(null);
        setZippingType(null);
        return;
      }

      const zip = new JSZip();
      const rootFolder = zip.folder(`Fotos_Depois_${rua.nome.replace(/\s+/g, '_')}`);
      
      if (rootFolder) {
        streetTrechos.forEach(trecho => {
          const afterPhotos = trecho.fotos.filter(f => f.tipo === 'Depois');
          if (afterPhotos.length > 0) {
            // Criar pasta para a data/visita
            const dateFolderName = `Visita_${trecho.data.replace(/\//g, '-')}`;
            const dateFolder = rootFolder.folder(dateFolderName);
            
            if (dateFolder) {
              // Criar subpasta para o Trecho específico dentro da visita
              const trechoFolderName = `Trecho_${trecho.id.substring(0, 4)}`;
              const trechoFolder = dateFolder.folder(trechoFolderName);
              
              if (trechoFolder) {
                afterPhotos.forEach((foto, idx) => {
                  const base64Data = foto.base64.split(',')[1];
                  const fileName = `Foto_${idx + 1}_${trecho.hora.replace(/:/g, '-')}.jpg`;
                  trechoFolder.file(fileName, base64Data, { base64: true });
                });
              }
            }
          }
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fotos_Execucao_${rua.nome.replace(/\s+/g, '_')}_PavInspect.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erro ao processar fotos de execução.");
    } finally {
      setZippingId(null);
      setZippingType(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center overflow-hidden relative">
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 opacity-80 font-bold">
               <Calendar size={12} />
               <p className="text-[10px] uppercase tracking-widest">Medição #{medicao?.numero}</p>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{medicao?.periodo}</h2>
        </div>
        <div className="bg-white/10 p-4 rounded-full backdrop-blur-md relative z-10 border border-white/20">
            <Navigation size={28} />
        </div>
        <div className="absolute top-[-30px] right-[-30px] opacity-10">
            <MapIcon size={140} />
        </div>
      </div>

      <div className="flex justify-between items-center px-1 pt-2">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{ruas.length} Logradouros Medidos</p>
        <button 
          onClick={() => onNavigate('FORM_RUA', { selectedMedicaoId: medicaoId })}
          className="bg-blue-600 text-white flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs shadow-lg active:scale-95 transition-transform uppercase tracking-widest"
        >
          <Plus size={18} /> Cadastrar Rua
        </button>
      </div>

      <div className="grid gap-4">
        {ruas.map(r => (
          <div 
            key={r.id} 
            className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all"
          >
            <div 
              onClick={() => setShowOptionsId(showOptionsId === r.id ? null : r.id)}
              className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${showOptionsId === r.id ? 'bg-blue-50/50' : 'active:bg-slate-50'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl transition-colors ${r.tipoIntervencao === 'NOVA' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {r.tipoIntervencao === 'NOVA' ? <PlusCircle size={28} /> : <RotateCcw size={28} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{r.nome}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${r.tipoIntervencao === 'NOVA' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {r.tipoIntervencao === 'NOVA' ? 'Pavimentação Nova' : 'Recuperação'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.bairro}</p>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-slate-300 transition-transform duration-300 ${showOptionsId === r.id ? 'rotate-90 text-blue-500' : ''}`} />
            </div>

            {showOptionsId === r.id && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-300">
                <button 
                  onClick={() => onNavigate('TRECHOS', { selectedRuaId: r.id })}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-[24px] text-[8px] font-black uppercase tracking-widest active:bg-slate-800 transition-all shadow-xl"
                >
                  <List size={20} className="text-emerald-400" /> Trechos
                </button>
                <button 
                  onClick={() => onNavigate('SERVICOS', { selectedRuaId: r.id })}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-amber-500 text-white rounded-[24px] text-[8px] font-black uppercase tracking-widest active:bg-amber-600 transition-all shadow-xl shadow-amber-100"
                >
                  <Wrench size={20} className="text-white" /> Serviços
                </button>
                <button 
                  onClick={() => onNavigate('MAPA_GERAL', { selectedRuaId: r.id })} 
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-[24px] text-[8px] font-black uppercase tracking-widest active:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                >
                  <MapIcon size={20} className="text-blue-200" /> Mapa
                </button>
                
                {/* Botões de Download de Fotos */}
                <div className="col-span-1 grid grid-cols-2 gap-2">
                   <button 
                    onClick={(e) => handleDownloadStreetPhotos(e, r)}
                    disabled={zippingId === r.id}
                    className="flex flex-col items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-[24px] text-[8px] font-black uppercase tracking-widest active:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
                  >
                    {zippingId === r.id && zippingType === 'Antes' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <ImageIcon size={16} />
                        <FileArchive size={12} className="opacity-50" />
                      </div>
                    )}
                    <span className="text-center">Fotos Antes</span>
                  </button>
                  <button 
                    onClick={(e) => handleDownloadAfterPhotos(e, r)}
                    disabled={zippingId === r.id}
                    className="flex flex-col items-center justify-center gap-2 py-4 bg-teal-600 text-white rounded-[24px] text-[8px] font-black uppercase tracking-widest active:bg-teal-700 transition-all shadow-xl shadow-teal-100 disabled:opacity-50"
                  >
                    {zippingId === r.id && zippingType === 'Depois' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <ImageIcon size={16} />
                        <FileArchive size={12} className="opacity-50" />
                      </div>
                    )}
                    <span className="text-center">Fotos Depois</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {ruas.length === 0 && (
        <div className="text-center py-24 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
             <div className="bg-slate-100 p-8 rounded-full text-slate-300">
                <MapPin size={48} />
             </div>
             <div>
                <p className="text-slate-800 font-black text-xl uppercase">Nenhuma rua cadastrada</p>
                <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-tighter">Comece adicionando as ruas desta medição.</p>
             </div>
        </div>
      )}
    </div>
  );
};

export default RuasList;
