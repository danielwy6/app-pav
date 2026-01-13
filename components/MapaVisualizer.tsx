
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
  Navigation
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

  // Inicializa o Mapa (Leaflet)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    // Coordenadas padrão
    mapInstance.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([-5.79448, -35.211], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    
    markersLayer.current = L.layerGroup().addTo(mapInstance.current);

    // Adiciona o Tile Layer inicial
    updateTileLayer();
  }, []);

  const updateTileLayer = () => {
    if (!mapInstance.current) return;

    // Limpa tiles existentes
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current?.removeLayer(layer);
      }
    });

    if (mapType === 'street') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapInstance.current);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }
  };

  useEffect(() => {
    updateTileLayer();
  }, [mapType]);

  // Lógica de Filtragem
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

  // Atualização dos Marcadores no Mapa
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    if (filteredTrechos.length > 0) {
      const bounds: L.LatLngTuple[] = [];

      filteredTrechos.forEach(t => {
        const pos: L.LatLngTuple = [t.latitude, t.longitude];
        
        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker(pos, { icon: customIcon })
          .on('click', () => setSelectedTrecho(t));
        
        markersLayer.current?.addLayer(marker);
        bounds.push(pos);
      });

      if (bounds.length > 0) {
        mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
      }
    }
  }, [filteredTrechos]);

  const goToMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      mapInstance.current?.setView([pos.coords.latitude, pos.coords.longitude], 18);
    });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col -m-4 relative overflow-hidden bg-slate-100 print:hidden">
      
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-slate-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando PavInspect...</p>
        </div>
      )}

      {!isOnline && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1002] bg-amber-600 text-white px-4 py-1.5 rounded-full shadow-lg text-[10px] font-black uppercase flex items-center gap-2">
            <WifiOff size={14} /> Modo Offline
        </div>
      )}

      {/* Filtros Superiores */}
      <div className="absolute top-4 left-4 right-4 z-[1001] space-y-2">
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-xl"><Filter size={16} /></div>
            <select 
              className="flex-1 bg-transparent text-xs font-bold outline-none border-none text-slate-700" 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="Tudo">Todos os Pontos</option>
              <option value="Contrato">Por Contrato</option>
              <option value="Rua">Por Rua</option>
            </select>
            <ChevronDown size={14} className="text-slate-400" />
        </div>

        {filterType === 'Contrato' && (
          <select 
            className="w-full bg-white p-3 rounded-xl shadow-md text-xs font-bold border border-slate-100"
            value={selectedContratoId}
            onChange={(e) => setSelectedContratoId(e.target.value)}
          >
            <option value="">Selecione o Contrato...</option>
            {contratos.map(c => <option key={c.id} value={c.id}>Contrato {c.numero}</option>)}
          </select>
        )}

        {filterType === 'Rua' && (
          <select 
            className="w-full bg-white p-3 rounded-xl shadow-md text-xs font-bold border border-slate-100"
            value={selectedRuaId}
            onChange={(e) => setSelectedRuaId(e.target.value)}
          >
            <option value="">Selecione a Rua...</option>
            {ruas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        )}
      </div>

      {/* Botões de Ação Lateral */}
      <div className="absolute bottom-20 right-4 z-[1001] flex flex-col gap-2">
        <button 
          onClick={goToMyLocation}
          className="bg-white p-4 rounded-full shadow-xl text-blue-600 active:scale-90 transition-transform"
        >
          <Navigation size={24} />
        </button>
        <button 
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          className="bg-white p-4 rounded-full shadow-xl text-slate-600 active:scale-90 transition-transform"
        >
          {mapType === 'street' ? <Satellite size={24} /> : <MapIcon size={24} />}
        </button>
      </div>

      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="flex-1 z-0 map-container w-full h-full"></div>

      {/* Modal de Detalhes do Trecho */}
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
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Área Medida</p>
                  <p className="font-black text-slate-800 text-lg">{selectedTrecho.area.toFixed(2)} m²</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Data/Hora</p>
                  <p className="font-black text-slate-800 text-xs">{selectedTrecho.data} - {selectedTrecho.hora}</p>
                </div>
                <div className="col-span-2 border-t border-slate-200 pt-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Profissional Responsável</p>
                  <p className="font-black text-slate-800 truncate">{profissionais[selectedTrecho.profissionalId] || 'Não identificado'}</p>
                </div>
              </div>
              
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedTrecho.latitude},${selectedTrecho.longitude}`, '_blank')}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <ExternalLink size={18} /> ABRIR NO GOOGLE MAPS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaVisualizer;
