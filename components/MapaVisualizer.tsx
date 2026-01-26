
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Trecho, Rua, AppView, AppState, Profissional, Contrato, Medicao } from '../types';
import L from 'leaflet';
import { 
  X, 
  ExternalLink, 
  Filter, 
  ChevronDown, 
  Map as MapIcon, 
  Satellite, 
  Loader2, 
  WifiOff,
  Navigation,
  Clock,
  Info
} from 'lucide-react';

interface MapaVisualizerProps {
  ruaId?: string;
  onNavigate: (view: AppView, params?: Partial<AppState>) => void;
}

const MapaVisualizer: React.FC<MapaVisualizerProps> = ({ ruaId: initialRuaId, onNavigate }) => {
  const [allTrechos, setAllTrechos] = useState<Trecho[]>([]);
  const [filteredTrechos, setFilteredTrechos] = useState<Trecho[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [ruas, setRuas] = useState<Rua[]>([]);
  const [profissionais, setProfissionais] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<'Tudo' | 'Contrato' | 'Rua'>(initialRuaId ? 'Rua' : 'Tudo');
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [selectedRuaId, setSelectedRuaId] = useState(initialRuaId || '');
  const [selectedTrecho, setSelectedTrecho] = useState<Trecho | null>(null);
  const [selectedRuaExec, setSelectedRuaExec] = useState<Rua | null>(null);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    loadData();
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const [t, c, r, p] = await Promise.all([
        db.getAll<Trecho>('trechos'),
        db.getAll<Contrato>('contratos'),
        db.getAll<Rua>('ruas'),
        db.getAll<Profissional>('profissionais')
      ]);
      setAllTrechos(t);
      setContratos(c);
      setRuas(r);
      
      const proMap = p.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.nome }), {});
      setProfissionais(proMap);
    } catch (e) {
      console.error("Erro ao carregar dados do banco", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([-4.1017, -38.4897], 14);
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    updateTileLayer();
  }, []);

  const updateTileLayer = () => {
    if (!mapInstance.current) return;
    mapInstance.current.eachLayer((layer) => { if (layer instanceof L.TileLayer) mapInstance.current?.removeLayer(layer); });
    if (mapType === 'street') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance.current);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapInstance.current);
    }
  };

  useEffect(() => { updateTileLayer(); }, [mapType]);

  useEffect(() => {
    const applyFilter = async () => {
      let result = [...allTrechos];
      if (filterType === 'Contrato' && selectedContratoId) {
        const meds = await db.getAll<Medicao>('medicoes');
        const contratoMeds = meds.filter(m => m.contratoId === selectedContratoId).map(m => m.id);
        const contratoRuas = ruas.filter(r => contratoMeds.includes(r.medicaoId)).map(r => r.id);
        result = allTrechos.filter(t => contratoRuas.includes(t.ruaId));
      } else if (filterType === 'Rua' && selectedRuaId) {
        result = allTrechos.filter(t => t.ruaId === selectedRuaId);
      }
      setFilteredTrechos(result);
    };
    applyFilter();
  }, [allTrechos, filterType, selectedContratoId, selectedRuaId, ruas]);

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    // 1. Renderizar Trechos Medidos (AZUL)
    filteredTrechos.forEach(t => {
      const pos: L.LatLngTuple = [t.latitude, t.longitude];
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8]
      });
      const marker = L.marker(pos, { icon }).on('click', () => { setSelectedRuaExec(null); setSelectedTrecho(t); });
      markersLayer.current?.addLayer(marker);
      bounds.push(pos);
    });

    // 2. Renderizar Ruas em Execução (AMARELO)
    // Apenas se o filtro permitir ou for 'Tudo'
    const ruasEmExecucao = ruas.filter(r => {
      const temTrechos = allTrechos.some(t => t.ruaId === r.id);
      if (temTrechos) return false;
      if (filterType === 'Rua' && r.id !== selectedRuaId) return false;
      return true;
    });

    ruasEmExecucao.forEach(r => {
      if (r.latitude && r.longitude) {
        const pos: L.LatLngTuple = [r.latitude, r.longitude];
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="exec-marker" style="background-color: #f59e0b; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><div style="width: 4px; height: 4px; background-color: white; border-radius: 50%;"></div></div>`,
          iconSize: [22, 22], iconAnchor: [11, 11]
        });
        const marker = L.marker(pos, { icon }).on('click', () => { setSelectedTrecho(null); setSelectedRuaExec(r); });
        markersLayer.current?.addLayer(marker);
        bounds.push(pos);
      }
    });

    if (bounds.length > 0) {
      mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [filteredTrechos, ruas, allTrechos]);

  const goToMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      mapInstance.current?.setView([pos.coords.latitude, pos.coords.longitude], 18);
    });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col -m-4 relative overflow-hidden bg-slate-100 print:hidden">
      
      <style>{`
        @keyframes pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
        .exec-marker { animation: pulse-yellow 2s infinite; }
      `}</style>

      {loading && (
        <div className="absolute inset-0 z-[2000] bg-slate-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando Mapa Técnico...</p>
        </div>
      )}

      {/* Legenda Flutuante */}
      <div className="absolute bottom-24 left-4 z-[1001] bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span className="text-[9px] font-black text-slate-600 uppercase">Trechos Medidos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-600 uppercase">Em Execução (Pendente)</span>
        </div>
      </div>

      <div className="absolute top-4 left-4 right-4 z-[1001] space-y-2">
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-xl"><Filter size={16} /></div>
            <select className="flex-1 bg-transparent text-xs font-bold outline-none border-none text-slate-700" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="Tudo">Vista Geral</option>
              <option value="Contrato">Por Contrato</option>
              <option value="Rua">Por Rua</option>
            </select>
        </div>
        {filterType === 'Contrato' && (
          <select className="w-full bg-white p-3 rounded-xl shadow-md text-xs font-bold border border-slate-100" value={selectedContratoId} onChange={(e) => setSelectedContratoId(e.target.value)}>
            <option value="">Selecione o Contrato...</option>
            {contratos.map(c => <option key={c.id} value={c.id}>Contrato {c.numero}</option>)}
          </select>
        )}
        {filterType === 'Rua' && (
          <select className="w-full bg-white p-3 rounded-xl shadow-md text-xs font-bold border border-slate-100" value={selectedRuaId} onChange={(e) => setSelectedRuaId(e.target.value)}>
            <option value="">Selecione a Rua...</option>
            {ruas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        )}
      </div>

      <div className="absolute bottom-20 right-4 z-[1001] flex flex-col gap-2">
        <button onClick={goToMyLocation} className="bg-white p-4 rounded-full shadow-xl text-blue-600 active:scale-90"><Navigation size={24} /></button>
        <button onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')} className="bg-white p-4 rounded-full shadow-xl text-slate-600 active:scale-90">{mapType === 'street' ? <Satellite size={24} /> : <MapIcon size={24} />}</button>
      </div>

      <div ref={mapContainerRef} className="flex-1 z-0 map-container w-full h-full"></div>

      {/* Modal Rua em Execução */}
      {selectedRuaExec && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl animate-in slide-in-from-bottom flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50">
               <div className="flex items-center gap-3">
                  <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg animate-pulse"><Clock size={24} /></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase leading-none">Em Execução</h3>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Logradouro Aberto</p>
                  </div>
               </div>
               <button onClick={() => setSelectedRuaExec(null)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="text-center">
                  <h4 className="text-2xl font-black text-slate-800 uppercase mb-1">{selectedRuaExec.nome}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{selectedRuaExec.bairro}</p>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                  <Info className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">Este logradouro foi cadastrado no sistema, mas ainda não possui nenhum trecho medido oficialmente.</p>
               </div>
               <button onClick={() => onNavigate('TRECHOS', { selectedRuaId: selectedRuaExec.id })} className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all uppercase text-xs tracking-widest">
                  <MapIcon size={20} /> Iniciar Medição Agora
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Trecho Medido (Azul) */}
      {selectedTrecho && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl animate-in slide-in-from-bottom flex flex-col overflow-hidden max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Ponto Medido</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Detalhes Técnicos</p>
              </div>
              <button onClick={() => setSelectedTrecho(null)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                {selectedTrecho.fotos.map(f => (
                  <img key={f.id} src={f.base64} className="h-40 rounded-2xl object-cover shadow-sm snap-center" />
                ))}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl grid grid-cols-2 gap-4">
                <div><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Área Medida</p><p className="font-black text-slate-800 text-lg">{selectedTrecho.area.toFixed(2)} m²</p></div>
                <div><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Data/Hora</p><p className="font-black text-slate-800 text-xs">{selectedTrecho.data}</p></div>
                <div className="col-span-2 border-t border-slate-200 pt-3"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Responsável Técnico</p><p className="font-black text-slate-800 truncate">{profissionais[selectedTrecho.profissionalId] || 'Não identificado'}</p></div>
              </div>
              <button onClick={() => onNavigate('TRECHOS', { selectedRuaId: selectedTrecho.ruaId })} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-95 transition-all">Ver todos os trechos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaVisualizer;
