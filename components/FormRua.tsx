
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Rua, FotoEvidencia, TipoIntervencao } from '../types';
import L from 'leaflet';
import { 
  Save, 
  Loader2, 
  Map as MapIcon, 
  Satellite, 
  Navigation, 
  Search, 
  Camera, 
  X, 
  PlusCircle, 
  RotateCcw,
  MapPin
} from 'lucide-react';

interface FormRuaProps {
  medicaoId: string;
  id?: string;
  onSave: () => void;
  onCancel: () => void;
}

const FormRua: React.FC<FormRuaProps> = ({ medicaoId, id, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [fotosAntesRua, setFotosAntesRua] = useState<FotoEvidencia[]>([]);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Rua>>({
    nome: '', 
    bairro: '', 
    municipio: 'HORIZONTE', 
    medicaoId, 
    latitude: -4.1017, 
    longitude: -38.4897,
    tipoIntervencao: 'RECUPERACAO'
  });

  // Função para obter localização e endereço via Geocoding Reverso
  const fetchCurrentLocation = () => {
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        
        if (mapInstance.current) {
          mapInstance.current.setView([lat, lng], 18);
          markerInstance.current?.setLatLng([lat, lng]);
        } else {
          initMap(lat, lng);
        }
        
        reverseGeocode(lat, lng);
      },
      (err) => {
        console.error("Erro GPS:", err);
        setGeocoding(false);
        if (!mapInstance.current) initMap(-4.1017, -38.4897);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    const loadInitial = async () => {
      if (id) {
        const r = await db.getById<Rua>('ruas', id);
        if (r) {
          setFormData(r);
          setFotosAntesRua(r.fotos || []);
          initMap(r.latitude || -4.1017, r.longitude || -38.4897);
        }
      } else {
        // Se for uma nova rua, busca localização automaticamente ao montar
        fetchCurrentLocation();
      }
    };

    loadInitial();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [id]);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!navigator.onLine) {
        setGeocoding(false);
        return;
    }
    
    setGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'pt-BR' }
      });
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        const streetName = addr.road || addr.pedestrian || addr.suburb || addr.path || '';
        const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || '';

        setFormData(prev => ({
          ...prev,
          // Preenche automaticamente, mas o usuário pode apagar/alterar
          nome: prev.nome ? prev.nome : streetName.toUpperCase(),
          bairro: prev.bairro ? prev.bairro : neighborhood.toUpperCase(),
          latitude: lat,
          longitude: lng
        }));
      }
    } catch (err) {
      console.warn("Erro no Geocoding:", err);
    } finally {
      setGeocoding(false);
    }
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const novaFoto: FotoEvidencia = {
          id: crypto.randomUUID(), 
          base64: reader.result as string, 
          tipo: 'Antes', 
          data: new Date().toLocaleDateString('pt-BR'), 
          hora: new Date().toLocaleTimeString('pt-BR')
        };
        setFotosAntesRua(prev => [...prev, novaFoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const initMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 18);

    updateTileLayer();

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    markerInstance.current = L.marker([lat, lng], { 
      icon: customIcon,
      draggable: true 
    }).addTo(mapInstance.current);

    markerInstance.current.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      reverseGeocode(lat, lng);
    });
  };

  const updateTileLayer = () => {
    if (!mapInstance.current) return;
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) mapInstance.current?.removeLayer(layer);
    });

    if (mapType === 'street') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance.current);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapInstance.current);
    }
  };

  useEffect(() => { updateTileLayer(); }, [mapType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) return alert("O nome da rua é obrigatório.");
    setLoading(true);
    try {
      const data: Rua = {
        id: id || crypto.randomUUID(),
        nome: formData.nome!.toUpperCase(),
        bairro: (formData.bairro || '').toUpperCase(),
        municipio: (formData.municipio || 'HORIZONTE').toUpperCase(),
        medicaoId: formData.medicaoId!,
        latitude: formData.latitude,
        longitude: formData.longitude,
        fotos: fotosAntesRua,
        tipoIntervencao: formData.tipoIntervencao as TipoIntervencao
      };
      await db.save('ruas', data);
      onSave();
    } catch (err) {
      alert("Erro ao salvar rua.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden relative">
        <div ref={mapContainerRef} className="h-64 w-full bg-slate-100 z-0"></div>
        
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <button 
                type="button"
                onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
                className="bg-white/90 p-3 rounded-2xl shadow-lg border border-slate-200 text-slate-600 active:scale-90 transition-transform"
            >
                {mapType === 'street' ? <Satellite size={20} /> : <MapIcon size={20} />}
            </button>
            <button 
                type="button"
                onClick={fetchCurrentLocation}
                className="bg-blue-600 p-3 rounded-2xl shadow-lg text-white active:scale-90 transition-transform"
            >
                {geocoding ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          <div className="space-y-3">
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Tipo de Intervenção</label>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, tipoIntervencao: 'NOVA'}))}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[24px] border-2 transition-all ${formData.tipoIntervencao === 'NOVA' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <PlusCircle size={32} className={formData.tipoIntervencao === 'NOVA' ? 'text-white' : 'text-slate-300'} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Pavimentação Nova</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, tipoIntervencao: 'RECUPERACAO'}))}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[24px] border-2 transition-all ${formData.tipoIntervencao === 'RECUPERACAO' ? 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <RotateCcw size={32} className={formData.tipoIntervencao === 'RECUPERACAO' ? 'text-white' : 'text-slate-300'} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center">Recuperação de Pavimento</span>
                </button>
             </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between tracking-widest">
              Nome do Logradouro
              {geocoding && <span className="text-blue-500 animate-pulse lowercase font-normal italic">buscando localização...</span>}
            </label>
            <div className="relative">
              <input 
                required 
                className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black uppercase text-lg transition-colors ${geocoding && !formData.nome ? 'text-slate-300' : 'text-slate-800'}`} 
                value={formData.nome} 
                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))} 
                placeholder={geocoding ? "OBTENDO NOME..." : "EX: RUA SÃO JOÃO"} 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Search size={22} />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Bairro</label>
              <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold uppercase" value={formData.bairro} onChange={e => setFormData(prev => ({ ...prev, bairro: e.target.value }))} placeholder="Bairro" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Município</label>
              <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold uppercase" value={formData.municipio} onChange={e => setFormData(prev => ({ ...prev, municipio: e.target.value }))} placeholder="Município" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
             <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos 'ANTES' do Logradouro</label>
                <span className="text-blue-600 font-black text-xs">{fotosAntesRua.length} Anexadas</span>
             </div>
             
             <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full py-5 bg-blue-50 text-blue-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-dashed border-blue-200 active:scale-95 transition-all"
             >
                <Camera size={20} /> Capturar estado inicial
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" multiple onChange={handleAddPhoto} />

             {fotosAntesRua.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                   {fotosAntesRua.map(f => (
                      <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                         <img src={f.base64} className="w-full h-full object-cover" alt="Antes" />
                         <button 
                            type="button" 
                            onClick={() => setFotosAntesRua(prev => prev.filter(x => x.id !== f.id))}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg"
                         >
                            <X size={12} />
                         </button>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </form>
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={onCancel} className="flex-1 py-5 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 active:bg-slate-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || geocoding} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SALVAR RUA
        </button>
      </div>
    </div>
  );
};

export default FormRua;
